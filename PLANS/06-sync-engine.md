# Feature Plan: Sync Engine

**Priority**: 6 (Hardest)  
**Difficulty**: Hard  
**Dependencies**: Requires Anonymous User System (05-anonymous-users.md)  
**Estimated Effort**: 16-24 hours

## Overview

Securely synchronize workspaces and links between devices using Convex as the sync layer with end-to-end encryption. Users can selectively choose which resources to sync.

## Current State

- Resources stored in localStorage per device
- No cross-device synchronization
- User must manually copy secrets between devices
- No way to recover if localStorage is cleared on all devices

## Requirements

### Functional Requirements

1. User can enable/disable sync per device
2. User can selectively sync workspaces and links
3. Secrets are encrypted during sync
4. Conflict resolution with clear user feedback
5. Real-time sync when devices are online
6. Offline changes sync when back online
7. Device management (view connected devices, remove devices)

### Non-Functional Requirements

1. End-to-end encryption (server cannot read secrets)
2. Sync latency < 2 seconds for real-time updates
3. Graceful handling of network issues
4. Clear sync status indicator
5. Battery/bandwidth efficient

## Technical Implementation

### Schema Changes (`src/convex/schema.ts`)

```typescript
// Update deviceSessions from plan 05
export const deviceSessionsSchema = {
  userId: v.id('users'),
  deviceId: v.string(),
  deviceName: v.optional(v.string()),
  publicKey: v.optional(v.string()),      // NEW: ECDH public key (base64)
  createdAt: v.number(),
  lastActiveAt: v.number(),
  syncEnabled: v.optional(v.boolean()),   // NEW: Sync toggle per device
};

// NEW: Sync metadata for each resource
export const syncMetadataSchema = {
  resourceId: v.string(),                 // workspace name or link shortId
  resourceType: v.union(
    v.literal('workspace'),
    v.literal('link')
  ),
  ownerId: v.id('users'),
  syncVersion: v.number(),                // For conflict resolution
  updatedAt: v.number(),
  updatedByDeviceId: v.string(),
  deletedAt: v.optional(v.number()),      // Soft delete for sync
};

// NEW: Sync queue for pending operations
export const syncQueueSchema = {
  userId: v.id('users'),
  sourceDeviceId: v.string(),
  targetDeviceId: v.optional(v.string()), // null = broadcast to all
  operation: v.union(
    v.literal('create'),
    v.literal('update'),
    v.literal('delete')
  ),
  resourceType: v.string(),
  resourceId: v.string(),
  encryptedPayload: v.string(),           // Encrypted JSON
  timestamp: v.number(),
  processed: v.optional(v.boolean>()>,    // For target device tracking
};
```

### Index Updates

```typescript
syncMetadata: defineTable(syncMetadataSchema)
  .index('byOwnerResource', ['ownerId', 'resourceId'])
  .index('byOwnerType', ['ownerId', 'resourceType']),

syncQueue: defineTable(syncQueueSchema)
  .index('byUserId', ['userId'])
  .index('byTargetDevice', ['targetDeviceId', 'processed'])
```

### Cryptography

#### Key Generation and Exchange (ECDH + AES-256-GCM)

```typescript
// src/lib/crypto.ts

export async function generateKeyPair(): Promise<CryptoKeyPair> {
	return await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
		'deriveKey'
	]);
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
	const exported = await crypto.subtle.exportKey('spki', key);
	return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

export async function importPublicKey(base64: string): Promise<CryptoKey> {
	const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
	return await crypto.subtle.importKey(
		'spki',
		binary,
		{ name: 'ECDH', namedCurve: 'P-256' },
		false,
		[]
	);
}

export async function deriveSharedKey(
	privateKey: CryptoKey,
	publicKey: CryptoKey
): Promise<CryptoKey> {
	return await crypto.subtle.deriveKey(
		{ name: 'ECDH', public: publicKey },
		privateKey,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt']
	);
}

export async function encrypt(key: CryptoKey, data: string): Promise<string> {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const encoded = new TextEncoder().encode(data);

	const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

	// Combine IV + ciphertext
	const combined = new Uint8Array(iv.length + ciphertext.byteLength);
	combined.set(iv);
	combined.set(new Uint8Array(ciphertext), iv.length);

	return btoa(String.fromCharCode(...combined));
}

export async function decrypt(key: CryptoKey, encryptedData: string): Promise<string> {
	const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
	const iv = combined.slice(0, 12);
	const ciphertext = combined.slice(12);

	const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);

	return new TextDecoder().decode(decrypted);
}
```

