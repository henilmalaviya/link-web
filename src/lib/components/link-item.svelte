<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Copy, Pencil, Trash2, ExternalLink } from '@lucide/svelte';
	import StatsChart from './stats-chart.svelte';
	import { cn } from '$lib/utils';

	interface Link {
		_id: string;
		url: string;
		shortId: string;
		createdAt: number;
		redirectCount: number;
		stats: StatPoint[];
	}

	interface StatPoint {
		date: string;
		count: number;
	}

	interface Props {
		link: Link;
		stats?: StatPoint[];
		baseUrl?: string;
		onEdit: (link: Link) => void;
		onDelete: (link: Link) => void;
		class?: string;
	}

	let {
		link,
		stats = [],
		baseUrl = 'https://lnk.to',
		onEdit,
		onDelete,
		class: className
	}: Props = $props();

	let copied = $state(false);

	const shortUrl = $derived(`${baseUrl}/${link.shortId}`);

	const formattedDate = $derived(
		new Date(link.createdAt).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		})
	);

	const totalClicks = $derived(stats.reduce((sum, s) => sum + s.count, 0));

	function truncateUrl(url: string, maxLength = 50): string {
		if (url.length <= maxLength) return url;
		return url.slice(0, maxLength) + '...';
	}

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(shortUrl);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 1500);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	function handleEdit() {
		onEdit(link);
	}

	function handleDelete() {
		onDelete(link);
	}
</script>

<div class={cn('border-b border-border py-4 first:border-t', className)}>
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<!-- Link info -->
		<div class="flex min-w-0 flex-1 flex-col gap-1">
			<div class="flex items-center gap-2">
				<a
					href={shortUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="font-medium text-primary hover:underline"
				>
					{link.shortId}
				</a>
				<ExternalLink class="size-3.5 shrink-0 text-muted-foreground" />
			</div>
			<a
				href={link.url}
				target="_blank"
				rel="noopener noreferrer"
				class="truncate text-sm text-muted-foreground transition-colors hover:text-foreground"
				title={link.url}
			>
				{truncateUrl(link.url)}
			</a>
		</div>

		<!-- Stats & meta -->
		<div class="flex items-center gap-4 sm:gap-6">
			<!-- Mini chart -->
			{#if stats.length > 0}
				<div class="flex items-center gap-2">
					<StatsChart data={stats} />
					<span class="text-xs text-muted-foreground" title="Last 7 days">
						{totalClicks} click{totalClicks !== 1 ? 's' : ''}
					</span>
				</div>
			{:else}
				<span class="text-xs text-muted-foreground">No clicks yet</span>
			{/if}

			<!-- Date -->
			<span class="hidden text-xs text-muted-foreground sm:block">{formattedDate}</span>

			<!-- Actions -->
			<div class="flex items-center gap-1">
				<Button
					variant="ghost"
					size="icon-sm"
					onclick={copyToClipboard}
					title="Copy short URL"
					class="relative"
				>
					{#if copied}
						<span class="text-green-500">✓</span>
					{:else}
						<Copy class="size-4" />
					{/if}
				</Button>
				<Button variant="ghost" size="icon-sm" onclick={handleEdit} title="Edit link">
					<Pencil class="size-4" />
				</Button>
				<Button
					variant="ghost"
					size="icon-sm"
					onclick={handleDelete}
					title="Delete link"
					class="hover:bg-destructive/10 hover:text-destructive"
				>
					<Trash2 class="size-4" />
				</Button>
			</div>
		</div>
	</div>
</div>
