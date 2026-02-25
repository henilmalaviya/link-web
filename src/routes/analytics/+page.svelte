<script lang="ts">
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import FilterIcon from '@lucide/svelte/icons/filter';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import CornerDownRightIcon from '@lucide/svelte/icons/corner-down-right';
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
	import { useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import type { Id } from '$convex/_generated/dataModel';
	import { globalState } from '$lib/state/global.svelte';
	import { user } from '$lib/state/user.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { copyToClipboard } from '$lib/utils/clipboard';
	import { getErrorMessage } from '$lib/utils.js';
	import { toast } from 'svelte-sonner';

	const shortId = $derived(page.url.searchParams.get('shortId') ?? '');

	let domain = $state('');
	let protocol = $state('');

	$effect(() => {
		if (typeof window !== 'undefined') {
			domain = window.location.host;
			protocol = window.location.protocol;
		}
	});

	const shortUrl = $derived(
		protocol && domain ? `${protocol}//${domain}/${shortId}` : `/${shortId}`
	);

	const copyShortLink = async () => {
		const copied = await copyToClipboard(shortUrl);
		if (copied) {
			toast.success('Short link copied to clipboard');
		} else {
			toast.error('Failed to copy short link');
		}
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

	const formatDate = (timestamp?: number | string) => {
		const value = Number(timestamp);
		if (!Number.isFinite(value)) return '—';

		const createdAt = DateTime.fromMillis(value);
		const now = DateTime.now();

		const hours = now.diff(createdAt).as('hours');

		if (hours < 1) {
			const minutes = now.diff(createdAt).as('minutes');
			const displayMinutes = Math.max(1, Math.floor(minutes));
			return `${displayMinutes}m`;
		}

		if (hours < 24) {
			return `${Math.floor(hours)}h`;
		}

		return createdAt.toFormat('MMM d, yyyy');
	};

	const linkResult = useQuery(api.links.getByShortId, () =>
		globalState.hydrated && user.data.current && shortId
			? {
					userId: user.data.current.id as Id<'users'>,
					token: user.data.current.token,
					shortId
				}
			: 'skip'
	);

	const linkLoading = $derived(!globalState.hydrated || linkResult.isLoading);
	const link = $derived(linkResult.data);
	const linkError = $derived(linkResult.error ? getErrorMessage(linkResult.error) : '');
	const errorCode = $derived(
		linkResult.error ? (linkResult.error as { data?: { code?: string } }).data?.code : ''
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
			{#if linkLoading}
				<div class="rounded-xl border bg-card">
					<div class="flex items-center gap-3 px-3 py-3 text-sm sm:gap-5 sm:px-4 sm:py-5">
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
			{:else if link}
				<div class="rounded-xl border bg-card">
					<div class="flex items-center gap-3 px-3 py-3 text-sm sm:gap-5 sm:px-4 sm:py-5">
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
											<CopyIcon class="h-3 w-3" />
										</Button>
									</div>
									<div class="flex items-center gap-1 text-sm text-neutral-500">
										<CornerDownRightIcon class="h-3 w-3 shrink-0 text-neutral-400" />
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
					</div>
				</div>
			{/if}
		</div>
	</div>
	{#if linkError}
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
	{:else if link}
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
