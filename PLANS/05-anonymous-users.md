# Feature Plan: Anonymous User System

**Priority**: 5 (Medium-Hard)  
**Difficulty**: Medium-Hard  
**Dependencies**: None (but enables sync engine)  
**Estimated Effort**: 8-12 hours

## Overview

Generate anonymous users automatically on first visit to the website and associate all resources (workspaces, links) with that user. This provides:

- Foundation for cross-device sync
- Ability to recover resources if localStorage is cleared
- Future-proofing for potential collaboration features

## Current State

- No user concept exists
- "Ownership" is based on localStorage secrets
- If localStorage is cleared, access to all resources is lost
- No way to sync between devices
- No way to recover lost secrets

## Requirements

### Functional Requirements

1. Anonymous user created automatically on first visit
2. User ID is human-readable (e.g., "wild-flower-42")
3. User ID stored in localStorage and associated with device
4. All new workspaces/links associated with user
5. Existing resources can be claimed by user
6. User can view their profile (readable ID)

### Non-Functional Requirements

1. User creation should be instant (< 200ms)
2. No authentication friction for user
3. ID should be unique but not guessable
4. Privacy-focused: no email, no PII
5. Works entirely client-side with Convex backend

## Technical Implementation

### Schema Changes (`src/convex/schema.ts`)

```typescript
// NEW: Users table
export const usersSchema = {
	readableId: v.string(), // e.g., "wild-flower-42"
	createdAt: v.number(),
	lastActiveAt: v.number()
};

// NEW: Device sessions for multi-device support
export const deviceSessionsSchema = {
	userId: v.id('users'),
	deviceId: v.string(), // Stable device identifier
	deviceName: v.optional(v.string()),
	createdAt: v.number(),
	lastActiveAt: v.number()
};

// UPDATE: Workspaces table
export const workspacesSchema = {
	name: v.string(),
	secretHash: v.string(),
	ownerId: v.optional(v.id('users')) // NEW: Link to user
};

// UPDATE: Links table
export const linksSchema = {
	shortId: v.string(),
	shortName: v.optional(v.string()),
	secretHash: v.string(),
	url: v.string(),
	title: v.optional(v.string()),
	isEnabled: v.optional(v.boolean()),
	ownerId: v.optional(v.id('users')), // NEW: Link to user
	workspaceId: v.optional(v.id('workspaces'))
};
```

### Index Updates

```typescript
users: defineTable(usersSchema)
  .index('byReadableId', ['readableId']),

deviceSessions: defineTable(deviceSessionsSchema)
  .index('byUserId', ['userId'])
  .index('byDeviceId', ['deviceId']),

workspaces: defineTable(workspacesSchema)
  .index('byName', ['name'])
  .index('byOwnerId', ['ownerId']),  // NEW

links: defineTable(linksSchema)
  .index('byShortId', ['shortId'])
  .index('byWorkspaceShortName', ['workspaceId', 'shortName'])
  .index('byOwnerId', ['ownerId'])  // NEW
```

### Backend Changes

#### New File: `src/convex/users.ts`

