<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Copy, Share2, Check } from '@lucide/svelte';
	import { cn } from '$lib/utils';

	interface Props {
		shortId: string;
		baseUrl?: string;
		class?: string;
	}

	let { shortId, baseUrl = 'https://lnk.to', class: className }: Props = $props();

	let copied = $state(false);
	let shareError = $state(false);

	const shortUrl = $derived(`${baseUrl}/${shortId}`);

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(shortUrl);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	async function shareLink() {
		shareError = false;

		if (navigator.share) {
			try {
				await navigator.share({
					title: 'Short link',
					url: shortUrl
				});
			} catch (err) {
				// User cancelled or share failed, fall back to copy
				if ((err as Error).name !== 'AbortError') {
					await copyToClipboard();
				}
			}
		} else {
			// Web Share API not supported, fall back to copy
			await copyToClipboard();
		}
	}
</script>

<div class={cn('flex flex-col gap-4', className)}>
	<div class="flex flex-col gap-2">
		<span class="text-xs tracking-wide text-muted-foreground uppercase">Your short link</span>
		<div
			class="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-4 py-3"
		>
			<code class="text-lg font-medium break-all text-primary">{shortUrl}</code>
		</div>
	</div>

	<div class="flex flex-wrap gap-2">
		<Button variant="outline" size="sm" onclick={copyToClipboard} class="gap-2">
			{#if copied}
				<Check class="size-4 text-green-500" />
				Copied!
			{:else}
				<Copy class="size-4" />
				Copy
			{/if}
		</Button>

		<Button variant="outline" size="sm" onclick={shareLink} class="gap-2">
			<Share2 class="size-4" />
			Share
		</Button>
	</div>
</div>
