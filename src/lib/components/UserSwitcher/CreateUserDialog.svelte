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
	import { generateRandomUsername } from '$lib/utils/username';

	let { open = $bindable(), onSuccess } = $props<{
		open: boolean;
		onSuccess?: () => void;
	}>();

	let username = $state('');
	let errorMessage = $state('');
	let isSubmitting = $state(false);

	const isMobile = new MediaQuery('(max-width: 640px)');
	const useDrawer = $derived(isMobile.current);
	const convex = useConvexClient();

	const handleSubmit = async () => {
		if (isSubmitting) return;

		isSubmitting = true;
		errorMessage = '';

		try {
			const finalUsername = username.trim() || generateRandomUsername();
			await userManager.createNewUser(convex, finalUsername);
			toast.success(`User "${finalUsername}" created`);
			onSuccess?.();
			resetForm();
		} catch (error) {
			errorMessage = getErrorMessage(error, 'Failed to create user');
		} finally {
			isSubmitting = false;
		}
	};

	const resetForm = () => {
		username = '';
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
				<DrawerTitle>Create New User</DrawerTitle>
				<DrawerDescription
					>Create a new user account. Leave empty for a random username.</DrawerDescription
				>
			</DrawerHeader>
			<form
				class="mt-4 grid gap-4 px-4"
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
			>
				<div class="grid gap-2">
					<Label for="create-user-username">Username</Label>
					<Input
						id="create-user-username"
						placeholder="Optional (auto-generated if empty)"
						autocomplete="off"
						bind:value={username}
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
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? 'Creating...' : 'Create User'}
					</Button>
				</DrawerFooter>
			</form>
		</DrawerContent>
	</Drawer>
{:else}
	<Dialog {open} onOpenChange={handleOpenChange}>
		<DialogContent>
			<DialogHeader class="">
				<DialogTitle>Create New User</DialogTitle>
				<DialogDescription
					>Create a new user account. Leave empty for a random username.</DialogDescription
				>
			</DialogHeader>
			<form
				class="grid gap-4"
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
			>
				<div class="grid gap-2">
					<Label for="create-user-username">Username</Label>
					<Input
						id="create-user-username"
						placeholder="Optional (auto-generated if empty)"
						autocomplete="off"
						bind:value={username}
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
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? 'Creating...' : 'Create User'}
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}