```typescript
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { customQuery, customMutation } from 'convex-helpers/server/customFunctions';

// Word lists for readable IDs
const ADJECTIVES = [
	'wild',
	'calm',
	'brave',
	'swift',
	'gentle',
	'bright',
	'silent',
	'clever',
	'happy',
	'lucky',
	'noble',
	'peaceful',
	'proud',
	'quiet',
	'rapid',
	'sharp',
	'smooth',
	'steady',
	'strong',
	'warm'
];

const NOUNS = [
	'flower',
	'river',
	'mountain',
	'forest',
	'ocean',
	'meadow',
	'valley',
	'breeze',
	'cloud',
	'dawn',
	'dusk',
	'field',
	'garden',
	'hill',
	'lake',
	'moon',
	'peak',
	'pond',
	'rain',
	'star',
	'stone',
	'stream',
	'sun',
	'wave'
];

function generateReadableId(): string {
	const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
	const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
	const num = Math.floor(Math.random() * 100);
	return `${adj}-${noun}-${num}`;
}

// Get or create user by device ID
export const getOrCreate = mutation({
	args: {
		deviceId: v.string(),
		deviceName: v.optional(v.string())
	},
	async handler(ctx, args) {
		// Check if device already has a session
		const existingSession = await ctx.db
			.query('deviceSessions')
			.withIndex('byDeviceId', (q) => q.eq('deviceId', args.deviceId))
			.first();

		if (existingSession) {
			// Update last active
			await ctx.db.patch(existingSession._id, {
				lastActiveAt: Date.now()
			});
			const user = await ctx.db.get(existingSession.userId);
			return user;
		}

		// Generate unique readable ID
		let readableId: string;
		let attempts = 0;
		do {
			readableId = generateReadableId();
			const existing = await ctx.db
				.query('users')
				.withIndex('byReadableId', (q) => q.eq('readableId', readableId))
				.first();
			if (!existing) break;
			attempts++;
		} while (attempts < 10);

		if (attempts >= 10) {
			throw new Error('Failed to generate unique readable ID');
		}

		// Create new user
		const now = Date.now();
		const userId = await ctx.db.insert('users', {
			readableId,
			createdAt: now,
			lastActiveAt: now
		});

		// Create device session
		await ctx.db.insert('deviceSessions', {
			userId,
			deviceId: args.deviceId,
			deviceName: args.deviceName,
			createdAt: now,
			lastActiveAt: now
		});

		return await ctx.db.get(userId);
	}
});

// Get user by ID (for internal use)
export const getById = query({
	args: { userId: v.id('users') },
	async handler(ctx, args) {
		return ctx.db.get(args.userId);
	}
});

// Claim existing resources for a user
export const claimResources = mutation({
	args: {
		userId: v.id('users'),
		workspaceNames: v.optional(v.array(v.string())),
		linkShortIds: v.optional(v.array(v.string()))
	},
	async handler(ctx, args) {
		// Claim workspaces
		if (args.workspaceNames) {
			for (const name of args.workspaceNames) {
				const workspace = await ctx.db
					.query('workspaces')
					.withIndex('byName', (q) => q.eq('name', name))
					.first();
				if (workspace && !workspace.ownerId) {
					await ctx.db.patch(workspace._id, { ownerId: args.userId });
				}
			}
		}

		// Claim links
		if (args.linkShortIds) {
			for (const shortId of args.linkShortIds) {
				const link = await ctx.db
					.query('links')
					.withIndex('byShortId', (q) => q.eq('shortId', shortId))
					.first();
				if (link && !link.ownerId) {
					await ctx.db.patch(link._id, { ownerId: args.userId });
				}
			}
		}
	}
});
```

#### Update: `src/convex/workspaces.ts`

```typescript
// Update create mutation to accept ownerId
export const create = mutation({
	args: {
		name: workspacesSchema.name,
		ownerId: v.optional(v.id('users')) // NEW
	},
	async handler(ctx, args) {
		// ... existing validation ...

		const workspaceId = await ctx.db.insert('workspaces', {
			name,
			secretHash,
			ownerId: args.ownerId // NEW
		});

		return { id: workspaceId, secret };
	}
});
```

#### Update: `src/convex/links.ts`

```typescript
// Update create mutation
export const create = mutation({
	args: {
		url: linksSchema.url,
		shortName: linksSchema.shortName,
		workspaceName: v.optional(workspacesSchema.name),
		workspaceSecret: v.optional(v.string()),
		ownerId: v.optional(v.id('users')) // NEW
	},
	async handler(ctx, args) {
		// ... existing logic ...

		const linkId = await ctx.db.insert('links', {
			shortId,
			shortName: args.shortName,
			secretHash,
			url: args.url,
			workspaceId,
			ownerId: args.ownerId // NEW
		});

		return { id: linkId, shortId, shortName: args.shortName, secret };
	}
});
```

### Frontend Changes

#### Update: `src/lib/stores/global.svelte.ts`

