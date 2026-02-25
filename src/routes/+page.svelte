<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import type { Id } from '$convex/_generated/dataModel';
	import { getErrorMessage } from '$lib/utils/error.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import {
		Search,
		Filter,
		LayoutGrid,
		MoreHorizontal,
		BarChart3,
		Loader,
		MousePointerClick
	} from '@lucide/svelte';
	import LinkItem from '$lib/components/LinkItem.svelte';
	import { globalState } from '$lib/state/global.svelte';
	import { user } from '$lib/state/user.svelte';

	const linksResult = useQuery(api.links.listShortIdsByUser, () => {
		if (!globalState.hydrated || !user.authArgs) {
			return 'skip';
		}
		return user.authArgs;
	});
	const links = $derived((linksResult.data ?? []).map((link: { shortId: string }) => link.shortId));
	const loading = $derived(!globalState.hydrated || linksResult.isLoading);
	const errorMessage = $derived(linksResult.error ? getErrorMessage(linksResult.error) : '');
</script>

<div class="flex flex-col gap-6 px-3 py-4 sm:py-6">
	<!-- Control Bar -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="hidden items-center gap-2 sm:flex">
			<Button variant="outline" size="sm" disabled>
				<Filter class="mr-2 h-4 w-4" />
				Filter
			</Button>
			<Button variant="outline" size="sm" disabled>
				<LayoutGrid class="mr-2 h-4 w-4" />
				Display
			</Button>
		</div>
		<div class="flex items-center gap-2">
			<div class="relative grow">
				<Search class="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
				<Input
					type="text"
					placeholder="Search by short link or URL"
					class="w-full pl-8 sm:w-64"
					disabled
				/>
			</div>
			<Button variant="ghost" size="sm" class="hidden sm:flex" disabled>
				<MoreHorizontal class="h-4 w-4" />
			</Button>
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
									<span>{clicks}</span>
								</a>
							{/if}
							<Button variant="ghost" size="sm" class="h-7 w-7 p-0">
								<MoreHorizontal class="h-4 w-4" />
							</Button>
						</div>
					{/snippet}
				</LinkItem>
			{/each}
		</div>

		{#if links.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-center">
				<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
					<BarChart3 class="h-8 w-8 text-muted-foreground" />
				</div>
				<h3 class="text-lg font-medium">No links yet</h3>
				<p class="mt-2 max-w-sm text-muted-foreground">
					Create your first link to get started with link tracking and analytics.
				</p>
			</div>
		{/if}
	{/if}
</div>
