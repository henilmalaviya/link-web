# Feature Plan: Enable/Disable Links

**Priority**: 3 (Medium)  
**Difficulty**: Medium  
**Dependencies**: None  
**Estimated Effort**: 4-6 hours

## Overview

Allow link owners to temporarily disable links, stopping traffic while keeping the link accessible for management. This is useful for:

- Temporary campaigns that shouldn't redirect during updates
- Suspected abuse/spam on a link
- Maintenance periods
- Testing without breaking the short URL

## Current State

- Links are always active once created
- Only way to stop traffic is to delete the link
- No way to temporarily pause a link

## Requirements

### Functional Requirements

1. User can disable/enable a link they own (have secret for)
2. Disabled links show a custom "disabled" page to visitors
3. Link remains in user's dashboard and is fully manageable
4. Toggle state is persisted and immediately effective
5. Visual indication in UI when link is disabled
6. Redirect count preserved while disabled

### Non-Functional Requirements

1. State change should take effect immediately (< 1 second)
2. Clear visual distinction between enabled/disabled links
3. Disabled page should be branded but minimal
4. Analytics still track attempts (optional: separate "blocked" count)

## Technical Implementation

### Schema Changes (`src/convex/schema.ts`)

```typescript
export const linksSchema = {
	shortId: v.string(),
	shortName: v.optional(v.string()),
	secretHash: v.string(),
	url: v.string(),
	title: v.optional(v.string()),
	isEnabled: v.optional(v.boolean()), // NEW: null/undefined = true for backward compat
	workspaceId: v.optional(v.id('workspaces'))
};
```

### Backend Changes (`src/convex/links.ts`)

#### New Mutation: setEnabled

```typescript
export const setEnabled = protectedLinkMutation({
	args: { enabled: v.boolean() },
	async handler(ctx, args) {
		await ctx.db.patch(ctx.link._id, { isEnabled: args.enabled });
		return { success: true };
	}
});
```

#### Update: resolveAndLogRedirect

```typescript
export const resolveAndLogRedirect = mutation({
	args: {
		identifier: v.string(),
		workspaceName: v.optional(v.string())
	},
	async handler(ctx, args) {
		const link = await resolveLink(ctx, args);
		if (!link) return null;

		// Check if disabled
		if (link.isEnabled === false) {
			return { url: null, disabled: true, linkId: link._id };
		}

		await ctx.db.insert('redirects', { linkId: link._id });
		return { url: link.url, disabled: false };
	}
});
```

#### Update: get query

```typescript
export const get = protectedLinkQuery({
	args: {},
	handler(ctx) {
		return {
			_id: ctx.link._id,
			shortId: ctx.link.shortId,
			shortName: ctx.link.shortName,
			url: ctx.link.url,
			title: ctx.link.title,
			isEnabled: ctx.link.isEnabled ?? true, // NEW
			createdAt: new Date(ctx.link._creationTime).toISOString()
		};
	}
});
```

### Frontend Changes

#### New Route: `src/routes/disabled/+page.svelte`

```svelte
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
</script>

<div class="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
	<div class="text-6xl">⏸️</div>
	<h1 class="text-2xl font-semibold">Link Temporarily Disabled</h1>
	<p class="max-w-md text-muted-foreground">
		This short link has been temporarily disabled by its owner. Please check back later or contact
		the link owner.
	</p>
</div>
```

#### Update: `src/routes/[...slug]/+page.server.ts`

```typescript
const result = await convexClient.mutation(api.links.resolveAndLogRedirect, {
	identifier,
	workspaceName: workspace
});

if (!result) {
	throw error(404, 'Link not found');
}

if (result.disabled) {
	throw redirect(302, '/disabled');
}

throw redirect(302, result.url);
```

#### Update: `src/lib/components/LinkCard.svelte`

```svelte
<script lang="ts">
	// ... existing imports
	import Toggle from '@lucide/svelte/icons/toggle-left';
	import ToggleRight from '@lucide/svelte/icons/toggle-right';

	// Add to props or derived
	const isEnabled = $derived(query.data?.isEnabled ?? true);

	async function handleToggle() {
		await client.mutation(api.links.setEnabled, {
			linkShortId: shortId,
			linkSecret: secret,
			enabled: !isEnabled
		});
	}
</script>

<!-- In template, add to dropdown -->
<DropdownMenuItem onclick={handleToggle}>
	{#if isEnabled}
		<Toggle class="size-4" />
		Disable Link
	{:else}
		<ToggleRight class="size-4" />
		Enable Link
	{/if}
</DropdownMenuItem>

<!-- Add visual indicator for disabled state -->
<div class="relative ... {isEnabled ? '' : 'opacity-50'}">
	{#if !isEnabled}
		<span class="absolute top-2 right-2 rounded bg-muted px-1.5 py-0.5 text-xs"> Disabled </span>
	{/if}
	<!-- existing content -->
</div>
```

### Migration Script

```typescript
// One-time migration in Convex dashboard or migration file
export const migrateEnableFlag = internalMutation({
	async handler(ctx) {
		const links = await ctx.db.query('links').collect();
		for (const link of links) {
			if (link.isEnabled === undefined) {
				await ctx.db.patch(link._id, { isEnabled: true });
			}
		}
	}
});
```

## Files to Modify

| File                                   | Change                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------- |
| `src/convex/schema.ts`                 | Add `isEnabled` field                                                   |
| `src/convex/links.ts`                  | Add `setEnabled` mutation, update `resolveAndLogRedirect`, update `get` |
| `src/routes/disabled/+page.svelte`     | Create new disabled page                                                |
| `src/routes/[...slug]/+page.server.ts` | Handle disabled redirect                                                |
| `src/lib/components/LinkCard.svelte`   | Add toggle UI and disabled indicator                                    |

## Testing Checklist

- [ ] New links default to enabled state
- [ ] Toggle updates database correctly
- [ ] Disabled links redirect to /disabled page
- [ ] Enabled links redirect normally
- [ ] Visual indicator shows disabled state
- [ ] Toggle works in dropdown menu
- [ ] Existing links work (backward compatibility)
- [ ] Redirect count preserved when toggling

## Questions & Considerations

### Open Questions

1. Should we track "blocked redirects" separately?
   - Could add a `blockedRedirects` table or field
   - Useful for analytics: "100 people tried while disabled"

2. Should disabled page show the target URL (grayed out)?
   - Pro: User knows what they're missing
   - Con: Could expose sensitive URLs

3. Should there be a "disable until" feature?
   - Auto-enable at a specific date/time
   - Would require a cron job to check

4. What message should the disabled page show?
   - Generic: "This link is temporarily disabled"
   - Custom: Allow owner to set a message
   - Could add `disabledMessage` field later

### Design Decisions Made

- Visitor sees branded disabled page (not 404)
- State is binary (enabled/disabled)
- No scheduling feature in MVP
- Simple toggle in existing dropdown menu

### Future Considerations

- Custom disabled messages per link
- Scheduled enable/disable
- Bulk enable/disable for workspace
- "Maintenance mode" for entire workspace