### Backend Changes

#### New File: `src/convex/sync.ts`

```typescript
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { authenticatedUserMutation, authenticatedUserQuery } from './users';

// Register device for sync with public key
export const registerDeviceForSync = authenticatedUserMutation({
	args: {
		deviceId: v.string(),
		publicKey: v.string(),
		deviceName: v.optional(v.string())
	},
	async handler(ctx, args) {
		const session = await ctx.db
			.query('deviceSessions')
			.withIndex('byDeviceId', (q) => q.eq('deviceId', args.deviceId))
			.first();

		if (!session || session.userId !== ctx.user._id) {
			throw new Error('Device not found or not owned by user');
		}

		await ctx.db.patch(session._id, {
			publicKey: args.publicKey,
			deviceName: args.deviceName,
			syncEnabled: true
		});

		return { success: true };
	}
});

// Get all devices for sync
export const getSyncDevices = authenticatedUserQuery({
	args: {},
	async handler(ctx) {
		return await ctx.db
			.query('deviceSessions')
			.withIndex('byUserId', (q) => q.eq('userId', ctx.user._id))
			.filter((q) => q.eq(q.field('syncEnabled'), true))
			.collect();
	}
});

// Push changes to sync queue
export const pushChanges = authenticatedUserMutation({
	args: {
		operations: v.array(
			v.object({
				operation: v.string(),
				resourceType: v.string(),
				resourceId: v.string(),
				encryptedPayload: v.string(),
				targetDeviceId: v.optional(v.string())
			})
		)
	},
	async handler(ctx, args) {
		const now = Date.now();

		for (const op of args.operations) {
			// Update sync metadata
			const existing = await ctx.db
				.query('syncMetadata')
				.withIndex('byOwnerResource', (q) =>
					q.eq('ownerId', ctx.user._id).eq('resourceId', op.resourceId)
				)
				.first();

			if (existing) {
				await ctx.db.patch(existing._id, {
					syncVersion: existing.syncVersion + 1,
					updatedAt: now,
					updatedByDeviceId: ctx.deviceId
				});
			} else {
				await ctx.db.insert('syncMetadata', {
					resourceId: op.resourceId,
					resourceType: op.resourceType as 'workspace' | 'link',
					ownerId: ctx.user._id,
					syncVersion: 1,
					updatedAt: now,
					updatedByDeviceId: ctx.deviceId
				});
			}

			// Add to sync queue
			await ctx.db.insert('syncQueue', {
				userId: ctx.user._id,
				sourceDeviceId: ctx.deviceId,
				targetDeviceId: op.targetDeviceId,
				operation: op.operation as 'create' | 'update' | 'delete',
				resourceType: op.resourceType,
				resourceId: op.resourceId,
				encryptedPayload: op.encryptedPayload,
				timestamp: now
			});
		}

		return { success: true };
	}
});

// Pull changes for this device
export const pullChanges = authenticatedUserQuery({
	args: {
		since: v.number()
	},
	async handler(ctx, args) {
		const changes = await ctx.db
			.query('syncQueue')
			.withIndex('byUserId', (q) => q.eq('userId', ctx.user._id))
			.filter((q) =>
				q.gt(q.field('timestamp'), args.since).and(q.neq(q.field('sourceDeviceId'), ctx.deviceId))
			)
			.collect();

		// Filter to only changes for this device or broadcast
		return changes.filter((c) => !c.targetDeviceId || c.targetDeviceId === ctx.deviceId);
	}
});

// Mark changes as processed
export const markProcessed = authenticatedUserMutation({
	args: {
		changeIds: v.array(v.id('syncQueue'))
	},
	async handler(ctx, args) {
		for (const id of args.changeIds) {
			await ctx.db.delete(id);
		}
		return { success: true };
	}
});

// Remove device from sync
export const removeSyncDevice = authenticatedUserMutation({
	args: {
		deviceId: v.string()
	},
	async handler(ctx, args) {
		const session = await ctx.db
			.query('deviceSessions')
			.withIndex('byDeviceId', (q) => q.eq('deviceId', args.deviceId))
			.first();

		if (!session || session.userId !== ctx.user._id) {
			throw new Error('Device not found or not owned by user');
		}

		await ctx.db.patch(session._id, {
			syncEnabled: false,
			publicKey: undefined
		});

		return { success: true };
	}
});
```

