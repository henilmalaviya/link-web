<script lang="ts">
	import { page } from '$app/state';
	import { AreaChart } from 'layerchart';
	import { useQuery } from 'convex-svelte';
	import { timeDay, timeHour, timeMinute, timeMonth, timeWeek, timeYear } from 'd3-time';
	import { api } from '$convex/_generated/api';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { globalState } from '$lib/state/global.svelte';
	import { accountManager } from '$lib/state/accountManager.svelte';
	import ChartContainer from '$lib/components/ui/chart/chart-container.svelte';
	import ChartTooltip from '$lib/components/ui/chart/chart-tooltip.svelte';

	const shortId = $derived(page.url.searchParams.get('shortId') ?? '');
	let { startTime, endTime }: { startTime?: number; endTime?: number } = $props();

	const timeSeriesResult = useQuery(
		api.analytics.timeSeriesByShortId,
		() => {
			const auth = accountManager.authArgs;
			if (!globalState.hydrated || !auth || !shortId) {
				return 'skip';
			}
			return {
				username: auth.username,
				token: auth.token,
				shortId,
				timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
				start: startTime,
				end: endTime
			};
		},
		{
			keepPreviousData: true
		}
	);

	const loading = $derived(!globalState.hydrated || timeSeriesResult.isLoading);
	const buckets = $derived(timeSeriesResult.data?.buckets ?? []);

	const data = $derived(
		buckets.map((bucket) => ({
			date: new Date(bucket.bucketStart),
			value: bucket.value
		}))
	);

	const tickInterval = $derived.by(() => {
		// Default to daily if data hasn't loaded yet
		const meta = timeSeriesResult.data?.meta;
		if (!meta) return timeDay.every(1);

		const { tickUnit, tickStep } = meta;

		// Increase tick step on mobile to reduce clutter
		const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
		const adjustedStep = isMobile ? Math.max(tickStep * 2, 2) : tickStep;

		switch (tickUnit) {
			case 'minute':
				return timeMinute.every(adjustedStep);
			case 'hour':
				return timeHour.every(adjustedStep);
			case 'day':
				return timeDay.every(adjustedStep);
			case 'week':
				return timeWeek.every(adjustedStep);
			case 'month':
				return timeMonth.every(adjustedStep);
			case 'year':
				return timeYear.every(adjustedStep);
			default:
				return timeDay.every(adjustedStep);
		}
	});

	$inspect({ buckets });
</script>

<div class="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:p-6">
	<div class="flex flex-wrap items-center justify-between gap-3">
		{#if loading}
			<Skeleton class="h-5 w-32" />
		{:else}
			<div>
				<p class="text-sm font-semibold">Clicks over time</p>
			</div>
		{/if}
	</div>
	<div class="p-2">
		{#if loading}
			<Skeleton class="h-64 w-full" />
		{:else}
			<ChartContainer
				class="aspect-auto h-48 w-full sm:h-64"
				config={{
					clicks: {
						label: 'Clicks',
						color: 'var(--color-primary)'
					}
				}}
			>
				<AreaChart
					{data}
					x={(d) => d.date}
					y={(d) => d.value}
					series={[
						{
							key: 'clicks',
							label: 'Clicks',
							value: (d) => d.value,
							color: 'var(--color-clicks)'
						}
					]}
					grid
					axis
					points={false}
					props={{
						area: { fillOpacity: 0.18, strokeWidth: 2 },
						xAxis: { ticks: { interval: tickInterval } },
						yAxis: { format: (value: number) => Number(value).toLocaleString() }
					}}
				>
					{#snippet tooltip()}
						<ChartTooltip
							labelFormatter={(value, payload) => {
								return (value as Date).toLocaleString(undefined, {
									month: 'short',
									day: 'numeric',
									hour: 'numeric',
									minute: 'numeric'
								});
							}}
						/>
					{/snippet}
				</AreaChart>
			</ChartContainer>
		{/if}
	</div>
</div>
