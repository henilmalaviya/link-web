<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { getErrorMessage } from '$lib/utils/error.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Popover from '$lib/components/ui/popover';
	import * as Select from '$lib/components/ui/select';
	import {
		Search,
		Filter,
		LayoutGrid,
		MoreHorizontal,
		BarChart3,
		Loader,
		MousePointerClick,
		ArrowUpDown,
		ArrowUp,
		ArrowDown,
		ChevronLeft,
		ChevronRight,
		ChartArea
	} from '@lucide/svelte';
	import LinkItem from '$lib/components/LinkItem.svelte';
	import { globalState } from '$lib/state/global.svelte';
	import { account } from '$lib/state/account.svelte';
	import { Debounced } from 'runed';

	let search = $state('');
	const debounced = new Debounced(() => search, 300);
	let orderBy = $state<'newest' | 'oldest' | 'most_clicks' | 'least_clicks'>('newest');
	let currentPage = $state(1);
	let displayPopoverOpen = $state(false);
	const limit = 10;

	$effect(() => {
		if (search) {
			currentPage = 1;
		}
	});

	$effect(() => {
		if (orderBy) {
			displayPopoverOpen = false;
		}
	});

	const linksResult = useQuery(api.links.listShortIdsByUser, () => {
		if (!globalState.hydrated || !account.authArgs) {
			return 'skip';
		}
		return {
			...account.authArgs,
			search: debounced.current || undefined,
			orderBy,
			limit,
			skip: (currentPage - 1) * limit
		};
	});

	const links = $derived(
		(linksResult.data?.links ?? []).map((link: { shortId: string }) => link.shortId)
	);
	const totalLinks = $derived(linksResult.data?.total ?? 0);
	const totalPages = $derived(Math.ceil(totalLinks / limit));
	const showingFrom = $derived(totalLinks === 0 ? 0 : (currentPage - 1) * limit + 1);
	const showingTo = $derived(Math.min(currentPage * limit, totalLinks));
	const loading = $derived(!globalState.hydrated || linksResult.isLoading);
	const errorMessage = $derived(linksResult.error ? getErrorMessage(linksResult.error) : '');

	const isFirstPage = $derived(currentPage <= 1);
	const isLastPage = $derived(currentPage >= totalPages || totalPages === 0);
</script>

<div class="flex grow flex-col gap-6 px-3 py-4 sm:py-6">
	<!-- Control Bar -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="hidden items-center gap-2 sm:flex">
			<Button variant="outline" size="sm" disabled>
				<Filter class="mr-2 h-4 w-4" />
				Filter
			</Button>
			<Popover.Root bind:open={displayPopoverOpen}>
				<Popover.Trigger>
					<Button variant="outline" size="sm">
						<LayoutGrid class="mr-2 h-4 w-4" />
						Display
					</Button>
				</Popover.Trigger>
				<Popover.Content align="start" class="w-80">
					<div class="flex items-center justify-between gap-3">
						<div class="flex items-center gap-2 text-sm">
							<ArrowUpDown class="h-4 w-4" />
							<span>Ordering</span>
						</div>
						<Select.Root type="single" bind:value={orderBy}>
							<Select.Trigger class="w-fit">
								<span
									>{orderBy === 'newest'
										? 'Newest first'
										: orderBy === 'oldest'
											? 'Oldest first'
											: orderBy === 'most_clicks'
												? 'Most clicks'
												: 'Least clicks'}</span
								>
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="newest">
									<ArrowDown class="mr-2 inline h-4 w-4" />
									Newest first
								</Select.Item>
								<Select.Item value="oldest">
									<ArrowUp class="mr-2 inline h-4 w-4" />
									Oldest first
								</Select.Item>
								<Select.Item value="most_clicks">
									<BarChart3 class="mr-2 inline h-4 w-4" />
									Most clicks
								</Select.Item>
								<Select.Item value="least_clicks">
									<ArrowUpDown class="mr-2 inline h-4 w-4" />
									Least clicks
								</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
				</Popover.Content>
			</Popover.Root>
		</div>
		<div class="flex items-center gap-2">
			<div class="relative grow">
				<Search class="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
				<Input
					type="text"
					placeholder="Search by short link or URL"
					class="w-full pl-8 sm:w-64"
					bind:value={search}
				/>
			</div>
		</div>
	</div>

	{#if loading}
		<div class="flex items-center justify-center p-6">
			<Loader class="h-5 w-5 animate-spin text-muted-foreground" />
		</div>
	{:else if errorMessage}
		<div class="flex items-center justify-center rounded-lg border p-6 text-sm text-destructive">
			{errorMessage}
		</div>
	{:else}
		<!-- Links List -->
		<div class="flex flex-col gap-3">
			{#each links as shortId (shortId)}
				<LinkItem {shortId}>
					{#snippet trailing(clicks)}
						<div class="flex shrink-0 items-center gap-2">
							{#if clicks !== undefined}
								<a
									href={`/analytics?shortId=${shortId}`}
									class="flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-600 tabular-nums {clicks >
									0
										? 'text-sky-700'
										: ''}"
								>
									<MousePointerClick class="h-3.5 w-3.5" />
									<span>{clicks} clicks</span>
								</a>
							{/if}
						</div>
					{/snippet}
				</LinkItem>
			{/each}
		</div>

		{#if links.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-center">
				<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
					<ChartArea class="h-8 w-8 text-muted-foreground" />
				</div>
				<h3 class="text-lg font-medium">No links found</h3>
				<p class="mt-2 max-w-sm text-muted-foreground">
					{debounced.current
						? 'No links match your search. Try a different search term.'
						: 'Create your first link to get started with link tracking and analytics.'}
				</p>
			</div>
		{/if}

		<!-- Pagination -->
		{#if totalLinks > 0}
			<div
				class="sticky bottom-0 mt-auto flex flex-col items-center justify-between gap-4 border-t bg-background/80 px-3 py-4 text-sm backdrop-blur-md sm:flex-row sm:px-6"
			>
				<div class="text-muted-foreground">
					Page {currentPage} of {totalPages} | Showing {showingFrom}-{showingTo} of {totalLinks} links
				</div>
				<div class="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={isFirstPage}
						onclick={() => (currentPage = currentPage - 1)}
					>
						<ChevronLeft class="h-4 w-4" />
						Prev
					</Button>
					<Button
						variant="outline"
						size="sm"
						disabled={isLastPage}
						onclick={() => (currentPage = currentPage + 1)}
					>
						Next
						<ChevronRight class="h-4 w-4" />
					</Button>
				</div>
			</div>
		{/if}
	{/if}
</div>
