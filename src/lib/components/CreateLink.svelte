<script lang="ts">
	import { browser } from '$app/environment';
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
	import WorkspaceSelector from './WorkspaceSelector.svelte';
	import LoaderIcon from '@lucide/svelte/icons/loader-2';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import CheckIcon from '@lucide/svelte/icons/check';
	import { api } from '$convex/_generated/api';
	import { user } from '$lib/stores/global.svelte';
	import { onMount } from 'svelte';

	let {
		open = $bindable(false)
	}: {
		open?: boolean;
	} = $props();

	let url = $state('');
	let shortName = $state('');
	let selectedWorkspace = $state<string | null>(user.currentWorkspaceName.current);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let copied = $state(false);

	$effect(() => {
		selectedWorkspace = user.currentWorkspaceName.current;
	});

	const client = useConvexClient();
	const isDesktop = new MediaQuery('(min-width: 768px)');

	const previewUrl = $derived(() => {
		const domain = browser ? window.location.origin : '';
		const identifier = shortName.trim() || 'abc123';
		if (selectedWorkspace) {
			return `${domain}/${selectedWorkspace}/${identifier}`;
		}
		return `${domain}/${identifier}`;
	});

	const showPreview = $derived(selectedWorkspace || shortName.trim());

	function getWorkspaceSecret(name: string): string | undefined {
		return user.workspaces.current.find((w) => w.name === name)?.secret;
	}

	async function copyUrl() {
		await navigator.clipboard.writeText(previewUrl());
		copied = true;
		setTimeout(() => {
			copied = false;
		}, 2000);
	}

	async function create() {
		if (!url.trim() || loading) return;

		if (selectedWorkspace && !shortName.trim()) {
			error = 'Short name is required when creating links in a workspace';
			return;
		}

		if (shortName && !/^[a-zA-Z0-9-_]+$/.test(shortName)) {
			error = 'Short name can only contain letters, numbers, hyphens, and underscores';
			return;
		}

		loading = true;
		error = null;

		try {
			const result = await client.mutation(api.links.create, {
				url: url.trim(),
				shortName: shortName.trim() || undefined,
				workspaceName: selectedWorkspace || undefined,
				workspaceSecret: selectedWorkspace ? getWorkspaceSecret(selectedWorkspace) : undefined
			});
			user.links.current.push({
				shortId: result.shortId,
				secret: result.secret,
				workspaceName: selectedWorkspace
			});
			url = '';
			shortName = '';
			open = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to create link';
		} finally {
			loading = false;
		}
	}

	function close() {
		url = '';
		shortName = '';
		error = null;
		open = false;
	}
</script>

{#snippet formFields()}
	<div class="flex flex-col gap-4">
		<div class="flex flex-col gap-2">
			<Label for="link-url">URL</Label>
			<Input
				id="link-url"
				type="url"
				bind:value={url}
				placeholder="https://example.com"
				disabled={loading}
			/>
		</div>
		<div class="flex flex-col gap-2">
			<Label for="link-shortname">Short name {selectedWorkspace ? '' : '(optional)'}</Label>
			<Input id="link-shortname" bind:value={shortName} placeholder="my-link" disabled={loading} />
			<p class="text-xs text-muted-foreground">Letters, numbers, hyphens, and underscores only</p>
		</div>
		{#if user.workspaces.current.length > 0}
			<div class="flex flex-col gap-2">
				<Label>Workspace</Label>
				<WorkspaceSelector bind:value={selectedWorkspace} disabled={loading} />
			</div>
		{/if}
		{#if showPreview}
			<div class="flex flex-col gap-2">
				<Label>Preview</Label>
				<div class="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2 shadow-sm">
					<span class="flex-1 truncate font-mono text-sm text-muted-foreground">
						{previewUrl()}
					</span>

					<button
						type="button"
						onclick={copyUrl}
						class="shrink-0 rounded p-1.5 transition-colors hover:bg-muted"
					>
						{#if copied}
							<CheckIcon class="size-4 text-green-500" />
						{:else}
							<CopyIcon class="size-4" />
						{/if}
					</button>
				</div>
			</div>
		{/if}
		{#if error}
			<p class="text-sm text-destructive">{error}</p>
		{/if}
	</div>
{/snippet}

{#snippet createButton()}
	<Button
		onclick={create}
		disabled={loading || !url.trim() || !!(selectedWorkspace && !shortName.trim())}
	>
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
				<DialogTitle>New Link</DialogTitle>
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
				<DrawerTitle>New Link</DrawerTitle>
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
