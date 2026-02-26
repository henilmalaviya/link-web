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
	import { userManager } from '$lib/state/userManager.svelte';
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

	const isActiveUser = $derived(selectedUsernameForDelete === userManager.activeUsername);

	const handleDelete = async () => {
		if (isDeleting || !convex) return;

		isDeleting = true;

		try {
			await userManager.removeUser(convex, selectedUsernameForDelete);
			toast.success(`User "${selectedUsernameForDelete}" deleted`);
			onSuccess?.();
			resetForm();
		} catch (error) {
			toast.error('Failed to delete user');
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
				<DrawerTitle>Delete User</DrawerTitle>
				<DrawerDescription>
					Are you sure you want to delete the user "{selectedUsernameForDelete}"? This will
					permanently delete the user, all their links, and all analytics data. This action cannot
					be undone.
					{#if isActiveUser}
						<span class="mt-2 block font-medium text-destructive"
							>You are currently using this user. Deleting will switch to another user.</span
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
				<DialogTitle>Delete User</DialogTitle>
				<DialogDescription>
					Are you sure you want to delete the user "{selectedUsernameForDelete}"? This will
					permanently delete the user, all their links, and all analytics data. This action cannot
					be undone.
					{#if isActiveUser}
						<span class="mt-2 block font-medium text-destructive"
							>You are currently using this user. Deleting will switch to another user.</span
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
