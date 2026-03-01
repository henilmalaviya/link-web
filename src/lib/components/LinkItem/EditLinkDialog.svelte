<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog/index.js';
	import {
		Drawer,
		DrawerContent,
		DrawerDescription,
		DrawerFooter,
		DrawerHeader,
		DrawerTitle
	} from '$lib/components/ui/drawer/index.js';
	import { MediaQuery } from 'svelte/reactivity';
	import { useConvexClient } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { toast } from 'svelte-sonner';
	import { getErrorMessage } from '$lib/utils/error.js';
	import { accountManager } from '$lib/state/accountManager.svelte';
	import { globalState } from '$lib/state/global.svelte';
	import { getTagColor, getTagTextColor } from '$lib/utils/tags.js';
	import { X } from '@lucide/svelte';

	let {
		open = $bindable(),
		shortId,
		currentUrl,
		currentTags = [],
		onSuccess
	}: {
		open: boolean;
		shortId: string;
		currentUrl: string;
		currentTags?: string[];
		onSuccess?: () => void;
	} = $props();

	let newUrl = $state('');
	let tags = $state<string[]>([]);
	let tagInput = $state('');
	let errorMessage = $state('');
	let isSubmitting = $state(false);

	const isMobile = new MediaQuery('(max-width: 640px)');
	const useDrawer = $derived(isMobile.current);
	const convex = useConvexClient();

	$effect(() => {
		if (open && currentUrl) {
			newUrl = currentUrl;
			tags = [...currentTags];
		}
	});

	const handleSubmit = async () => {
		if (isSubmitting) return;

		const trimmedUrl = newUrl.trim();

		if (!trimmedUrl) {
			errorMessage = 'URL is required';
			return;
		}

		try {
			new URL(trimmedUrl);
		} catch {
			errorMessage = 'Please enter a valid URL';
			return;
		}

		const auth = accountManager.authArgs;
		if (!auth) {
			errorMessage = 'Not authenticated';
			return;
		}

		isSubmitting = true;
		errorMessage = '';

		try {
			const mutationArgs = {
				shortId,
				username: auth.username,
				token: auth.token
			};

			if (trimmedUrl !== currentUrl) {
				(mutationArgs as { url?: string }).url = trimmedUrl;
			}

			if (JSON.stringify(tags) !== JSON.stringify(currentTags)) {
				(mutationArgs as { tags?: string[] }).tags = tags;
			}

			await convex.mutation(api.links.update, mutationArgs);
			toast.success('Link updated');
			onSuccess?.();
			resetForm();
		} catch (error) {
			errorMessage = getErrorMessage(error, 'Failed to update link');
		} finally {
			isSubmitting = false;
		}
	};

	const resetForm = () => {
		newUrl = '';
		tags = [];
		tagInput = '';
		errorMessage = '';
	};

	const handleOpenChange = (nextOpen: boolean) => {
		open = nextOpen;
		if (!nextOpen) {
			resetForm();
		}
	};
</script>

{#if useDrawer}
	<Drawer {open} onOpenChange={handleOpenChange}>
		<DrawerContent>
			<DrawerHeader class="">
				<DrawerTitle>Edit Link</DrawerTitle>
				<DrawerDescription>Update the destination URL for /{shortId}.</DrawerDescription>
			</DrawerHeader>
			<form
				class="mt-4 grid gap-4 px-4"
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
			>
				<div class="grid gap-2">
					<Label for="edit-url">Destination URL</Label>
					<Input
						id="edit-url"
						type="url"
						placeholder="https://example.com"
						autocomplete="off"
						bind:value={newUrl}
					/>
				</div>
				<div class="grid gap-2">
					<Label for="edit-tags">Tags</Label>
					<div class="flex flex-wrap gap-2 rounded-md border border-input bg-background px-3 py-2">
						{#each tags as tag (tag)}
							<span
								class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
								style="background-color: {getTagColor(tag)}; color: {getTagTextColor(tag)}"
							>
								{tag}
								<button
									type="button"
									class="ml-0.5 inline-flex h-3 w-3 items-center justify-center rounded-full hover:bg-black/10"
									onclick={() => {
										tags = tags.filter((t) => t !== tag);
									}}
								>
									<X class="h-2.5 w-2.5" />
								</button>
							</span>
						{/each}
						<input
							id="edit-tags"
							class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
							placeholder={tags.length === 0 ? 'Add tags (press Enter or Space)' : ''}
							bind:value={tagInput}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									const trimmed = tagInput.trim().toLowerCase();
									const validTag = trimmed.replace(/[^a-z0-9_\-/]/g, '');
									if (validTag && !tags.includes(validTag)) {
										tags = [...tags, validTag];
									}
									tagInput = '';
								} else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
									tags = tags.slice(0, -1);
								}
							}}
						/>
					</div>
				</div>
				{#if errorMessage}
					<p class="text-sm text-destructive">{errorMessage}</p>
				{/if}
				<DrawerFooter class="">
					<Button
						type="button"
						variant="outline"
						onclick={() => handleOpenChange(false)}
						disabled={isSubmitting}
					>
						Cancel
					</Button>
					<Button type="submit" disabled={isSubmitting || !newUrl.trim()}>
						{isSubmitting ? 'Saving...' : 'Save'}
					</Button>
				</DrawerFooter>
			</form>
		</DrawerContent>
	</Drawer>
{:else}
	<Dialog {open} onOpenChange={handleOpenChange}>
		<DialogContent>
			<DialogHeader class="">
				<DialogTitle>Edit Link</DialogTitle>
				<DialogDescription>Update the destination URL for /{shortId}.</DialogDescription>
			</DialogHeader>
			<form
				class="grid gap-4"
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
			>
				<div class="grid gap-2">
					<Label for="edit-url-dialog">Destination URL</Label>
					<Input
						id="edit-url-dialog"
						type="url"
						placeholder="https://example.com"
						autocomplete="off"
						bind:value={newUrl}
					/>
				</div>
				<div class="grid gap-2">
					<Label for="edit-tags-dialog">Tags</Label>
					<div class="flex flex-wrap gap-2 rounded-md border border-input bg-background px-3 py-2">
						{#each tags as tag (tag)}
							<span
								class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
								style="background-color: {getTagColor(tag)}; color: {getTagTextColor(tag)}"
							>
								{tag}
								<button
									type="button"
									class="ml-0.5 inline-flex h-3 w-3 items-center justify-center rounded-full hover:bg-black/10"
									onclick={() => {
										tags = tags.filter((t) => t !== tag);
									}}
								>
									<X class="h-2.5 w-2.5" />
								</button>
							</span>
						{/each}
						<input
							id="edit-tags-dialog"
							class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
							placeholder={tags.length === 0 ? 'Add tags (press Enter or Space)' : ''}
							bind:value={tagInput}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									const trimmed = tagInput.trim().toLowerCase();
									const validTag = trimmed.replace(/[^a-z0-9_\-/]/g, '');
									if (validTag && !tags.includes(validTag)) {
										tags = [...tags, validTag];
									}
									tagInput = '';
								} else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
									tags = tags.slice(0, -1);
								}
							}}
						/>
					</div>
				</div>
				{#if errorMessage}
					<p class="text-sm text-destructive">{errorMessage}</p>
				{/if}
				<DialogFooter class="">
					<Button
						type="button"
						variant="outline"
						onclick={() => handleOpenChange(false)}
						disabled={isSubmitting}
					>
						Cancel
					</Button>
					<Button type="submit" disabled={isSubmitting || !newUrl.trim()}>
						{isSubmitting ? 'Saving...' : 'Save'}
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}
