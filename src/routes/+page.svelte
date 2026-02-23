<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { user } from '$lib/state/user.svelte';
	import { getErrorMessage } from '$lib/utils.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Search, Filter, LayoutGrid, MoreHorizontal, BarChart3, Loader } from '@lucide/svelte';
	import LinkCard from '$lib/components/LinkCard.svelte';
	import { globalState } from '$lib/state/global.svelte';

	const linksResult = useQuery(api.links.listShortIdsByUser, () =>
		globalState.hydrated && user.data.current
			? {
					userId: user.data.current.id,
					token: user.data.current.token
				}
			: 'skip'
	);
	const links = $derived((linksResult.data ?? []).map((link: { shortId: string }) => link.shortId));
	const loading = $derived(!globalState.hydrated || linksResult.isLoading);
	const errorMessage = $derived(linksResult.error ? getErrorMessage(linksResult.error) : '');
</script>

<div class="flex flex-col gap-6 px-3 py-4 sm:py-6">
	<!-- Control Bar -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex items-center gap-2">
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
			<div class="relative">
				<Search class="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
				<Input
					type="text"
					placeholder="Search by short link or URL"
					class="w-full pl-8 sm:w-64"
					disabled
				/>
			</div>
			<Button variant="ghost" size="sm" disabled>
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
				<LinkCard {shortId} />
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
