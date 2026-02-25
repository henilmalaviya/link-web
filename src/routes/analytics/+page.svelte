<script lang="ts">
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import FilterIcon from '@lucide/svelte/icons/filter';
	import ClicksKpiCard from '$lib/components/analytics/ClicksKpiCard.svelte';
	import ClicksTimeSeriesChart from '$lib/components/analytics/ClicksTimeSeriesChart.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Select from '$lib/components/ui/select/index.js';
	import { DateTime } from 'luxon';

	const ranges = [
		{
			key: '1h',
			label: '1 Hour',
			start: () => DateTime.now().minus({ hours: 1 }).startOf('minute').toMillis(),
			end: () => undefined
		},
		{
			key: '24h',
			label: '24 Hours',
			start: () => DateTime.now().minus({ hours: 24 }).startOf('hour').toMillis(),
			end: () => undefined
		},
		{
			key: '7d',
			label: '7 Days',
			start: () => DateTime.now().minus({ days: 7 }).startOf('day').toMillis(),
			end: () => undefined
		},
		{
			key: '30d',
			label: '30 Days',
			start: () => DateTime.now().minus({ days: 30 }).startOf('day').toMillis(),
			end: () => undefined
		},
		{
			key: 'all',
			label: 'All Time',
			start: () => undefined,
			end: () => undefined
		}
	];

	let rangeKey = $state<string>('1h');
	const range = $derived(ranges.find((r) => r.key === rangeKey));
	const rangeLabel = $derived(range?.label ?? 'Select range');

	const startTime = $derived.by(() => range?.start());
	const endTime = $derived.by(() => range?.end());

	$inspect({ rangeKey, startTime, endTime });
</script>

<div class="flex flex-col bg-background/50 pb-20">
	<div class="border-b bg-background px-6 py-4">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h1 class="text-xl font-bold">Analytics</h1>
			<div class="flex flex-wrap gap-2">
				<Button variant="outline" size="sm" class="gap-2">
					<FilterIcon class="h-4 w-4" />
					<span>Filter</span>
					<span class="rounded-full bg-foreground px-1.5 text-[10px] font-semibold text-background">
						1
					</span>
				</Button>
				<Select.Root type="single" bind:value={rangeKey}>
					<Select.Trigger size="sm" class="gap-2">
						<CalendarIcon class="h-4 w-4" />
						<span>{rangeLabel}</span>
					</Select.Trigger>
					<Select.Content class="w-44">
						{#each ranges as option (option.key)}
							<Select.Item value={option.key} label={option.label}>
								{option.label}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</div>
	</div>
	<div class="flex flex-col gap-6 px-3 py-4 sm:py-6">
		<ClicksKpiCard {startTime} {endTime} />
		<ClicksTimeSeriesChart {startTime} {endTime} />
	</div>
</div>
