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
		DrawerHeader,
		DrawerTitle
	} from '$lib/components/ui/drawer/index.js';
	import { MediaQuery } from 'svelte/reactivity';
	import { accountManager } from '$lib/state/accountManager.svelte';
	import CopyButton from '$lib/components/ui/copy-button.svelte';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';

	let { open = $bindable(), username } = $props<{
		open: boolean;
		username: string;
	}>();

	let showToken = $state(false);

	const isMobile = new MediaQuery('$(max-width: 640px)');
	const useDrawer = $derived(isMobile.current);

	const userAccount = $derived(accountManager.accounts.find((u) => u.username === username));
	const token = $derived(userAccount?.token ?? '');

	const toggleShowToken = () => {
		showToken = !showToken;
	};

	const handleOpenChange = (nextOpen: boolean) => {
		open = nextOpen;
		if (!nextOpen) {
			showToken = false;
		}
	};
</script>

{#if useDrawer}
	<Drawer {open} onOpenChange={handleOpenChange}>
		<DrawerContent>
			<DrawerHeader class="">
				<DrawerTitle>Share Account</DrawerTitle>
				<DrawerDescription
					>Copy your username and token to import this account elsewhere.</DrawerDescription
				>
			</DrawerHeader>
			<div class="mt-4 grid gap-4 px-4">
				<div class="grid gap-2">
					<Label for="export-username">Username</Label>
					<div class="flex gap-2">
						<Input id="export-username" value={username} readonly class="flex-1" />
						<CopyButton text={username} variant="outline" size="icon" />
					</div>
				</div>
				<div class="grid gap-2">
					<Label for="export-token">Token</Label>
					<div class="flex gap-2">
						<Input
							id="export-token"
							type={showToken ? 'text' : 'password'}
							value={token}
							readonly
							class="flex-1"
						/>
						<Button type="button" variant="outline" size="icon" onclick={toggleShowToken}>
							{#if showToken}
								<EyeOff class="h-4 w-4" />
							{:else}
								<Eye class="h-4 w-4" />
							{/if}
						</Button>
						<CopyButton text={token} variant="outline" size="icon" />
					</div>
				</div>
			</div>
			<div class="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"></div>
		</DrawerContent>
	</Drawer>
{:else}
	<Dialog {open} onOpenChange={handleOpenChange}>
		<DialogContent>
			<DialogHeader class="">
				<DialogTitle>Share Account</DialogTitle>
				<DialogDescription
					>Copy your username and token to import this account elsewhere.</DialogDescription
				>
			</DialogHeader>
			<div class="grid gap-4">
				<div class="grid gap-2">
					<Label for="export-username">Username</Label>
					<div class="flex gap-2">
						<Input id="export-username" value={username} readonly class="flex-1" />
						<CopyButton text={username} variant="outline" size="icon" />
					</div>
				</div>
				<div class="grid gap-2">
					<Label for="export-token">Token</Label>
					<div class="flex gap-2">
						<Input
							id="export-token"
							type={showToken ? 'text' : 'password'}
							value={token}
							readonly
							class="flex-1"
						/>
						<Button type="button" variant="outline" size="icon" onclick={toggleShowToken}>
							{#if showToken}
								<EyeOff class="h-4 w-4" />
							{:else}
								<Eye class="h-4 w-4" />
							{/if}
						</Button>
						<CopyButton text={token} variant="outline" size="icon" />
					</div>
				</div>
			</div>
		</DialogContent>
	</Dialog>
{/if}
