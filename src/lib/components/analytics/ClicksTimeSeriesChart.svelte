<script lang="ts">
	import { page } from '$app/state';
	import { AreaChart } from 'layerchart';
	import { useQuery } from 'convex-svelte';
	import { timeDay, timeHour } from 'd3-time';
	import { api } from '$convex/_generated/api';
	import type { Id } from '$convex/_generated/dataModel';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { globalState } from '$lib/state/global.svelte';
	import { user } from '$lib/state/user.svelte';

	const shortId = $derived(page.url.searchParams.get('shortId') ?? '');
	let { startTime, endTime }: { startTime?: number; endTime?: number } = $props();

	const timeSeriesResult = useQuery(
		api.analytics.timeSeriesByShortId,
		() =>
			globalState.hydrated && user.data.current && shortId
				? {
						userId: user.data.current.id as Id<'users'>,
						token: user.data.current.token,
						shortId,
						timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
						start: startTime,
						end: endTime
					}
				: 'skip',
		{
			keepPreviousData: true
		}
	);

	const loading = $derived(!globalState.hydrated || timeSeriesResult.isLoading);

	$inspect({ timeSeriesResult });
</script>

<div class="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:p-6">
	<div class="flex flex-wrap items-center justify-between gap-3">
		{#if loading}
			<Skeleton class="h-5 w-32" />
		{:else}
			<div>
				<p class="text-sm font-semibold">Clicks over time</p>
			</div>
		{/if}
	</div>
	<div class="mt-4">
		{#if loading}
			<Skeleton class="h-64 w-full" />
		{:else}
			<!-- <ChartContainer
				class="aspect-auto h-64 w-full"
				config={{
					clicks: {
						label: 'Clicks',
						color: 'var(--color-primary)'
					}
				}}
			>
				<AreaChart
					data={timeSeriesWithDates}
					x={(d: ClickPointDate) => d.date}
					y={(d: ClickPoint) => d.count}
					series={[
						{
							key: 'clicks',
							label: 'Clicks',
							value: (d: ClickPointDate) => d.count,
							color: 'var(--color-clicks)'
						}
					]}
					grid
					axis
					points={false}
					props={{
						area: { fillOpacity: 0.18, strokeWidth: 2 },
						xAxis: { format: formatLocalTick, ticks: { interval: tickInterval } },
						yAxis: { format: (value: number) => Number(value).toLocaleString() }
					}}
				>
					{#snippet tooltip()}
						<ChartTooltip
							labelFormatter={(_value, payload) => {
								const point = payload?.[0]?.payload as ClickPointDate | undefined;
								const value = point?.date ?? point?.timestamp;
								return formatLocalLabel(value ?? 0);
							}}
						/>
					{/snippet}
				</AreaChart>
			</ChartContainer> -->
		{/if}
	</div>
</div>
