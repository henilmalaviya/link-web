<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import type { Id } from '$convex/_generated/dataModel';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Copy, CornerDownRight, MoreHorizontal, Sparkles, ExternalLink } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { copyToClipboard } from '$lib/utils/clipboard';
	import { getFavicon, getHostname } from '$lib/utils/url.js';
	import { formatDate } from '$lib/utils/date.js';
	import { getErrorMessage } from '$lib/utils/error.js';
	import { useLink } from '$lib/hooks/useLink.svelte';
	import { globalState } from '$lib/state/global.svelte';
	import { user } from '$lib/state/user.svelte';

	interface LinkData {
		url: string;
		shortId: string;
		_creationTime: number;
	}

	interface Props {
		shortId: string;
		link?: LinkData;
		isLoading?: boolean;
		error?: unknown;
		clicks?: number;
		children?: Snippet;
		trailing?: Snippet<[clicks: number | undefined]>;
		errorSnippet?: Snippet;
	}

	let {
		shortId,
		link: providedLink,
		isLoading: providedIsLoading = false,
		error: providedError,
		clicks: providedClicks,
		children,
		trailing,
		errorSnippet
	}: Props = $props();

	const linkState = $derived.by(() => {
		if (providedLink || providedError) return null;
		return useLink(() => shortId);
	});

	const clicksResult = $derived.by(() => {
		if (providedLink || providedError) return null;
		return useQuery(api.analytics.totalClicksByShortId, () => {
			if (!globalState.hydrated || !user.data.current) {
				return 'skip';
			}
			return {
				userId: user.data.current.id as Id<'users'>,
				token: user.data.current.token,
				shortId
			};
		});
	});

	const link = $derived(providedLink ?? linkState?.link ?? null);
	const isLoading = $derived(providedIsLoading || (!!linkState && linkState.isLoading));
	const error = $derived(providedError ?? linkState?.error ?? null);
	const clicks = $derived(providedClicks ?? (link ? clicksResult?.data?.totalClicks : undefined));

	let domain = $state('');
	let protocol = $state('');

	const shortUrl = $derived(
		protocol && domain ? `${protocol}//${domain}/${shortId}` : `/${shortId}`
	);

	onMount(() => {
		if (typeof window === 'undefined') return;
		domain = window.location.host;
		protocol = window.location.protocol;
	});

	const copyShortLink = async () => {
		const copied = await copyToClipboard(shortUrl);
		if (copied) {
			toast.success('Short link copied to clipboard');
		} else {
			toast.error('Failed to copy short link');
		}
	};
</script>

{#if isLoading}
	<div class="rounded-xl border bg-card">
		<div class="flex items-center gap-3 px-3 py-3 text-sm sm:gap-5 sm:px-4 sm:py-5 md:gap-12">
			<div class="min-w-0 grow">
				<div class="flex items-center gap-3 sm:h-8">
					<Skeleton class="h-9 w-9 shrink-0 rounded-full" />
					<div class="min-w-0">
						<Skeleton class="h-4 w-28 sm:w-36" />
						<Skeleton class="mt-2 h-3 w-40 sm:w-64" />
					</div>
				</div>
			</div>
			<div class="flex items-center justify-end gap-2">
				<Skeleton class="h-7 w-14 rounded-md sm:w-20" />
				<Skeleton class="h-7 w-7 rounded-md" />
				<Skeleton class="h-7 w-7 rounded-md" />
			</div>
		</div>
	</div>
{:else if error}
	{#if errorSnippet}
		{@render errorSnippet()}
	{:else}
		<div
			class="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-card p-4 text-sm text-destructive"
		>
			<div class="flex items-center gap-2">
				<ExternalLink class="h-4 w-4" />
				<span>{getErrorMessage(error, 'Unable to load link.')}</span>
			</div>
			<Button variant="ghost" size="icon-sm">
				<MoreHorizontal class="h-4 w-4" />
			</Button>
		</div>
	{/if}
{:else if link}
	<div class="rounded-xl border bg-card">
		<div class="flex items-center gap-3 px-3 py-3 text-sm sm:gap-5 sm:px-4 sm:py-5 md:gap-12">
			<div class="min-w-0 grow">
				<div class="flex items-center gap-3 sm:h-8">
					<div
						class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-background"
					>
						<img src={getFavicon(link.url)} alt="" class="h-5 w-5" />
					</div>
					<div class="min-w-0 overflow-hidden">
						<div class="flex items-center gap-1">
							<div class="min-w-0 truncate">
								<a
									href={`/${link.shortId}`}
									target="_blank"
									rel="noopener noreferrer"
									class="leading-6 font-semibold text-neutral-800 transition-colors hover:text-black"
								>
									{domain ? `${domain}/${link.shortId}` : `/${link.shortId}`}
								</a>
							</div>
							<Button
								variant="ghost"
								size="icon-sm"
								class="h-5 w-5 shrink-0 rounded-full p-0"
								onclick={copyShortLink}
							>
								<Copy class="h-3 w-3" />
							</Button>
						</div>
						<div class="flex items-center gap-1 text-sm text-neutral-500">
							<CornerDownRight class="h-3 w-3 shrink-0 text-neutral-400" />
							<a
								href={link.url}
								target="_blank"
								rel="noopener noreferrer"
								class="min-w-0 truncate text-neutral-500 decoration-dotted transition-colors hover:text-neutral-700 hover:underline hover:underline-offset-2"
							>
								{getHostname(link.url)}
							</a>
							<span class="text-neutral-400">•</span>
							<span class="shrink-0 text-neutral-400">
								{formatDate(link._creationTime)}
							</span>
						</div>
					</div>
				</div>
			</div>
			{#if trailing}
				{@render trailing(clicks)}
			{:else if clicks !== undefined}
				<div class="flex shrink-0 items-center gap-2">
					<div
						class="flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-600 tabular-nums {clicks >
						0
							? 'text-sky-700'
							: ''}"
					>
						<Sparkles class="h-3.5 w-3.5" />
						<span>{clicks}</span>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