### Frontend Changes

#### New File: `src/lib/stores/sync.svelte.ts`

```typescript
import { PersistedState } from 'runed';
import { browser } from '$app/environment';
import {
	generateKeyPair,
	exportPublicKey,
	importPublicKey,
	deriveSharedKey,
	encrypt,
	decrypt
} from '$lib/crypto';

interface SyncDevice {
	deviceId: string;
	deviceName?: string;
	publicKey?: string;
	lastActiveAt: number;
}

class SyncEngine {
	enabled = new PersistedState<boolean>('syncEnabled', false);
	status = $state<'idle' | 'syncing' | 'error' | 'offline'>('idle');
	lastSync = new PersistedState<Date | null>('lastSync', null);

	// Selective sync
	selectedWorkspaces = new PersistedState<Set<string>>('syncWorkspaces', new Set());
	selectedLinks = new PersistedState<Set<string>>('syncLinks', new Set());

	// Crypto state
	privateKey: CryptoKey | null = null;
	publicKey: CryptoKey | null = null;
	sharedKeys = new Map<string, CryptoKey>();

	// Devices
	devices = $state<SyncDevice[]>([]);

	private convex: ConvexClient | null = null;
	private syncInterval: number | null = null;

	async enable(convex: ConvexClient) {
		this.convex = convex;

		// Generate key pair
		const keyPair = await generateKeyPair();
		this.privateKey = keyPair.privateKey;
		this.publicKey = keyPair.publicKey;

		// Store private key in IndexedDB (not localStorage for security)
		await this.storePrivateKey(keyPair.privateKey);

		// Register device
		const publicKeyBase64 = await exportPublicKey(keyPair.publicKey);
		await convex.mutation(api.sync.registerDeviceForSync, {
			deviceId: user.deviceId.current!,
			publicKey: publicKeyBase64,
			deviceName: this.getDeviceName()
		});

		this.enabled.current = true;
		this.status = 'idle';

		// Start sync loop
		this.startSyncLoop();
	}

	async disable(convex: ConvexClient) {
		this.stopSyncLoop();

		await convex.mutation(api.sync.removeSyncDevice, {
			deviceId: user.deviceId.current!
		});

		this.enabled.current = false;
		this.clearPrivateKey();
	}

	private async storePrivateKey(key: CryptoKey) {
		// Use IndexedDB for secure storage
		const exported = await crypto.subtle.exportKey('pkcs8', key);
		const db = await this.openDB();
		await db.put('keys', { id: 'private', key: exported });
	}

	private async loadPrivateKey(): Promise<CryptoKey | null> {
		const db = await this.openDB();
		const record = await db.get('keys', 'private');
		if (!record) return null;

		return await crypto.subtle.importKey(
			'pkcs8',
			record.key,
			{ name: 'ECDH', namedCurve: 'P-256' },
			false,
			['deriveKey']
		);
	}

	private openDB(): Promise<IDBDatabase> {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open('LinkSync', 1);
			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result);
			request.onupgradeneeded = () => {
				request.result.createObjectStore('keys', { keyPath: 'id' });
			};
		});
	}

	async syncNow() {
		if (!this.convex || !this.privateKey) return;

		this.status = 'syncing';

		try {
			// 1. Pull changes
			const lastSyncTime = this.lastSync.current?.getTime() || 0;
			const changes = await this.convex.query(api.sync.pullChanges, {
				since: lastSyncTime
			});

			// 2. Decrypt and apply changes
			for (const change of changes) {
				await this.applyChange(change);
			}

			// 3. Push local changes
			await this.pushLocalChanges();

			// 4. Mark as processed
			await this.convex.mutation(api.sync.markProcessed, {
				changeIds: changes.map((c) => c._id)
			});

			this.lastSync.current = new Date();
			this.status = 'idle';
		} catch (error) {
			console.error('Sync failed:', error);
			this.status = 'error';
		}
	}

	private async applyChange(change: any) {
		// Get source device's public key
		const sourceDevice = this.devices.find((d) => d.deviceId === change.sourceDeviceId);
		if (!sourceDevice?.publicKey) return;

		// Derive shared key
		let sharedKey = this.sharedKeys.get(change.sourceDeviceId);
		if (!sharedKey) {
			const publicKey = await importPublicKey(sourceDevice.publicKey);
			sharedKey = await deriveSharedKey(this.privateKey!, publicKey);
			this.sharedKeys.set(change.sourceDeviceId, sharedKey);
		}

		// Decrypt payload
		const payload = JSON.parse(await decrypt(sharedKey, change.encryptedPayload));

		// Apply to local state
		switch (change.operation) {
			case 'create':
			case 'update':
				if (change.resourceType === 'workspace') {
					user.addWorkspace(payload.name, payload.secret);
				} else if (change.resourceType === 'link') {
					user.addLink(payload.shortId, payload.secret, payload.workspaceName);
				}
				break;
			case 'delete':
				if (change.resourceType === 'workspace') {
					user.removeWorkspace(change.resourceId);
				} else if (change.resourceType === 'link') {
					user.removeLink(change.resourceId);
				}
				break;
		}
	}

	private async pushLocalChanges() {
		// Get target devices
		const devices = await this.convex!.query(api.sync.getSyncDevices, {});
		this.devices = devices;

		// For each selected resource, encrypt and push
		const operations = [];

		for (const ws of user.workspaces.current) {
			if (this.selectedWorkspaces.current.has(ws.name)) {
				for (const device of devices) {
					if (device.deviceId === user.deviceId.current || !device.publicKey) continue;

					const sharedKey = await this.getSharedKey(device);
					const payload = await encrypt(
						sharedKey,
						JSON.stringify({
							name: ws.name,
							secret: ws.secret
						})
					);

					operations.push({
						operation: 'create',
						resourceType: 'workspace',
						resourceId: ws.name,
						encryptedPayload: payload,
						targetDeviceId: device.deviceId
					});
				}
			}
		}

		// Similar for links...

		if (operations.length > 0) {
			await this.convex!.mutation(api.sync.pushChanges, { operations });
		}
	}

	private async getSharedKey(device: SyncDevice): Promise<CryptoKey> {
		if (this.sharedKeys.has(device.deviceId)) {
			return this.sharedKeys.get(device.deviceId)!;
		}

		const publicKey = await importPublicKey(device.publicKey!);
		const sharedKey = await deriveSharedKey(this.privateKey!, publicKey);
		this.sharedKeys.set(device.deviceId, sharedKey);
		return sharedKey;
	}

	private startSyncLoop() {
		// Sync every 5 seconds
		this.syncInterval = window.setInterval(() => {
			this.syncNow();
		}, 5000);
	}

	private stopSyncLoop() {
		if (this.syncInterval) {
			clearInterval(this.syncInterval);
			this.syncInterval = null;
		}
	}
}

export const sync = new SyncEngine();
```

