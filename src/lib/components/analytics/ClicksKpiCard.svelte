<script lang="ts">
	import { page } from '$app/state';
	import { useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { globalState } from '$lib/state/global.svelte';
	import { userManager } from '$lib/state/userManager.svelte';

	let { startTime, endTime } = $props<{ startTime?: number; endTime?: number }>();

	const shortId = $derived(page.url.searchParams.get('shortId') ?? '');

	const totalClicksResult = useQuery(
		api.analytics.totalClicksByShortId,
		() => {
			const auth = userManager.authArgs;
			if (!globalState.hydrated || !auth || !shortId) {
				return 'skip';
			}
			return {
				username: auth.username,
				token: auth.token,
				shortId,
				start: startTime,
				end: endTime
			};
		},
		{
			keepPreviousData: true
		}
	);

	const loading = $derived(!globalState.hydrated || totalClicksResult.isLoading);
	const totalClicks = $derived(totalClicksResult.data?.totalClicks ?? 0);
</script>

<div class="rounded-xl border bg-card p-3 sm:p-5">
	{#if loading}
		<Skeleton class="h-4 w-20" />
		<Skeleton class="mt-3 h-8 w-28" />
	{:else}
		<p class="text-xs font-medium text-muted-foreground">Clicks</p>
		<div class="mt-2 text-3xl font-semibold tabular-nums">
			{totalClicks.toLocaleString()}
		</div>
	{/if}
</div>
