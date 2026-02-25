<script lang="ts">
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import FilterIcon from '@lucide/svelte/icons/filter';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import LockIcon from '@lucide/svelte/icons/lock';
	import XCircleIcon from '@lucide/svelte/icons/x-circle';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import ClicksKpiCard from '$lib/components/analytics/ClicksKpiCard.svelte';
	import ClicksTimeSeriesChart from '$lib/components/analytics/ClicksTimeSeriesChart.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Select from '$lib/components/ui/select/index.js';
	import { DateTime } from 'luxon';
	import ClicksListCard from '$lib/components/analytics/ClicksListCard.svelte';
	import { page } from '$app/state';
	import { useLink } from '$lib/hooks/useLink.svelte';
	import LinkItem from '$lib/components/LinkItem.svelte';

	const shortId = $derived(page.url.searchParams.get('shortId') ?? '');

	const linkState = useLink(() => shortId);

	const errorCode = $derived(
		linkState.error ? (linkState.error as { data?: { code?: string } }).data?.code : ''
	);
	const isForbidden = $derived(errorCode === 'FORBIDDEN');
	const isNotFound = $derived(errorCode === 'LINK_NOT_FOUND');

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
	<div class="border-b bg-background px-3 py-3 sm:px-6 sm:py-4">
		<div class="flex flex-col gap-3">
			<div class="flex items-center justify-between gap-3">
				<div class="flex items-center gap-2">
					<Button variant="ghost" size="sm" class="-ml-2 h-8 gap-1 px-2" href="/">
						<ArrowLeftIcon class="h-4 w-4" />
					</Button>
					<h1 class="text-lg font-bold sm:text-xl">Analytics</h1>
				</div>
				<div class="flex flex-wrap gap-2">
					<Button disabled variant="outline" size="sm" class="hidden gap-2 sm:flex">
						<FilterIcon class="h-4 w-4" />
						<span>Filter</span>
					</Button>
					<Select.Root type="single" bind:value={rangeKey}>
						<Select.Trigger size="sm" class="gap-2">
							<CalendarIcon class="h-4 w-4" />
							<span class="xs:inline hidden">{rangeLabel}</span>
							<span class="xs:hidden">{rangeKey}</span>
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
			<LinkItem {shortId} link={linkState.link} isLoading={linkState.isLoading} />
		</div>
	</div>
	{#if linkState.error}
		<div class="flex flex-1 flex-col items-center justify-center gap-4 px-3 py-20 text-center">
			<div class="rounded-full bg-destructive/10 p-4">
				{#if isForbidden}
					<LockIcon class="h-8 w-8 text-destructive" />
				{:else if isNotFound}
					<XCircleIcon class="h-8 w-8 text-destructive" />
				{:else}
					<AlertCircleIcon class="h-8 w-8 text-destructive" />
				{/if}
			</div>
			<div class="flex flex-col gap-2">
				<h2 class="text-lg font-semibold">
					{#if isForbidden}
						Access Denied
					{:else if isNotFound}
						Link Not Found
					{:else}
						Something Went Wrong
					{/if}
				</h2>
				<p class="text-sm text-muted-foreground">
					{#if isForbidden}
						You don't have access to this link's analytics
					{:else if isNotFound}
						This link doesn't exist or has been deleted
					{:else}
						Unable to load link. Please try again.
					{/if}
				</p>
			</div>
			<Button href="/">Go to Dashboard</Button>
		</div>
	{:else if linkState.link}
		<div class="flex flex-col gap-6 px-3 py-4 sm:py-6">
			<ClicksKpiCard {startTime} {endTime} />
			<ClicksTimeSeriesChart {startTime} {endTime} />
			<div class="grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
				<ClicksListCard {shortId} {startTime} {endTime} groups={['country', 'region', 'city']} />
				<ClicksListCard {shortId} {startTime} {endTime} groups={['device', 'browser', 'os']} />
			</div>
		</div>
	{/if}
</div>
