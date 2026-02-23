<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Loader2, Link as LinkIcon } from '@lucide/svelte';
	import { cn } from '$lib/utils';

	interface Props {
		onSubmit: (url: string, shortId?: string) => Promise<void> | void;
		initialUrl?: string;
		initialShortId?: string;
		isEditing?: boolean;
		class?: string;
	}

	let {
		onSubmit,
		initialUrl = '',
		initialShortId = '',
		isEditing = false,
		class: className
	}: Props = $props();

	// Initialize with defaults, sync initial values once on mount
	let url = $state('');
	let shortId = $state('');
	let isLoading = $state(false);
	let urlError = $state('');
	let initialized = $state(false);

	// Sync initial values once
	$effect(() => {
		if (!initialized) {
			url = initialUrl;
			shortId = initialShortId;
			initialized = true;
		}
	});

	function validateUrl(value: string): boolean {
		if (!value.trim()) {
			urlError = 'URL is required';
			return false;
		}
		try {
			new URL(value);
			urlError = '';
			return true;
		} catch {
			urlError = 'Please enter a valid URL';
			return false;
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();

		if (!validateUrl(url)) return;

		isLoading = true;
		try {
			await onSubmit(url.trim(), shortId.trim() || undefined);
		} finally {
			isLoading = false;
		}
	}

	function handleUrlBlur() {
		if (url) {
			validateUrl(url);
		}
	}
</script>

<form {...{ onsubmit: handleSubmit }} class={cn('flex flex-col gap-4', className)}>
	<div class="flex flex-col gap-2">
		<Label for="url" class="text-sm font-medium">
			URL <span class="text-destructive">*</span>
		</Label>
		<div class="relative">
			<LinkIcon
				class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
			/>
			<Input
				id="url"
				type="url"
				placeholder="https://example.com/your-long-url"
				bind:value={url}
				onblur={handleUrlBlur}
				aria-invalid={!!urlError}
				class="pl-10"
				disabled={isLoading}
			/>
		</div>
		{#if urlError}
			<p class="text-xs text-destructive">{urlError}</p>
		{/if}
	</div>

	<div class="flex flex-col gap-2">
		<Label for="shortId" class="text-sm font-medium">
			Custom short ID
			<span class="font-normal text-muted-foreground">(optional)</span>
		</Label>
		<Input
			id="shortId"
			type="text"
			placeholder="my-custom-link"
			bind:value={shortId}
			disabled={isLoading}
			maxlength={50}
		/>
		<p class="text-xs text-muted-foreground">
			Leave empty to auto-generate a short ID. Use letters, numbers, and hyphens only.
		</p>
	</div>

	<Button type="submit" disabled={isLoading || !url.trim()} class="w-full sm:w-auto">
		{#if isLoading}
			<Loader2 class="size-4 animate-spin" />
			{isEditing ? 'Saving...' : 'Creating...'}
		{:else}
			{isEditing ? 'Save changes' : 'Create short link'}
		{/if}
	</Button>
</form>
