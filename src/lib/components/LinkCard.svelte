<script lang="ts">
	import { onMount } from 'svelte';
	import { useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { user } from '$lib/state/user.svelte';
	import { cn, getErrorMessage } from '$lib/utils.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Copy, ExternalLink, CornerDownRight, MoreHorizontal, Sparkles } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { copyToClipboard } from '$lib/utils/clipboard';
	import { globalState } from '$lib/state/global.svelte';
	import type { Id } from '$convex/_generated/dataModel';
	import { DateTime } from 'luxon';

	let { shortId } = $props<{ shortId: string }>();

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

	const formatDate = (timestamp?: number | string) => {
		const value = Number(timestamp);
		if (!Number.isFinite(value)) return '—';

		const createdAt = DateTime.fromMillis(value);
		const now = DateTime.now();

		// Equivalent to moment().diff(..., 'hours', true)
		const hours = now.diff(createdAt).as('hours');

		if (hours < 1) {
			const minutes = now.diff(createdAt).as('minutes');
			const displayMinutes = Math.max(1, Math.floor(minutes));
			return `${displayMinutes}m`;
		}

		if (hours < 24) {
			return `${Math.floor(hours)}h`;
		}

		// Note: Luxon uses 'd' for day without padding and 'yyyy' for 4-digit year
		return createdAt.toFormat('MMM d, yyyy');
	};

	const getHostname = (urlString: string) => {
		try {
			return new URL(urlString).hostname.replace(/^www\./, '');
		} catch {
			return urlString;
		}
	};

	const getFavicon = (urlString: string) => {
		const hostname = getHostname(urlString);
		return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
	};

	const copyShortLink = async () => {
		const copied = await copyToClipboard(shortUrl);
		if (copied) {
			toast.success('Short link copied to clipboard');
		} else {
			toast.error('Failed to copy short link');
		}
	};

	const linkResult = useQuery(api.links.getByShortId, () =>
		globalState.hydrated && user.data.current
			? {
					userId: user.data.current.id as Id<'users'>,
					token: user.data.current.token,
					shortId
				}
			: 'skip'
	);

	const clicksResult = useQuery(api.analytics.totalClicksByShortId, () =>
		globalState.hydrated && user.data.current && shortId
			? {
					userId: user.data.current.id as Id<'users'>,
					token: user.data.current.token,
					shortId
				}
			: 'skip'
	);
</script>

{#if !globalState.hydrated || linkResult.isLoading}
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
			</div>
		</div>
	</div>
{:else if linkResult.error}
	<div
		class="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-card p-4 text-sm text-destructive"
	>
		<div class="flex items-center gap-2">
			<ExternalLink class="h-4 w-4" />
			<span>{getErrorMessage(linkResult.error, 'Unable to load link.')}</span>
		</div>
		<Button variant="ghost" size="icon-sm">
			<MoreHorizontal class="h-4 w-4" />
		</Button>
	</div>
{:else if linkResult.data}
	{@const link = linkResult.data}
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
			<div class="flex items-center justify-end gap-2 sm:gap-5">
				<a
					href={`/analytics?shortId=${link.shortId}`}
					class={cn(
						'flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-600 tabular-nums',
						clicksResult.data && clicksResult.data.totalClicks > 0 && 'text-sky-700'
					)}
				>
					<Sparkles class="h-3.5 w-3.5" />
					<span class="hidden sm:inline">{clicksResult.data?.totalClicks ?? 0} clicks</span>
				</a>
				<Button variant="ghost" size="sm" class="h-7 w-7 p-0">
					<MoreHorizontal class="h-4 w-4" />
				</Button>
			</div>
		</div>
	</div>
{/if}
