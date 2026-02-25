<script lang="ts">
	import { api } from '$convex/_generated/api';
	import type { Id } from '$convex/_generated/dataModel';
	import { globalState } from '$lib/state/global.svelte';
	import { user } from '$lib/state/user.svelte';
	import { useQuery } from 'convex-svelte';
	import * as Card from '$lib/components/ui/card';
	import * as ButtonGroup from '$lib/components/ui/button-group';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Group } from 'layerchart';
	import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte';
	import { slide } from 'svelte/transition';
	import iso3166_1 from 'iso-3166-1';

	let {
		groups = $bindable(),
		startTime,
		endTime,
		shortId
	}: {
		groups: ('country' | 'city' | 'region' | 'device' | 'browser' | 'os')[];
		startTime?: number;
		endTime?: number;
		shortId: string;
	} = $props();

	if (groups.length === 0) {
		throw new Error('At least one group is required');
	}

	let selectedGroup = $state(groups[0]);
	let isCardHovered = $state(false);

	const data = useQuery(
		api.analytics.aggregateClicksByShortId,
		() =>
			globalState.hydrated && user.data.current && shortId
				? {
						userId: user.data.current.id as Id<'users'>,
						token: user.data.current.token,
						shortId,
						start: startTime,
						end: endTime,
						groupBy: selectedGroup
					}
				: 'skip',
		{}
	);

	$inspect({ data, selectedGroup });
</script>

{#snippet GroupSelector()}
	<div class="flex w-full overflow-x-auto sm:flex-nowrap">
		<ButtonGroup.Root class="flex w-full sm:w-auto">
			{#each groups as group}
				<Button
					onclick={() => (selectedGroup = group)}
					variant="outline"
					size="lg"
					class="data-[state=off]:border-b-none flex-1 shrink-0 rounded-none whitespace-nowrap capitalize data-[state=on]:border-b data-[state=on]:border-b-primary sm:flex-initial"
					data-state={selectedGroup === group ? 'on' : 'off'}
				>
					{group}
				</Button>
			{/each}
		</ButtonGroup.Root>
	</div>
{/snippet}

{#snippet CountryIcon({ country }: { country: string })}
	<img width="20" src="https://flagcdn.com/{country.toLowerCase()}.svg" alt="" />
{/snippet}

<Card.Root
	onmouseenter={() => (isCardHovered = true)}
	onmouseleave={() => (isCardHovered = false)}
	class="min-h-96 w-full pt-0 shadow-none"
>
	<Card.Header class="gap-0 overflow-hidden border-b p-0!">
		{@render GroupSelector()}
	</Card.Header>
	<Card.Content class="p-3 sm:p-4">
		{#if data.isLoading}
			<div class="flex flex-col gap-2">
				<Skeleton class="h-8 w-full" />
				<Skeleton class="h-8 w-full" />
				<Skeleton class="h-8 w-full" />
				<Skeleton class="h-8 w-full" />
			</div>
		{:else if data.error}
			<p>Error: {data.error.message}</p>
		{:else if data.data}
			{#if data.data.counts.length === 0}
				<div class="flex flex-col items-center justify-center gap-3 p-4">
					<p class="max-w-3xs text-center text-sm text-muted-foreground">
						No data available for the selected time period.
					</p>
				</div>
			{:else}
				<ul class="flex flex-col gap-2">
					{#each data.data.counts as item}
						{@const percentage = item.clicks / data.data.total}
						<li
							class="group/list-item relative flex items-center justify-between gap-2 rounded p-2 px-4 text-sm"
						>
							<div
								class="absolute inset-0 h-full rounded bg-primary/5 transition group-hover/list-item:bg-primary/10"
								style="width: {percentage * 100}%"
							></div>
							<div class="flex items-center gap-3">
								{#if selectedGroup === 'country' && item.name !== 'Unknown'}
									{@render CountryIcon({ country: item.name })}
								{/if}
								{#if (selectedGroup === 'region' || selectedGroup === 'city') && item.country && item.country !== 'Unknown'}
									{@render CountryIcon({ country: item.country })}
								{/if}
								<span class="truncate capitalize">
									{#if selectedGroup === 'country'}
										{iso3166_1.whereAlpha2(item.name)?.country || item.name}
									{:else if selectedGroup === 'region'}
										{item.name}{item.country
											? `, ${iso3166_1.whereAlpha2(item.country)?.country || item.country}`
											: ''}
									{:else}
										{item.name}
									{/if}
								</span>
							</div>
							<div class="flex gap-4">
								<span class="">{item.clicks}</span>
								{#if isCardHovered}
									<span
										in:slide={{ axis: 'x', duration: 200 }}
										out:slide={{ axis: 'x', duration: 200 }}
										class="text-muted-foreground">{(percentage * 100).toFixed(0)}%</span
									>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		{:else}
			<p>No data</p>
		{/if}
	</Card.Content>
</Card.Root>
