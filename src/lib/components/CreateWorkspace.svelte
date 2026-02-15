<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import { useConvexClient } from 'convex-svelte';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogFooter
	} from '$lib/components/ui/dialog/index.js';
	import {
		Drawer,
		DrawerContent,
		DrawerHeader,
		DrawerTitle,
		DrawerFooter
	} from '$lib/components/ui/drawer/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import Button from '$lib/components/ui/button/button.svelte';
	import LoaderIcon from '@lucide/svelte/icons/loader-2';
	import { api } from '$convex/_generated/api';
	import { user } from '$lib/stores/global.svelte';

	let { open = $bindable(false) }: { open?: boolean } = $props();
	let name = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

	const client = useConvexClient();
	const isDesktop = new MediaQuery('(min-width: 768px)');

	async function create() {
		if (!name.trim() || loading) return;

		loading = true;
		error = null;

		try {
			const result = await client.mutation(api.workspaces.create, { name: name.trim() });
			user.addWorkspace(name.trim(), result.secret);
			user.setCurrentWorkspace(name.trim());
			name = '';
			open = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to create workspace';
		} finally {
			loading = false;
		}
	}

	function close() {
		name = '';
		error = null;
		open = false;
	}
</script>

{#snippet formFields()}
	<div class="flex flex-col gap-2">
		<Label for="workspace-name">Name</Label>
		<Input id="workspace-name" bind:value={name} placeholder="my-workspace" disabled={loading} />
		{#if error}
			<p class="text-sm text-destructive">{error}</p>
		{/if}
	</div>
{/snippet}

{#snippet createButton()}
	<Button onclick={create} disabled={loading || !name.trim()}>
		{#if loading}
			<LoaderIcon class="size-4 animate-spin" />
		{/if}
		Create
	</Button>
{/snippet}

{#if isDesktop.current}
	<Dialog bind:open>
		<DialogContent>
			<DialogHeader>
				<DialogTitle>New Workspace</DialogTitle>
			</DialogHeader>
			{@render formFields()}
			<DialogFooter>
				<Button variant="outline" onclick={close} disabled={loading}>Cancel</Button>
				{@render createButton()}
			</DialogFooter>
		</DialogContent>
	</Dialog>
{:else}
	<Drawer bind:open>
		<DrawerContent>
			<DrawerHeader>
				<DrawerTitle>New Workspace</DrawerTitle>
			</DrawerHeader>
			<div class="px-4">
				{@render formFields()}
			</div>
			<DrawerFooter>
				<Button variant="outline" onclick={close} disabled={loading}>Cancel</Button>
				{@render createButton()}
			</DrawerFooter>
		</DrawerContent>
	</Drawer>
{/if}
