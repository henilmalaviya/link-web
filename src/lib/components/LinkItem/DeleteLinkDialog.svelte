<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
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

	let {
		open = $bindable(),
		shortId,
		url,
		onSuccess
	}: {
		open: boolean;
		shortId: string;
		url: string;
		onSuccess?: () => void;
	} = $props();

	let isDeleting = $state(false);

	const isMobile = new MediaQuery('(max-width: 640px)');
	const useDrawer = $derived(isMobile.current);
	const convex = useConvexClient();

	const handleDelete = async () => {
		if (isDeleting || !convex) return;

		const auth = accountManager.authArgs;
		if (!auth) {
			toast.error('Not authenticated');
			return;
		}

		isDeleting = true;

		try {
			await convex.mutation(api.links.deleteLink, { ...auth, shortId });
			toast.success(`Link "/${shortId}" deleted`);
			onSuccess?.();
			resetForm();
		} catch (error) {
			toast.error(getErrorMessage(error, 'Failed to delete link'));
		} finally {
			isDeleting = false;
		}
	};

	const resetForm = () => {
		isDeleting = false;
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
				<DrawerTitle>Delete Link</DrawerTitle>
				<DrawerDescription>
					Are you sure you want to delete the link "/{shortId}"? This will permanently delete the
					link and all its analytics data. This action cannot be undone.
				</DrawerDescription>
			</DrawerHeader>
			<DrawerFooter class="">
				<Button
					type="button"
					variant="outline"
					onclick={() => handleOpenChange(false)}
					disabled={isDeleting}
				>
					Cancel
				</Button>
				<Button type="button" variant="destructive" onclick={handleDelete} disabled={isDeleting}>
					{isDeleting ? 'Deleting...' : 'Delete'}
				</Button>
			</DrawerFooter>
		</DrawerContent>
	</Drawer>
{:else}
	<Dialog {open} onOpenChange={handleOpenChange}>
		<DialogContent>
			<DialogHeader class="">
				<DialogTitle>Delete Link</DialogTitle>
				<DialogDescription>
					Are you sure you want to delete the link "/{shortId}"? This will permanently delete the
					link and all its analytics data. This action cannot be undone.
				</DialogDescription>
			</DialogHeader>
			<DialogFooter class="">
				<Button
					type="button"
					variant="outline"
					onclick={() => handleOpenChange(false)}
					disabled={isDeleting}
				>
					Cancel
				</Button>
				<Button type="button" variant="destructive" onclick={handleDelete} disabled={isDeleting}>
					{isDeleting ? 'Deleting...' : 'Delete'}
				</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
{/if}