#### New Component: `src/lib/components/SyncSettings.svelte`

```svelte
<script lang="ts">
	import { sync } from '$lib/stores/sync.svelte';
	import { user } from '$lib/stores/global.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import Monitor from '@lucide/svelte/icons/monitor';
	import Trash from '@lucide/svelte/icons/trash';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';

	let { convex }: { convex: ConvexClient } = $props();

	async function toggleSync() {
		if (sync.enabled.current) {
			await sync.disable(convex);
		} else {
			await sync.enable(convex);
		}
	}
</script>

<div class="space-y-6">
	<!-- Sync Toggle -->
	<div class="flex items-center justify-between">
		<div>
			<Label>Enable Sync</Label>
			<p class="text-sm text-muted-foreground">Sync your links across devices securely</p>
		</div>
		<Switch checked={sync.enabled.current} onchange={toggleSync} />
	</div>

	{#if sync.enabled.current}
		<!-- Sync Status -->
		<div class="flex items-center gap-2 text-sm">
			<RefreshCw class="h-4 w-4 {sync.status === 'syncing' ? 'animate-spin' : ''}" />
			<span>
				{#if sync.status === 'syncing'}Syncing...
				{:else if sync.status === 'error'}Sync error
				{:else if sync.status === 'offline'}Offline
				{:else}Last sync: {sync.lastSync.current?.toLocaleTimeString() || 'Never'}
				{/if}
			</span>
		</div>

		<!-- Connected Devices -->
		<div class="space-y-2">
			<Label>Connected Devices</Label>
			{#each sync.devices as device}
				<div class="flex items-center justify-between rounded-lg border p-3">
					<div class="flex items-center gap-2">
						{#if device.deviceName?.includes('Mobile')}
							<Smartphone class="h-4 w-4" />
						{:else}
							<Monitor class="h-4 w-4" />
						{/if}
						<span>{device.deviceName || 'Unknown device'}</span>
					</div>
					{#if device.deviceId !== user.deviceId.current}
						<Button variant="ghost" size="icon">
							<Trash class="h-4 w-4" />
						</Button>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Selective Sync -->
		<div class="space-y-2">
			<Label>What to Sync</Label>
			<div class="space-y-2">
				{#each user.workspaces.current as ws}
					<label class="flex items-center gap-2">
						<input
							type="checkbox"
							checked={sync.selectedWorkspaces.current.has(ws.name)}
							onchange={() => {
								const set = new Set(sync.selectedWorkspaces.current);
								if (set.has(ws.name)) set.delete(ws.name);
								else set.add(ws.name);
								sync.selectedWorkspaces.current = set;
							}}
						/>
						<span>Workspace: {ws.name}</span>
					</label>
				{/each}
			</div>
		</div>
	{/if}
</div>
```

