<script lang="ts">
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { blur } from 'svelte/transition';
	import CornerDownRight from '@lucide/svelte/icons/corner-down-right';
	import MousePointerClick from '@lucide/svelte/icons/mouse-pointer-click';
	import MoreVertical from '@lucide/svelte/icons/more-vertical';
	import Trash from '@lucide/svelte/icons/trash';
	import { browser } from '$app/environment';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import { user } from '$lib/stores/global.svelte';

	let {
		shortId,
		secret,
		workspaceName,
		onLoad
	}: {
		shortId: string;
		secret: string;
		workspaceName: string | null;
		onLoad?: () => void;
	} = $props();

	const client = useConvexClient();
	const query = useQuery(api.links.get, () => ({ linkShortId: shortId, linkSecret: secret }));
	const clickCountQuery = useQuery(api.links.getRedirectCount, () => ({
		linkShortId: shortId,
		linkSecret: secret
	}));

	$effect(() => {
		if (query.data) {
			onLoad?.();
		}
	});

	const linkShortURL = $derived.by(() => {
		if (query.isLoading || query.error) return '';
		const domain = browser ? window.location.origin : '';
		const identifier = query.data.shortName || shortId;
		if (workspaceName) {
			return `${domain}/${workspaceName}/${identifier}`;
		}
		return `${domain}/${identifier}`;
	});

	const totalClicks = $derived.by(() => {
		if (clickCountQuery.isLoading || clickCountQuery.error) return 0;
		return clickCountQuery.data ?? 0;
	});

	async function handleDelete() {
		await client.mutation(api.links.deleteLink, { linkShortId: shortId, linkSecret: secret });
		user.removeLink(shortId);
	}
</script>

{#snippet LinkFavicon(url: string)}
	<div class="max-h-fit rounded-full border p-1 transition">
		<img
			src="https://favicon.im/{new URL(url).hostname}"
			alt="favicon"
			class="h-5 w-5 rounded-full"
		/>
	</div>
{/snippet}

{#if query.isLoading}{:else if query.error}{:else}
	<div
		in:blur
		out:blur
		class="relative flex min-h-16 w-full gap-3 border-b px-4 py-6 transition hover:bg-accent/50"
	>
		<div class="flex items-center justify-center">
			{@render LinkFavicon(query.data.url)}
		</div>
		<!-- body -->
		<div class="min-w-0 flex-1 overflow-hidden pr-8">
			{#if query.data.title?.trim()}
				<p class="mb-1 truncate text-sm font-medium">{query.data.title}</p>
				<div class="flex items-center gap-1 text-xs text-muted-foreground">
					<CornerDownRight class="size-3 shrink-0 text-muted-foreground" />
					<a href={linkShortURL} class="block truncate hover:underline" target="_blank"
						>{linkShortURL}</a
					>
				</div>
			{:else}
				<div class="flex items-center gap-1 text-sm font-medium">
					<a href={linkShortURL} class="block truncate hover:underline" target="_blank"
						>{linkShortURL}</a
					>
				</div>
			{/if}
			<div class="flex items-center gap-1 text-xs text-muted-foreground">
				<CornerDownRight class="size-3 shrink-0 text-muted-foreground" />
				<a href={query.data.url} class="block truncate hover:underline" target="_blank"
					>{query.data.url}</a
				>
			</div>
		</div>
		<!-- tail -->
		<div class="flex items-center gap-2">
			<div
				class="inline-flex items-center gap-1 rounded-sm border bg-background px-2 py-2 text-xs font-medium text-foreground"
			>
				<MousePointerClick class="size-4 text-primary" />
				<span>
					{totalClicks}
					{totalClicks === 1 ? 'click' : 'clicks'}
				</span>
			</div>
			<DropdownMenu>
				<DropdownMenuTrigger class="rounded p-1 hover:bg-muted">
					<MoreVertical class="size-4 text-muted-foreground" />
				</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuItem class="text-destructive" onclick={handleDelete}>
						<Trash class="size-4" />
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	</div>
{/if}
