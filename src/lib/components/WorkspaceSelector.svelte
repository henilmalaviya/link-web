<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '$lib/components/ui/drawer';
	import { isHydrated, user, type Workspace } from '$lib/stores/global.svelte.js';
	import CreateWorkspace from './CreateWorkspace.svelte';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import CheckIcon from '@lucide/svelte/icons/check';
	import LoaderIcon from '@lucide/svelte/icons/loader-2';

	let {
		value = $bindable<string | null>(undefined),
		disabled = false
	}: {
		value?: string | null;
		disabled?: boolean;
	} = $props();

	const isDesktop = new MediaQuery('(min-width: 768px)');
	let dropdownOpen = $state(false);
	let drawerOpen = $state(false);
	let createOpen = $state(false);

	const selectedValue = $derived(value !== undefined ? value : user.currentWorkspaceName.current);

	function selectWorkspace(name: string | null) {
		if (value !== undefined) {
			value = name;
		} else {
			user.setCurrentWorkspace(name);
		}
		dropdownOpen = false;
		drawerOpen = false;
	}

	function openSelector() {
		if (isDesktop.current) {
			dropdownOpen = true;
		} else {
			drawerOpen = true;
		}
	}

	function openCreateWorkspace() {
		dropdownOpen = false;
		drawerOpen = false;
		createOpen = true;
	}
</script>

{#snippet triggerLabel()}
	{#if !isHydrated.current}
		<LoaderIcon class="size-4 animate-spin" />
	{:else if selectedValue}
		{selectedValue}
	{:else}
		No Workspace
	{/if}
	<ChevronDownIcon class="size-4 opacity-50" />
{/snippet}

{#snippet checkIcon(isSelected: boolean)}
	{#if isSelected}
		<CheckIcon class="size-4" />
	{:else}
		<span class="size-4"></span>
	{/if}
{/snippet}

{#snippet noWorkspaceItem()}
	{@render checkIcon(!selectedValue)}
	No Workspace
{/snippet}

{#snippet workspaceItem(workspace: Workspace)}
	{@render checkIcon(selectedValue === workspace.name)}
	{workspace.name}
{/snippet}

{#snippet newWorkspaceItem()}
	<PlusIcon class="size-4" />
	New Workspace
{/snippet}

{#if isDesktop.current}
	<DropdownMenu bind:open={dropdownOpen}>
		<DropdownMenuTrigger
			disabled={!isHydrated.current || disabled}
			class="flex w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
		>
			{@render triggerLabel()}
		</DropdownMenuTrigger>
		<DropdownMenuContent>
			<DropdownMenuItem onclick={() => selectWorkspace(null)}>
				<div class="flex items-center gap-2">
					{@render noWorkspaceItem()}
				</div>
			</DropdownMenuItem>
			{#if user.workspaces.current.length > 0}
				<DropdownMenuSeparator />
			{/if}
			{#each user.workspaces.current as workspace (workspace.name)}
				<DropdownMenuItem onclick={() => selectWorkspace(workspace.name)}>
					<div class="flex items-center gap-2">
						{@render workspaceItem(workspace)}
					</div>
				</DropdownMenuItem>
			{/each}
			<DropdownMenuSeparator />
			<DropdownMenuItem onclick={openCreateWorkspace}>
				<div class="flex items-center gap-2">
					{@render newWorkspaceItem()}
				</div>
			</DropdownMenuItem>
		</DropdownMenuContent>
	</DropdownMenu>
{:else}
	<button
		type="button"
		onclick={openSelector}
		disabled={!isHydrated.current || disabled}
		class="flex w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
	>
		{@render triggerLabel()}
	</button>

	<Drawer bind:open={drawerOpen}>
		<DrawerContent>
			<DrawerHeader>
				<DrawerTitle>Select Workspace</DrawerTitle>
			</DrawerHeader>
			<div class="flex flex-col gap-1 p-4 pb-8">
				<button
					type="button"
					onclick={() => selectWorkspace(null)}
					class="flex w-full items-center gap-2 rounded-md px-4 py-3 text-left hover:bg-accent"
				>
					{@render noWorkspaceItem()}
				</button>
				{#if user.workspaces.current.length > 0}
					<div class="my-2 h-px bg-border"></div>
				{/if}
				{#each user.workspaces.current as workspace (workspace.name)}
					<button
						type="button"
						onclick={() => selectWorkspace(workspace.name)}
						class="flex w-full items-center gap-2 rounded-md px-4 py-3 text-left hover:bg-accent"
					>
						{@render workspaceItem(workspace)}
					</button>
				{/each}
				<div class="my-2 h-px bg-border"></div>
				<button
					type="button"
					onclick={openCreateWorkspace}
					class="flex w-full items-center gap-2 rounded-md px-4 py-3 text-left hover:bg-accent"
				>
					{@render newWorkspaceItem()}
				</button>
			</div>
		</DrawerContent>
	</Drawer>
{/if}

<CreateWorkspace bind:open={createOpen} />
