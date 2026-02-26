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
	import { accountManager } from '$lib/state/accountManager.svelte';
	import { toast } from 'svelte-sonner';

	let {
		open = $bindable(),
		selectedUsernameForDelete,
		onSuccess
	} = $props<{
		open: boolean;
		selectedUsernameForDelete: string;
		onSuccess?: () => void;
	}>();

	let isDeleting = $state(false);

	const isMobile = new MediaQuery('(max-width: 640px)');
	const useDrawer = $derived(isMobile.current);
	const convex = useConvexClient();

	const isActiveUser = $derived(selectedUsernameForDelete === accountManager.activeUsername);

	const handleDelete = async () => {
		if (isDeleting || !convex) return;

		isDeleting = true;

		try {
			await accountManager.removeAccount(convex, selectedUsernameForDelete);
			toast.success(`Account "${selectedUsernameForDelete}" deleted`);
			onSuccess?.();
			resetForm();
		} catch (error) {
			toast.error('Failed to delete account');
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
				<DrawerTitle>Delete Account</DrawerTitle>
				<DrawerDescription>
					Are you sure you want to delete the account "{selectedUsernameForDelete}"? This will
					permanently delete the account, all its links, and all analytics data. This action cannot
					be undone.
					{#if isActiveUser}
						<span class="mt-2 block font-medium text-destructive"
							>You are currently using this account. Deleting will switch to another account.</span
						>
					{/if}
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
				<DialogTitle>Delete Account</DialogTitle>
				<DialogDescription>
					Are you sure you want to delete the account "{selectedUsernameForDelete}"? This will
					permanently delete the account, all its links, and all analytics data. This action cannot
					be undone.
					{#if isActiveUser}
						<span class="mt-2 block font-medium text-destructive"
							>You are currently using this account. Deleting will switch to another account.</span
						>
					{/if}
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
