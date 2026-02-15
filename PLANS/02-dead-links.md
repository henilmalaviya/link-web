# Feature Plan: Handle Dead Links

**Priority**: 2 (Easy)  
**Difficulty**: Easy  
**Dependencies**: None  
**Estimated Effort**: 1-2 hours

## Overview

Detect and auto-remove links that exist in localStorage but no longer exist in the database (dead links). This can happen when:

- Link was deleted from another device
- Link was deleted by another user with the secret
- Database was reset/cleared
- Link creation failed but was stored locally

## Current State

- Links are stored in localStorage with their secrets
- When a link is queried from the API, errors are shown but link remains in list
- No automatic cleanup mechanism exists
- User has no way to know a link is "dead" vs just having a temporary error

## Requirements

### Functional Requirements

1. Detect when a link no longer exists in the database
2. Automatically remove dead links from localStorage
3. Notify user about removed dead links
4. Clean up on app load (validate all stored links)
5. Handle the case gracefully in LinkCard component

### Non-Functional Requirements

1. Detection should be immediate (on query error)
2. Cleanup should not block UI
3. Clear user feedback via toast notification
4. Don't spam multiple toasts for multiple dead links

## Technical Implementation

### Detection Strategy

A link is considered "dead" when:

- `api.links.get` returns error with message containing "not found"
- Query state is `error` with 404-type error

### Backend Changes

No backend changes required. The existing `authenticateLink` function already throws "Link not found" error.

### Frontend Changes

#### `src/lib/stores/global.svelte.ts`

```typescript
class User {
	// ... existing code ...

	// New method to clean up dead links
	cleanupDeadLinks(deadShortIds: string[]) {
		const before = this.links.current.length;
		this.links.current = this.links.current.filter((l) => !deadShortIds.includes(l.shortId));
		const removed = before - this.links.current.length;
		return removed;
	}

	// Optional: Validate all stored links
	async validateAllLinks(convex: ConvexClient): Promise<string[]> {
		const deadLinks: string[] = [];

		for (const link of this.links.current) {
			try {
				await convex.query(api.links.get, {
					linkShortId: link.shortId,
					linkSecret: link.secret
				});
			} catch (error) {
				if (error instanceof Error && error.message.includes('not found')) {
					deadLinks.push(link.shortId);
				}
			}
		}

		return deadLinks;
	}
}
```

#### `src/lib/components/LinkCard.svelte`

```typescript
// Add to existing script
let {
	shortId,
	secret,
	workspaceName,
	onLoad,
	onDead
}: {
	shortId: string;
	secret: string;
	workspaceName: string | null;
	onLoad?: () => void;
	onDead?: (shortId: string) => void; // NEW
} = $props();

// Add effect to detect dead links
$effect(() => {
	if (query.error) {
		const errorMsg = (query.error as Error)?.message || '';
		if (errorMsg.includes('not found') || errorMsg.includes('Invalid')) {
			onDead?.(shortId);
		}
	}
});
```

#### `src/routes/+page.svelte`

```typescript
// Track dead links found during render
let deadLinks = $state<Set<string>>(new Set());
let cleanupTriggered = $state(false);

function handleDeadLink(shortId: string) {
  deadLinks.add(shortId);
}

// Cleanup effect
$effect(() => {
  if (deadLinks.size > 0 && !cleanupTriggered) {
    cleanupTriggered = true;

    // Small delay to collect all dead links
    setTimeout(() => {
      const removed = user.cleanupDeadLinks([...deadLinks]);
      if (removed > 0) {
        toast.error(`${removed} dead link${removed > 1 ? 's' : ''} removed`);
      }
      deadLinks.clear();
      cleanupTriggered = false;
    }, 100);
  }
});

// Pass onDead to LinkCard
{#each user.links.current as link (link.shortId)}
  <LinkCard
    shortId={link.shortId}
    secret={link.secret}
    workspaceName={link.workspaceName}
    onDead={handleDeadLink}
  />
{/each}
```

### Optional: Startup Validation

Add validation on app initialization:

```typescript
// In +layout.svelte or a dedicated initialization effect
onMount(async () => {
	if (!isHydrated.current) return;

	// Run validation after hydration
	const deadLinks = await user.validateAllLinks(convex);
	if (deadLinks.length > 0) {
		user.cleanupDeadLinks(deadLinks);
		toast.info(`Cleaned up ${deadLinks.length} dead link(s)`);
	}
});
```

## Files to Modify

| File                                 | Change                                                   |
| ------------------------------------ | -------------------------------------------------------- |
| `src/lib/stores/global.svelte.ts`    | Add `cleanupDeadLinks` and optionally `validateAllLinks` |
| `src/lib/components/LinkCard.svelte` | Add `onDead` callback prop and error detection           |
| `src/routes/+page.svelte`            | Handle dead link collection and cleanup                  |

## Testing Checklist

- [ ] Dead link is removed from localStorage
- [ ] Toast notification appears
- [ ] Multiple dead links handled together (single toast)
- [ ] Normal links still work correctly
- [ ] LinkCard doesn't render dead links after cleanup
- [ ] Error states for non-"not found" errors still show

## Questions & Considerations

### Open Questions

1. Should we show a "restore" option in case it was a false positive?
   - Recommendation: No, if link doesn't exist in DB, it's truly gone

2. Should we try to recreate the link automatically?
   - No, the secret would be different and user wouldn't have access anyway

3. Should dead workspace detection also be implemented?
   - Yes, same pattern can be applied

### Edge Cases

- Network error vs dead link: Should only treat "not found" as dead, not network errors
- Rate limiting: If validating all links on startup, could hit rate limits
- Partial failures: Some links valid, some dead - handle gracefully

### Future Considerations

- Could store "dead link history" for user reference
- Could integrate with sync engine to handle cross-device deletions
- Could show "last seen" timestamp for debugging