```typescript
import { PersistedState } from 'runed';
import { browser } from '$app/environment';

class AnonymousUser {
	id = new PersistedState<string | null>('userId', null);
	readableId = new PersistedState<string | null>('userReadableId', null);
	deviceId = new PersistedState<string | null>('deviceId', null);

	// Existing stores
	workspaces = new PersistedState<Workspace[]>('workspaces', []);
	links = new PersistedState<Link[]>('links', []);
	// ... rest of existing code ...

	constructor() {
		// Generate device ID if not exists
		if (browser && !this.deviceId.current) {
			this.deviceId.current = this.generateDeviceId();
		}
	}

	private generateDeviceId(): string {
		// Generate a UUID v4
		return 'dev_' + crypto.randomUUID?.() || 'dev_' + Math.random().toString(36).substring(2, 15);
	}

	async initialize(convex: ConvexClient) {
		if (this.id.current) {
			// Already initialized
			return;
		}

		const deviceId = this.deviceId.current;
		if (!deviceId) return;

		try {
			const user = await convex.mutation(api.users.getOrCreate, {
				deviceId,
				deviceName: this.getDeviceName()
			});

			this.id.current = user!._id;
			this.readableId.current = user!.readableId;

			// Claim existing resources
			await this.claimExistingResources(convex);
		} catch (error) {
			console.error('Failed to initialize user:', error);
		}
	}

	private getDeviceName(): string {
		if (!browser) return 'Unknown';
		const ua = navigator.userAgent;
		if (ua.includes('Mobile')) return 'Mobile Device';
		if (ua.includes('Mac')) return 'Mac';
		if (ua.includes('Windows')) return 'Windows PC';
		if (ua.includes('Linux')) return 'Linux';
		return 'Desktop';
	}

	private async claimExistingResources(convex: ConvexClient) {
		const workspaceNames = this.workspaces.current.map((w) => w.name);
		const linkShortIds = this.links.current.map((l) => l.shortId);

		if (workspaceNames.length > 0 || linkShortIds.length > 0) {
			await convex.mutation(api.users.claimResources, {
				userId: this.id.current!,
				workspaceNames: workspaceNames.length > 0 ? workspaceNames : undefined,
				linkShortIds: linkShortIds.length > 0 ? linkShortIds : undefined
			});
		}
	}
}

export const user = new AnonymousUser();
```

#### New Component: `src/lib/components/UserProfile.svelte`

```svelte
<script lang="ts">
	import { user } from '$lib/stores/global.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import Copy from '@lucide/svelte/icons/copy';

	async function copyId() {
		await navigator.clipboard.writeText(user.readableId.current || '');
		// Show toast
	}
</script>

<div class="flex items-center gap-2">
	<span class="text-sm text-muted-foreground">Your ID:</span>
	<Badge variant="secondary" class="font-mono">
		{user.readableId.current}
	</Badge>
	<Button variant="ghost" size="icon" class="h-6 w-6" onclick={copyId}>
		<Copy class="h-3 w-3" />
	</Button>
</div>
```

#### Update: `src/routes/+layout.svelte`

```typescript
import { user } from '$lib/stores/global.svelte';
import { useConvexClient } from 'convex-svelte';

const convex = useConvexClient();

onMount(async () => {
	await user.initialize(convex);
});
```

## Files to Create/Modify

| File                                    | Change                                                           |
| --------------------------------------- | ---------------------------------------------------------------- |
| `src/convex/schema.ts`                  | Add users and deviceSessions tables, update workspaces and links |
| `src/convex/users.ts`                   | Create new file                                                  |
| `src/convex/workspaces.ts`              | Update create to accept ownerId                                  |
| `src/convex/links.ts`                   | Update create to accept ownerId                                  |
| `src/lib/stores/global.svelte.ts`       | Add AnonymousUser class with initialization                      |
| `src/lib/components/UserProfile.svelte` | Create new component                                             |
| `src/routes/+layout.svelte`             | Initialize user on mount                                         |

## Migration Strategy

1. Deploy schema changes (backward compatible - fields are optional)
2. Deploy backend functions
3. Deploy frontend changes
4. Existing users will get user IDs on next visit
5. Resources claimed on first initialization after update

## Testing Checklist

- [ ] New user created on first visit
- [ ] Readable ID is unique
- [ ] Device ID persists across sessions
- [ ] Existing resources claimed on first init
- [ ] Workspaces created with ownerId
- [ ] Links created with ownerId
- [ ] Multiple devices can share same user (future sync)
- [ ] Profile shows readable ID
- [ ] Copy ID works

## Questions & Considerations

### Open Questions

1. Should user be able to change their readable ID?
   - Recommendation: No, it's an identifier not a username

2. What happens if user clears localStorage?
   - They get a new user ID
   - Old resources remain but unclaimed
   - Could implement "recovery" with workspace/link secrets later

3. Should we show the user ID prominently?
   - In navbar or settings
   - Useful for potential future collaboration

4. Data retention - should we delete inactive users?
   - Could add a cleanup job after X months of inactivity

### Privacy Considerations

- No email, name, or PII collected
- Device ID is random, not fingerprinted
- User ID is public-safe (no identifying info)
- All data encrypted in transit

### Security Considerations

- Device ID should be random, not fingerprint
- Consider adding rate limits on user creation
- Consider adding CAPTCHA for suspicious activity

### Future Enhancements

- User-to-user link sharing
- Team workspaces
- Role-based access control
- Account upgrade (add email for backup)
