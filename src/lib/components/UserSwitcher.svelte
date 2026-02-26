<script lang="ts">
	import { type Snippet } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle,
		DialogTrigger
	} from '$lib/components/ui/dialog/index.js';
	import {
		Drawer,
		DrawerContent,
		DrawerDescription,
		DrawerHeader,
		DrawerTitle,
		DrawerTrigger
	} from '$lib/components/ui/drawer/index.js';
	import { MediaQuery } from 'svelte/reactivity';
	import { User, Loader } from '@lucide/svelte';
	import { userManager, type UserAccount } from '$lib/state/userManager.svelte';
	import CreateUserDialog from './UserSwitcher/CreateUserDialog.svelte';
	import ImportUserDialog from './UserSwitcher/ImportUserDialog.svelte';
	import ExportUserDialog from './UserSwitcher/ExportUserDialog.svelte';
	import EditUsernameDialog from './UserSwitcher/EditUsernameDialog.svelte';
	import DeleteConfirmDialog from './UserSwitcher/DeleteConfirmDialog.svelte';

	let {
		open = $bindable(false),
		triggerCreateDialog = $bindable(false),
		disabled = $bindable(false),
		children
	}: {
		open?: boolean;
		triggerCreateDialog?: boolean;
		disabled?: boolean;
		children?: Snippet;
	} = $props();

	let isMobile = new MediaQuery('(max-width: 640px)');
	const useDrawer = $derived(isMobile.current);

	let createDialogOpen = $state(false);
	let importDialogOpen = $state(false);
	let exportDialogOpen = $state(false);
	let editDialogOpen = $state(false);
	let deleteDialogOpen = $state(false);

	let selectedUsernameForEdit = $state('');
	let selectedUsernameForDelete = $state('');
	let selectedUsernameForExport = $state('');

	$effect(() => {
		if (triggerCreateDialog) {
			createDialogOpen = true;
			triggerCreateDialog = false;
		}
	});

	const setOpen = (nextOpen: boolean) => {
		open = nextOpen;
	};

	const handleSelectUser = async (username: string) => {
		await userManager.switchToUser(username);
		setOpen(false);
	};

	const handleEdit = (username: string) => {
		selectedUsernameForEdit = username;
		editDialogOpen = true;
	};

	const handleDelete = (username: string) => {
		selectedUsernameForDelete = username;
		deleteDialogOpen = true;
	};

	const handleExport = (username: string) => {
		selectedUsernameForExport = username;
		exportDialogOpen = true;
	};

	const handleUserCreated = () => {
		createDialogOpen = false;
		setOpen(false);
	};

	const handleUserImported = () => {
		importDialogOpen = false;
		setOpen(false);
	};

	const handleUserEdited = () => {
		editDialogOpen = false;
	};

	const handleUserDeleted = () => {
		deleteDialogOpen = false;
		setOpen(false);
	};
</script>

{#snippet triggerContent()}
	{#if children}
		{@render children?.()}
	{/if}
{/snippet}

{#snippet userList()}
	<div class="flex flex-col gap-1">
		{#each userManager.users as user (user.username)}
			<div
				class="flex items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-muted/50 {user.username ===
				userManager.activeUsername
					? 'bg-muted'
					: ''}"
			>
				<button
					class="flex flex-1 items-center gap-2 text-left"
					onclick={() => handleSelectUser(user.username)}
				>
					{#if user.username === userManager.activeUsername}
						<span class="flex h-2 w-2 rounded-full bg-primary"></span>
					{:else}
						<span class="h-2 w-2 rounded-full border"></span>
					{/if}
					<span class="truncate">{user.username}</span>
				</button>
				<div class="flex items-center gap-1">
					<button
						class="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						title="Edit username"
						onclick={() => handleEdit(user.username)}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
							<path d="m15 5 4 4"></path>
						</svg>
					</button>
					<button
						class="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
						title="Delete user"
						onclick={() => handleDelete(user.username)}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M3 6h18"></path>
							<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
							<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
							<line x1="10" x2="10" y1="11" y2="17"></line>
							<line x1="14" x2="14" y1="11" y2="17"></line>
						</svg>
					</button>
				</div>
			</div>
		{:else}
			<p class="px-3 py-4 text-center text-sm text-muted-foreground">No users yet</p>
		{/each}
	</div>
{/snippet}

{#snippet actionButtons()}
	<div class="flex flex-col gap-2">
		<Button
			variant="outline"
			class="w-full justify-start"
			onclick={() => (createDialogOpen = true)}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="mr-2"
			>
				<path d="M5 12h14"></path>
				<path d="M12 5v14"></path>
			</svg>
			Create New User
		</Button>
		<Button
			variant="outline"
			class="w-full justify-start"
			onclick={() => (importDialogOpen = true)}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="mr-2"
			>
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
				<polyline points="7 10 12 15 17 10"></polyline>
				<line x1="12" x2="12" y1="15" y2="3"></line>
			</svg>
			Import User
		</Button>
		<Button
			variant="outline"
			class="w-full justify-start"
			disabled={!userManager.activeAccount}
			onclick={() => handleExport(userManager.activeUsername!)}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="mr-2"
			>
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
				<polyline points="17 8 12 3 7 8"></polyline>
				<line x1="12" x2="12" y1="3" y2="15"></line>
			</svg>
			Export User
		</Button>
	</div>
{/snippet}

{#if useDrawer}
	<Drawer bind:open>
		<DrawerTrigger>{@render triggerContent()}</DrawerTrigger>
		<DrawerContent>
			<DrawerHeader class="">
				<DrawerTitle>Manage Users</DrawerTitle>
				<DrawerDescription>Switch between users or manage your accounts.</DrawerDescription>
			</DrawerHeader>
			<div class="mt-4 grid gap-4 px-4">
				{@render userList()}
				<Separator />
				{@render actionButtons()}
			</div>
			<div class="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"></div>
		</DrawerContent>
	</Drawer>
{:else}
	<Dialog bind:open>
		<DialogTrigger>{@render triggerContent()}</DialogTrigger>
		<DialogContent>
			<DialogHeader class="">
				<DialogTitle>Manage Users</DialogTitle>
				<DialogDescription>Switch between users or manage your accounts.</DialogDescription>
			</DialogHeader>
			<div class="grid gap-4">
				{@render userList()}
				<Separator />
				{@render actionButtons()}
			</div>
		</DialogContent>
	</Dialog>
{/if}

<CreateUserDialog bind:open={createDialogOpen} onSuccess={handleUserCreated} />
<ImportUserDialog bind:open={importDialogOpen} onSuccess={handleUserImported} />
{#if selectedUsernameForExport}
	<ExportUserDialog bind:open={exportDialogOpen} username={selectedUsernameForExport} />
{/if}
{#if selectedUsernameForEdit}
	<EditUsernameDialog
		bind:open={editDialogOpen}
		{selectedUsernameForEdit}
		onSuccess={handleUserEdited}
	/>
{/if}
{#if selectedUsernameForDelete}
	<DeleteConfirmDialog
		bind:open={deleteDialogOpen}
		{selectedUsernameForDelete}
		onSuccess={handleUserDeleted}
	/>
{/if}
