# Feature Plan: Delete Workspaces

**Priority**: 1 (Easiest)  
**Difficulty**: Easy  
**Dependencies**: None  
**Estimated Effort**: 2-3 hours

## Overview

Allow users to permanently delete entire workspaces along with all associated links and redirects.

## Current State

- Workspaces can be created but not deleted
- Users can only "forget" workspaces (remove from localStorage)
- No cascade delete exists for workspace → links → redirects

## Requirements

### Functional Requirements

1. User can delete a workspace they own (have the secret for)
2. All links in the workspace must be deleted
3. All redirects for those links must be deleted
4. Workspace is removed from user's localStorage after successful deletion
5. Confirmation dialog required before deletion

### Non-Functional Requirements

1. Operation should be atomic (all or nothing)
2. Clear warning about permanent deletion in UI
3. Toast notification on success/failure

## Technical Implementation

### Backend Changes (`src/convex/workspaces.ts`)

```typescript
export const deleteWorkspace = protectedWorkspaceMutation({
	args: {},
	async handler(ctx) {
		// 1. Get all links in workspace
		const links = await ctx.db
			.query('links')
			.withIndex('byWorkspaceShortName', (q) => q.eq('workspaceId', ctx.workspace._id))
			.collect();

		// 2. Delete all redirects for each link
		for (const link of links) {
			const redirects = await ctx.db
				.query('redirects')
				.withIndex('byLinkId', (q) => q.eq('linkId', link._id))
				.collect();
			for (const redirect of redirects) {
				await ctx.db.delete(redirect._id);
			}
			await ctx.db.delete(link._id);
		}

		// 3. Delete workspace
		await ctx.db.delete(ctx.workspace._id);

		return { deletedLinks: links.length };
	}
});
```

### Frontend Changes

#### `src/lib/stores/global.svelte.ts`

```typescript
// Add method to remove workspace and associated links
removeWorkspaceWithLinks(name: string) {
  // Remove all links associated with this workspace
  this.links.current = this.links.current.filter(
    (l) => l.workspaceName !== name
  );
  // Remove workspace
  this.workspaces.current = this.workspaces.current.filter(
    (w) => w.name !== name
  );
  // Clear current selection if deleted workspace was selected
  if (this.currentWorkspaceName.current === name) {
    this.currentWorkspaceName.current = null;
  }
}
```

#### `src/lib/components/WorkspaceSelector.svelte`

- Add "Delete Workspace" option in dropdown menu
- Use `AlertDialog` component for confirmation
- Warning text: "This will permanently delete this workspace and all X links in it. This action cannot be undone."

### UI Flow

1. User clicks workspace selector dropdown
2. Selects "Delete Workspace" option
3. Confirmation dialog appears with:
   - Workspace name
   - Number of links that will be deleted
   - Strong warning about permanence
4. On confirm:
   - Call `api.workspaces.deleteWorkspace` mutation
   - Call `user.removeWorkspaceWithLinks(name)`
   - Show success toast

## Files to Modify

| File                                          | Change                                |
| --------------------------------------------- | ------------------------------------- |
| `src/convex/workspaces.ts`                    | Add `deleteWorkspace` mutation        |
| `src/lib/stores/global.svelte.ts`             | Add `removeWorkspaceWithLinks` method |
| `src/lib/components/WorkspaceSelector.svelte` | Add delete option and confirmation    |

## Testing Checklist

- [ ] Workspace deletion removes workspace from database
- [ ] All links in workspace are deleted
- [ ] All redirects for those links are deleted
- [ ] Local state is properly cleaned up
- [ ] Current workspace selection is cleared if deleted
- [ ] Confirmation dialog prevents accidental deletion
- [ ] Toast notification shows success
- [ ] Error handling shows failure toast

## Questions & Considerations

### Open Questions

1. Should there be a "soft delete" option for recovery?
   - Current plan: No, permanent deletion matches the simple nature of the app

2. Should we show the count of redirects that will be deleted?
   - Recommendation: Just show link count, redirects are implied

3. What happens if deletion partially fails?
   - Convex transactions are atomic, so either all succeeds or all fails

### Future Considerations

- Could add a "Last chance" email/webhook notification if user account system is added later
- Could implement undo window (30 seconds) before permanent deletion
