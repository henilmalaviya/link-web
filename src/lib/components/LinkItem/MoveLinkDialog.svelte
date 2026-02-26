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

	let isMoving = $state(false);
	let selectedUsername = $state<string | null>(null);

	const isMobile = new MediaQuery('(max-width: 640px)');
	const useDrawer = $derived(isMobile.current);
	const convex = useConvexClient();

	const availableAccounts = $derived(
		accountManager.accounts.filter((a) => a.username !== accountManager.activeUsername)
	);

	const handleMove = async () => {
		if (isMoving || !selectedUsername || !convex) return;

		const targetAccount = accountManager.accounts.find((a) => a.username === selectedUsername);
		if (!targetAccount) {
			toast.error('Please select an account');
			return;
		}

		const auth = accountManager.authArgs;
		if (!auth) {
			toast.error('Not authenticated');
			return;
		}

		isMoving = true;

		try {
			await convex.mutation(api.links.moveLink, {
				...auth,
				shortId,
				targetUsername: targetAccount.username,
				targetToken: targetAccount.token
			});
			toast.success(`Link "/${shortId}" moved to @${targetAccount.username}`);
			onSuccess?.();
			resetForm();
		} catch (error) {
			toast.error(getErrorMessage(error, 'Failed to move link'));
		} finally {
			isMoving = false;
		}
	};

	const resetForm = () => {
		selectedUsername = null;
		isMoving = false;
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
				<DrawerTitle>Move Link</DrawerTitle>
				<DrawerDescription>
					Select an account to move "/{shortId}" to.
				</DrawerDescription>
			</DrawerHeader>
			<DrawerFooter class="">
				{#if availableAccounts.length === 0}
					<p class="py-4 text-center text-sm text-muted-foreground">
						No other accounts available. Create another account to move links.
					</p>
				{:else}
					<div class="flex flex-col gap-2 px-4">
						{#each availableAccounts as account}
							<button
								type="button"
								class="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent
									{selectedUsername === account.username ? 'border-primary bg-accent' : 'border-input'}"
								onclick={() => (selectedUsername = account.username)}
							>
								<div
									class="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
								>
									{account.username.charAt(0).toUpperCase()}
								</div>
								<div class="flex-1">
									<p class="text-sm font-medium">@{account.username}</p>
								</div>
								{#if selectedUsername === account.username}
									<div class="h-4 w-4 rounded-full border-2 border-primary"></div>
								{/if}
							</button>
						{/each}
					</div>
				{/if}
				<Button
					type="button"
					variant="outline"
					onclick={() => handleOpenChange(false)}
					disabled={isMoving}
				>
					Cancel
				</Button>
				<Button type="button" onclick={handleMove} disabled={isMoving || !selectedUsername}>
					{isMoving ? 'Moving...' : 'Move'}
				</Button>
			</DrawerFooter>
		</DrawerContent>
	</Drawer>
{:else}
	<Dialog {open} onOpenChange={handleOpenChange}>
		<DialogContent>
			<DialogHeader class="">
				<DialogTitle>Move Link</DialogTitle>
				<DialogDescription>
					Select an account to move "/{shortId}" to.
				</DialogDescription>
			</DialogHeader>
			{#if availableAccounts.length === 0}
				<p class="py-4 text-center text-sm text-muted-foreground">
					No other accounts available. Create another account to move links.
				</p>
			{:else}
				<div class="flex flex-col gap-2 py-2">
					{#each availableAccounts as account}
						<button
							type="button"
							class="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent
								{selectedUsername === account.username ? 'border-primary bg-accent' : 'border-input'}"
							onclick={() => (selectedUsername = account.username)}
						>
							<div
								class="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
							>
								{account.username.charAt(0).toUpperCase()}
							</div>
							<div class="flex-1">
								<p class="text-sm font-medium">@{account.username}</p>
							</div>
							{#if selectedUsername === account.username}
								<div class="h-4 w-4 rounded-full border-2 border-primary"></div>
							{/if}
						</button>
					{/each}
				</div>
			{/if}
			<DialogFooter class="">
				<Button
					type="button"
					variant="outline"
					onclick={() => handleOpenChange(false)}
					disabled={isMoving}
				>
					Cancel
				</Button>
				<Button type="button" onclick={handleMove} disabled={isMoving || !selectedUsername}>
					{isMoving ? 'Moving...' : 'Move'}
				</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
{/if}
