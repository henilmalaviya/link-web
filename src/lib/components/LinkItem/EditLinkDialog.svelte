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
	import { userManager } from '$lib/state/userManager.svelte';
	import { globalState } from '$lib/state/global.svelte';

	let {
		open = $bindable(),
		shortId,
		currentUrl,
		onSuccess
	}: {
		open: boolean;
		shortId: string;
		currentUrl: string;
		onSuccess?: () => void;
	} = $props();

	let newUrl = $state('');
	let errorMessage = $state('');
	let isSubmitting = $state(false);

	const isMobile = new MediaQuery('(max-width: 640px)');
	const useDrawer = $derived(isMobile.current);
	const convex = useConvexClient();

	$effect(() => {
		if (open && currentUrl) {
			newUrl = currentUrl;
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

		if (trimmedUrl === currentUrl) {
			open = false;
			return;
		}

		const auth = userManager.authArgs;
		if (!auth) {
			errorMessage = 'Not authenticated';
			return;
		}

		isSubmitting = true;
		errorMessage = '';

		try {
			await convex.mutation(api.links.update, { ...auth, shortId, url: trimmedUrl });
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
					<Label for="edit-url">Destination URL</Label>
					<Input
						id="edit-url"
						type="url"
						placeholder="https://example.com"
						autocomplete="off"
						bind:value={newUrl}
					/>
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
