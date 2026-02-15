# Feature Plan: Mini Graph for 7-Day Traffic

**Priority**: 4 (Medium)  
**Difficulty**: Medium  
**Dependencies**: Requires timestamp in redirects table  
**Estimated Effort**: 4-5 hours

## Overview

Display a small sparkline chart showing traffic for the past 7 days beside the click count in LinkCard. This gives users a quick visual indication of link activity without needing to visit a detailed analytics page.

## Current State

- Redirects only store `linkId`, no timestamp
- Click count shows total but no temporal data
- No visualization of traffic patterns
- PROJECT.md mentions timestamp as "TO BE ADDED"

## Requirements

### Functional Requirements

1. Show a sparkline chart for past 7 days of traffic
2. Sparkline should be visible directly in the link card
3. Hover should show the date and count for that day
4. Days with 0 clicks should show as baseline, not gaps
5. Chart scales automatically to the data range

### Non-Functional Requirements

1. Chart should render in < 100ms
2. Minimal visual footprint (approx 60x20px)
3. Accessible (keyboard navigation, screen reader)
4. Color matches theme (primary color for data)

## Technical Implementation

### Schema Changes (`src/convex/schema.ts`)

```typescript
export const redirectsSchema = {
	linkId: v.id('links'),
	timestamp: v.number() // NEW: Unix timestamp in milliseconds
};
```

### Index Update

```typescript
redirects: defineTable(redirectsSchema)
	.index('byLinkId', ['linkId'])
	.index('byLinkIdTimestamp', ['linkId', 'timestamp']); // NEW: For efficient time-range queries
```

### Backend Changes (`src/convex/links.ts`)

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

		await ctx.db.insert('redirects', {
			linkId: link._id,
			timestamp: Date.now() // NEW
		});

		return { url: link.url };
	}
});
```

#### New Query: getRedirectsByDay

```typescript
export const getRedirectsByDay = protectedLinkQuery({
	args: {
		days: v.optional(v.number())
	},
	async handler(ctx, args) {
		const days = args.days ?? 7;
		const now = Date.now();
		const dayMs = 24 * 60 * 60 * 1000;
		const startTime = now - days * dayMs;

		// Get all redirects in time range
		const redirects = await ctx.db
			.query('redirects')
			.withIndex('byLinkIdTimestamp', (q) =>
				q.eq('linkId', ctx.link._id).gte('timestamp', startTime)
			)
			.collect();

		// Initialize all days with 0
		const byDay: Map<string, number> = new Map();
		for (let i = 0; i < days; i++) {
			const date = new Date(now - i * dayMs);
			const key = date.toISOString().split('T')[0];
			byDay.set(key, 0);
		}

		// Count redirects per day
		for (const redirect of redirects) {
			const date = new Date(redirect.timestamp);
			const key = date.toISOString().split('T')[0];
			if (byDay.has(key)) {
				byDay.set(key, byDay.get(key)! + 1);
			}
		}

		// Return sorted by date (oldest first)
		const result = Array.from(byDay.entries())
			.map(([date, count]) => ({
				date,
				count,
				dayName: new Date(date).toLocaleDateString('en-US', { weekday: 'short' })
			}))
			.sort((a, b) => a.date.localeCompare(b.date));

		return result;
	}
});
```

### Frontend Changes

#### New Component: `src/lib/components/MiniSparkline.svelte`

```svelte
<script lang="ts">
	import { cn } from '$lib/utils';

	interface DataPoint {
		date: string;
		count: number;
		dayName: string;
	}

	let {
		data,
		class: className,
		width = 56,
		height = 20
	}: {
		data: DataPoint[];
		class?: string;
		width?: number;
		height?: number;
	} = $props();

	const padding = 2;
	const chartWidth = width - padding * 2;
	const chartHeight = height - padding * 2;

	// Scale data to fit
	const maxCount = $derived(Math.max(...data.map((d) => d.count), 1));

	// Generate path points
	const points = $derived(() => {
		if (data.length === 0) return '';

		const step = chartWidth / (data.length - 1 || 1);

		return data
			.map((d, i) => {
				const x = padding + i * step;
				const y = padding + chartHeight - (d.count / maxCount) * chartHeight;
				return `${x},${y}`;
			})
			.join(' ');
	});

	// Tooltip state
	let hoveredIndex = $state<number | null>(null);

	$effect(() => {
		console.log('Sparkline data:', data);
	});
</script>