## Files to Create/Modify

| File                                      | Change                                                       |
| ----------------------------------------- | ------------------------------------------------------------ |
| `src/convex/schema.ts`                    | Add syncMetadata and syncQueue tables, update deviceSessions |
| `src/convex/sync.ts`                      | Create new file                                              |
| `src/lib/crypto.ts`                       | Create new file with encryption utilities                    |
| `src/lib/stores/sync.svelte.ts`           | Create new file                                              |
| `src/lib/components/SyncSettings.svelte`  | Create new component                                         |
| `src/lib/components/SyncIndicator.svelte` | Create status indicator                                      |
| `src/routes/+layout.svelte`               | Initialize sync engine                                       |

## Testing Checklist

- [ ] Key pair generation works
- [ ] Public key export/import works
- [ ] Shared key derivation works
- [ ] Encryption/decryption works
- [ ] Device registration works
- [ ] Changes pushed to queue
- [ ] Changes pulled and decrypted
- [ ] Local state updated from sync
- [ ] Conflict resolution works
- [ ] Selective sync filters correctly
- [ ] Device removal works
- [ ] Offline handling works
- [ ] Private key persists in IndexedDB

## Questions & Considerations

### Open Questions

1. **Sync timing**: Real-time vs polling?
   - Current plan: Polling every 5 seconds
   - Could use Convex subscriptions for true real-time

2. **Conflict resolution**: Last-write-wins or manual?
   - Current plan: Last-write-wins based on syncVersion
   - Could add manual resolution UI for conflicts

3. **Large data sets**: What if user has 1000+ links?
   - Consider pagination
   - Batch processing
   - Delta sync instead of full sync

4. **Secrets in sync**: Should secrets be synced?
   - Yes, but encrypted
   - This is the main value prop for sync

5. **Bandwidth**: How to minimize data transfer?
   - Only sync changed resources
   - Compress payloads
   - Throttle sync frequency

### Security Considerations

1. **Private key storage**: IndexedDB is not fully secure
   - Consider WebAuthn for key storage in future
   - Keys are derived per-device, not shared

2. **Man-in-the-middle**: ECDH protects against this
   - Keys are exchanged through Convex
   - Convex can't decrypt (no private keys)

3. **Device compromise**: If device is compromised
   - User can remove devices from sync
   - New device registration requires key exchange

### Edge Cases

- Two devices offline, both make changes
- Device removed while offline
- Sync enabled mid-session
- Network interruption during sync
- Browser storage cleared mid-sync

### Future Enhancements

- QR code for device pairing
- Export/import encrypted backup
- Sync history/audit log
- Collaborative workspaces (multi-user sync)
- Conflict resolution UI
