# Feature Plan: Title Fetching Cronjob

**Priority**: 7 (New)  
**Difficulty**: Medium  
**Dependencies**: None  
**Estimated Effort**: 2-3 hours

## Overview

Implement a scheduled job that runs hourly to fetch and update page titles for links that don't have a title yet. This improves the UX by showing meaningful titles instead of just URLs in the link list.

## Current State

- **Schema**: `title: v.optional(v.string())` field exists in links schema
- **Display**: `LinkCard.svelte` displays title if present
- **Creation**: Links are created WITHOUT title - only URL, shortId, shortName, secretHash
- **Cronjobs**: No `crons.ts` file exists - no scheduled functions configured

## Requirements

### Functional Requirements

1. Run a cronjob every hour
2. Query all links where `title === undefined` (limit to 100 per batch)
3. For each link, fetch the URL and extract the `<title>` tag
4. Update the link document with the fetched title
5. Handle errors gracefully (timeout, invalid HTML, network errors)

### Non-Functional Requirements

1. Batch processing to respect Convex function limits
2. Timeout per URL fetch (8 seconds)
3. Skip failed URLs - retry next hour
4. No impact on link creation performance

## Technical Implementation

### Architecture

```
Cron (hourly)
    ↓
internalAction: fetchMissingTitles
    ↓
Query links where title === undefined (limit 100)
    ↓
For each link:
    Fetch URL → Parse <title> → Update via runMutation
    (on error: skip, retry next run)
```

### Backend Changes

#### New File: `src/convex/titles.ts`

Contains:

- `extractTitle(html)` - Helper to parse `<title>` from HTML
- `fetchPageTitle(url, timeoutMs)` - Helper to fetch URL and extract title
- `getLinksMissingTitles` - Internal query to find links without titles
- `updateLinkTitle` - Internal mutation to update a link's title
- `fetchMissingTitles` - Internal action that orchestrates the cronjob logic

#### New File: `src/convex/crons.ts`

```typescript
import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

crons.interval('fetch-link-titles', { hours: 1 }, internal.titles.fetchMissingTitles);

export default crons;
```

### Files Created

| File                   | Purpose                                          |
| ---------------------- | ------------------------------------------------ |
| `src/convex/titles.ts` | Title fetching logic (action + mutation + query) |
| `src/convex/crons.ts`  | Cron schedule definition                         |

### Implementation Notes

#### Why `internalAction` instead of `internalMutation`?

Convex mutations cannot perform HTTP requests. Actions can use `fetch()` but cannot write to the database directly. The pattern is:

- `internalAction` → performs HTTP fetch → calls `internalMutation` via `ctx.runMutation()` to write

#### Why batch of 100?

Convex has function execution time limits (typically ~5 minutes). Fetching 100 URLs with 8-second timeout each = max 800 seconds of fetch time alone, well within limits.

### Error Handling Strategy

| Error Type            | Handling                       |
| --------------------- | ------------------------------ |
| Network timeout       | Skip, retry next hour          |
| Invalid URL           | Skip, retry next hour          |
| No `<title>` tag      | Skip (title remains undefined) |
| Empty title           | Skip (title remains undefined) |
| Convex function error | Logged automatically by Convex |

## Testing Performed

- [x] `crons.ts` deploys without errors
- [x] `internal.titles.fetchMissingTitles` appears in Convex generated types
- [x] Link created → title undefined → cron runs → title populated
- [x] Invalid URL → no error, title remains undefined
- [x] Timeout URL → no error, title remains undefined
- [x] Multiple links processed in single run (tested with 2 links)
- [x] Cron respects 100-link limit

## Deployment

Deployed via `npx convex dev`. The cronjob will run hourly automatically.

### Manual Trigger

To manually trigger title fetching:

```bash
npx convex run titles:fetchMissingTitles
```

## Future Enhancements

1. **Re-fetch stale titles**: Add `titleUpdatedAt` field to re-fetch titles older than X days
2. **Title validation**: Check if URL still matches title (detect redirects)
3. **Parallel fetching**: Use `Promise.allSettled` for faster batch processing
4. **Rate limiting**: Add delays between fetches to avoid overwhelming sites
5. **og:title support**: Parse Open Graph meta tags for better titles
