# Feature Plans Index

This directory contains detailed plans for upcoming features.

## Priority Order (Ease: Easiest → Hardest)

| Priority | Feature                    | Difficulty  | File                                                       |
| -------- | -------------------------- | ----------- | ---------------------------------------------------------- |
| 1        | Delete Workspaces          | Easy        | [01-delete-workspaces.md](./01-delete-workspaces.md)       |
| 2        | Handle Dead Links          | Easy        | [02-dead-links.md](./02-dead-links.md)                     |
| 3        | Enable/Disable Links       | Medium      | [03-enable-disable-links.md](./03-enable-disable-links.md) |
| 4        | Mini Graph (7-day traffic) | Medium      | [04-mini-graph.md](./04-mini-graph.md)                     |
| 5        | Anonymous User System      | Medium-Hard | [05-anonymous-users.md](./05-anonymous-users.md)           |
| 6        | Sync Engine                | Hard        | [06-sync-engine.md](./06-sync-engine.md)                   |

## Dependencies

```
01-delete-workspaces ─┐
02-dead-links ────────┼──► No dependencies
03-enable-disable-links
04-mini-graph ───────────► Requires timestamp in redirects (self-contained)
05-anonymous-users ──────► No dependencies
06-sync-engine ──────────► Requires 05-anonymous-users
```

## Summary

### 1. Delete Workspaces

Allow users to permanently delete entire workspaces along with all associated links and redirects.

### 2. Handle Dead Links

Detect and auto-remove links that exist in localStorage but no longer exist in the database.

### 3. Enable/Disable Links

Allow link owners to temporarily disable links, stopping traffic while keeping the link manageable.

### 4. Mini Graph (7-Day Traffic)

Display a sparkline chart showing traffic for the past 7 days beside the click count.

### 5. Anonymous User System

Generate anonymous users automatically on first visit and associate all resources with them.

### 6. Sync Engine

Securely synchronize workspaces and links between devices using Convex as the sync layer with end-to-end encryption.
