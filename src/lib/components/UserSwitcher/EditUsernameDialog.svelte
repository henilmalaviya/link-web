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
	import { userManager } from '$lib/state/userManager.svelte';
	import { toast } from 'svelte-sonner';
	import { getErrorMessage } from '$lib/utils/error.js';

	let {
		open = $bindable(),
		selectedUsernameForEdit,
		onSuccess
	} = $props<{
		open: boolean;
		selectedUsernameForEdit: string;
		onSuccess?: () => void;
	}>();

	let newUsername = $state('');
	let errorMessage = $state('');
	let isSubmitting = $state(false);

	const isMobile = new MediaQuery('(max-width: 640px)');
	const useDrawer = $derived(isMobile.current);
	const convex = useConvexClient();

	$effect(() => {
		if (open && selectedUsernameForEdit) {
			newUsername = selectedUsernameForEdit;
		}
	});

	const handleSubmit = async () => {
		if (isSubmitting) return;

		const trimmedUsername = newUsername.trim();

		if (!trimmedUsername) {
			errorMessage = 'Username is required';
			return;
		}

		if (trimmedUsername === selectedUsernameForEdit) {
			open = false;
			return;
		}

		isSubmitting = true;
		errorMessage = '';

		try {
			await userManager.updateUsername(convex, selectedUsernameForEdit, trimmedUsername);
			toast.success(`Username changed to "${trimmedUsername}"`);
			onSuccess?.();
			resetForm();
		} catch (error) {
			errorMessage = getErrorMessage(error, 'Failed to update username');
		} finally {
			isSubmitting = false;
		}
	};

	const resetForm = () => {
		newUsername = '';
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
				<DrawerTitle>Edit Username</DrawerTitle>
				<DrawerDescription>Change the username for this account.</DrawerDescription>
			</DrawerHeader>
			<form
				class="mt-4 grid gap-4 px-4"
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
			>
				<div class="grid gap-2">
					<Label for="edit-username">New Username</Label>
					<Input
						id="edit-username"
						placeholder="Enter new username"
						autocomplete="off"
						bind:value={newUsername}
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
					<Button type="submit" disabled={isSubmitting || !newUsername.trim()}>
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
				<DialogTitle>Edit Username</DialogTitle>
				<DialogDescription>Change the username for this account.</DialogDescription>
			</DialogHeader>
			<form
				class="grid gap-4"
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
			>
				<div class="grid gap-2">
					<Label for="edit-username">New Username</Label>
					<Input
						id="edit-username"
						placeholder="Enter new username"
						autocomplete="off"
						bind:value={newUsername}
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
					<Button type="submit" disabled={isSubmitting || !newUsername.trim()}>
						{isSubmitting ? 'Saving...' : 'Save'}
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}