<div class={cn('relative', className)}>
	<svg
		viewBox={`0 0 ${width} ${height}`}
		class="h-full w-full"
		role="img"
		aria-label="Traffic sparkline"
	>
		<!-- Polyline -->
		<polyline
			points={points()}
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="text-primary"
		/>

		<!-- Dots on hover -->
		{#if hoveredIndex !== null && data[hoveredIndex]}
			{@const step = chartWidth / (data.length - 1 || 1)}
			{@const x = padding + hoveredIndex * step}
			{@const y = padding + chartHeight - (data[hoveredIndex].count / maxCount) * chartHeight}
			<circle cx={x} cy={y} r="2" class="fill-primary" />
		{/if}
	</svg>

	<!-- Hover areas for tooltip -->
	<div class="absolute inset-0 flex">
		{#each data as d, i}
			<div
				class="flex-1 cursor-pointer"
				onmouseenter={() => (hoveredIndex = i)}
				onmouseleave={() => (hoveredIndex = null)}
				role="button"
				tabindex={0}
				aria-label={`${d.dayName}: ${d.count} clicks`}
			>
				{#if hoveredIndex === i}
					<div
						class="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 rounded bg-popover px-2 py-1 text-xs whitespace-nowrap shadow-lg"
					>
						<span class="font-medium">{d.dayName}</span>
						<span class="ml-1 text-muted-foreground">{d.count}</span>
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>
```

#### Update: `src/lib/components/LinkCard.svelte`

```svelte
<script lang="ts">
	// ... existing imports
	import MiniSparkline from './MiniSparkline.svelte';

	// Add new query
	const redirectDaysQuery = useQuery(api.links.getRedirectsByDay, () => ({
		linkShortId: shortId,
		linkSecret: secret,
		days: 7
	}));

	const redirectsByDay = $derived(() => {
		if (redirectDaysQuery.isLoading || redirectDaysQuery.error) return [];
		return redirectDaysQuery.data ?? [];
	});
</script>

<!-- In the tail section, replace the click count display -->
<div class="flex items-center gap-2">
	{#if redirectsByDay().length > 0}
		<MiniSparkline data={redirectsByDay()} class="h-5 w-14" />
	{/if}
	<div
		class="inline-flex items-center gap-1 rounded-sm border bg-background px-2 py-2 text-xs font-medium"
	>
		<MousePointerClick class="size-4 text-primary" />
		<span>{totalClicks}</span>
	</div>
</div>
```

### Migration Script

```typescript
// One-time migration for existing redirects
export const migrateTimestamps = internalMutation({
	async handler(ctx) {
		const redirects = await ctx.db.query('redirects').collect();
		for (const redirect of redirects) {
			if (redirect.timestamp === undefined) {
				// Use creation time as fallback
				await ctx.db.patch(redirect._id, {
					timestamp: redirect._creationTime
				});
			}
		}
	}
});
```

## Files to Create/Modify

| File                                      | Change                                                  |
| ----------------------------------------- | ------------------------------------------------------- |
| `src/convex/schema.ts`                    | Add `timestamp` field, add index                        |
| `src/convex/links.ts`                     | Update `resolveAndLogRedirect`, add `getRedirectsByDay` |
| `src/lib/components/MiniSparkline.svelte` | Create new component                                    |
| `src/lib/components/LinkCard.svelte`      | Add sparkline display                                   |

## Testing Checklist

- [ ] Timestamp added to new redirects
- [ ] Query returns correct day counts
- [ ] Sparkline renders correctly
- [ ] Hover tooltip shows date and count
- [ ] Zero-count days show baseline
- [ ] Scale adjusts to max count
- [ ] Works with 0 redirects
- [ ] Works with large counts (>1000)
- [ ] Migration runs without errors

## Questions & Considerations

### Open Questions

1. Should we show the date range in the tooltip or just day name?
   - Current plan: Day name only (Mon, Tue, etc.)

2. What color scheme for the sparkline?
   - Current plan: Use primary color (violet) from theme

3. Should sparkline show area fill or just line?
   - Current plan: Line only, cleaner look

4. What about timezone handling?
   - Current plan: Use local browser timezone
   - Could add UTC option later

5. Should we cache this query aggressively?
   - Redirects are append-only, so caching is safe
   - Could use Convex's built-in caching

### Performance Considerations

- Query should use index for efficiency
- Consider caching at Convex level
- Large redirect counts: Could aggregate server-side

### Future Enhancements

- Click to expand to full analytics view
- Different time ranges (30 days, 90 days)
- Comparison with previous period
- Export data as CSV

### Accessibility

- ARIA label on SVG
- Keyboard navigation for data points
- High contrast mode support
- Screen reader announces values on focus
