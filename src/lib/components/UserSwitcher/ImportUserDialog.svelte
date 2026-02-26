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

	let { open = $bindable(), onSuccess } = $props<{
		open: boolean;
		onSuccess?: () => void;
	}>();

	let username = $state('');
	let token = $state('');
	let errorMessage = $state('');
	let isSubmitting = $state(false);

	const isMobile = new MediaQuery('(max-width: 640px)');
	const useDrawer = $derived(isMobile.current);
	const convex = useConvexClient();

	const handleSubmit = async () => {
		if (isSubmitting) return;

		const trimmedUsername = username.trim();
		const trimmedToken = token.trim();

		if (!trimmedUsername) {
			errorMessage = 'Username is required';
			return;
		}
		if (!trimmedToken) {
			errorMessage = 'Token is required';
			return;
		}

		isSubmitting = true;
		errorMessage = '';

		try {
			await userManager.addExistingUser(convex, trimmedUsername, trimmedToken);
			toast.success(`User "${trimmedUsername}" imported`);
			onSuccess?.();
			resetForm();
		} catch (error) {
			errorMessage = getErrorMessage(
				error,
				'Failed to import user. Check your username and token.'
			);
		} finally {
			isSubmitting = false;
		}
	};

	const resetForm = () => {
		username = '';
		token = '';
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
				<DrawerTitle>Import User</DrawerTitle>
				<DrawerDescription
					>Enter your username and token to import an existing user.</DrawerDescription
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
					<Label for="import-user-username">Username</Label>
					<Input
						id="import-user-username"
						placeholder="Enter username"
						autocomplete="off"
						bind:value={username}
					/>
				</div>
				<div class="grid gap-2">
					<Label for="import-user-token">Token</Label>
					<Input
						id="import-user-token"
						type="password"
						placeholder="Enter token"
						autocomplete="off"
						bind:value={token}
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
						{isSubmitting ? 'Importing...' : 'Import User'}
					</Button>
				</DrawerFooter>
			</form>
		</DrawerContent>
	</Drawer>
{:else}
	<Dialog {open} onOpenChange={handleOpenChange}>
		<DialogContent>
			<DialogHeader class="">
				<DialogTitle>Import User</DialogTitle>
				<DialogDescription
					>Enter your username and token to import an existing user.</DialogDescription
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
					<Label for="import-user-username">Username</Label>
					<Input
						id="import-user-username"
						placeholder="Enter username"
						autocomplete="off"
						bind:value={username}
					/>
				</div>
				<div class="grid gap-2">
					<Label for="import-user-token">Token</Label>
					<Input
						id="import-user-token"
						type="password"
						placeholder="Enter token"
						autocomplete="off"
						bind:value={token}
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
						{isSubmitting ? 'Importing...' : 'Import User'}
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}
