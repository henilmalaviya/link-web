<script lang="ts">
	import { onMount } from 'svelte';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import type { Id } from '$convex/_generated/dataModel';
	import type { FunctionReference } from 'convex/server';
	import { user } from '$lib/state/user.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Drawer from '$lib/components/ui/drawer';
	import LinkForm from '$lib/components/link-form.svelte';
	import LinkItem from '$lib/components/link-item.svelte';
	import LinkPreview from '$lib/components/link-preview.svelte';
	import EmptyLinks from '$lib/components/empty-links.svelte';
	import { Plus, Loader2, AlertCircle } from '@lucide/svelte';

	interface StatPoint {
		date: string;
		count: number;
	}

	interface Link {
		_id: string;
		url: string;
		shortId: string;
		createdAt: number;
		redirectCount: number;
		stats: StatPoint[];
	}

	type DialogMode = 'create' | 'edit' | 'preview' | 'delete';

	// Convex client
	const convex = useConvexClient();

	// Local state
	let isDialogOpen = $state(false);
	let dialogMode = $state<DialogMode>('create');
	let selectedLink = $state<Link | null>(null);
	let isCreating = $state(false);
	let isUpdating = $state(false);
	let isDeleting = $state(false);
	let error = $state<string | null>(null);
	let isMobile = $state(false);
	let createdShortId = $state<string | null>(null);

	// Cast API functions to work around potentially outdated generated types
	// The actual functions exist in the convex backend
	const linksApi = api.links as Record<string, unknown>;
	const getAllQuery = linksApi.getAll as FunctionReference<'query'>;
	const createMutation = linksApi.create as FunctionReference<'mutation'>;
	const updateMutation = linksApi.update as FunctionReference<'mutation'>;
	const deleteMutation = linksApi.deleteLink as FunctionReference<'mutation'>;

	// Query links from Convex - return 'skip' string to conditionally skip
	const linksQuery = useQuery(getAllQuery, () => {
		if (!user.ensured || !user.exists || !user.data.current) {
			return 'skip';
		}
		return {
			userId: user.data.current.id as Id<'users'>,
			token: user.data.current.token
		};
	});

	// Derived state
	const isLoading = $derived(!user.ensured || linksQuery.isLoading);
	const links = $derived((linksQuery.data ?? []) as Link[]);

	// Check for mobile viewport
	onMount(() => {
		const checkMobile = () => {
			isMobile = window.innerWidth < 768;
		};

		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	});

	// Dialog/Drawer actions
	function openCreateDialog() {
		dialogMode = 'create';
		selectedLink = null;
		createdShortId = null;
		error = null;
		isDialogOpen = true;
	}

	function openEditDialog(link: Link) {
		dialogMode = 'edit';
		selectedLink = link;
		createdShortId = null;
		error = null;
		isDialogOpen = true;
	}

	function openDeleteDialog(link: Link) {
		dialogMode = 'delete';
		selectedLink = link;
		error = null;
		isDialogOpen = true;
	}

	function closeDialog() {
		isDialogOpen = false;
		selectedLink = null;
		createdShortId = null;
		error = null;
	}

	// CRUD operations
	async function handleCreate(url: string, shortId?: string) {
		if (!user.data.current) return;

		isCreating = true;
		error = null;

		try {
			const result = (await convex.mutation(createMutation, {
				url,
				shortId,
				userId: user.data.current.id as Id<'users'>,
				token: user.data.current.token
			})) as { shortId: string };

			createdShortId = result.shortId;
			dialogMode = 'preview';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to create link';
		} finally {
			isCreating = false;
		}
	}

	async function handleUpdate(url: string) {
		if (!user.data.current || !selectedLink) return;

		isUpdating = true;
		error = null;

		try {
			await convex.mutation(updateMutation, {
				linkId: selectedLink._id as Id<'links'>,
				url,
				userId: user.data.current.id as Id<'users'>,
				token: user.data.current.token
			});

			closeDialog();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to update link';
		} finally {
			isUpdating = false;
		}
	}

	async function handleDelete() {
		if (!user.data.current || !selectedLink) return;

		isDeleting = true;
		error = null;

		try {
			await convex.mutation(deleteMutation, {
				linkId: selectedLink._id as Id<'links'>,
				userId: user.data.current.id as Id<'users'>,
				token: user.data.current.token
			});

			closeDialog();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to delete link';
		} finally {
			isDeleting = false;
		}
	}

	// Get base URL for short links
	const baseUrl = $derived(
		typeof window !== 'undefined'
			? `${window.location.protocol}//${window.location.host}`
			: 'https://lnk.to'
	);
</script>

<svelte:head>
	<title>Link Shortener</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<!-- Header -->
	<header class="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
		<div class="flex h-16 items-center justify-between px-4">
			<h1 class="text-xl font-semibold tracking-tight">Links</h1>
			<Button onclick={openCreateDialog} class="gap-2">
				<Plus class="size-4" />
				<span class="hidden sm:inline">Create Link</span>
				<span class="sm:hidden">Create</span>
			</Button>
		</div>
	</header>

	<!-- Main content -->
	<main class="flex-1 px-4 py-6">
		{#if !user.ensured}
			<!-- User initialization -->
			<div class="flex flex-col items-center justify-center gap-4 py-20">
				<Loader2 class="size-8 animate-spin text-muted-foreground" />
				<p class="text-sm text-muted-foreground">Initializing...</p>
			</div>
		{:else if isLoading}
			<!-- Loading state -->
			<div class="flex flex-col gap-4">
				{#each Array(5) as _, i (i)}
					<div class="animate-pulse">
						<div class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
							<div class="flex flex-1 flex-col gap-2">
								<div class="h-5 w-24 rounded bg-muted"></div>
								<div class="h-4 w-48 rounded bg-muted"></div>
							</div>
							<div class="flex items-center gap-4">
								<div class="h-4 w-20 rounded bg-muted"></div>
								<div class="flex gap-1">
									<div class="h-8 w-8 rounded bg-muted"></div>
									<div class="h-8 w-8 rounded bg-muted"></div>
									<div class="h-8 w-8 rounded bg-muted"></div>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else if linksQuery.error}
			<!-- Error state -->
			<div class="flex flex-col items-center justify-center gap-4 py-20">
				<div
					class="flex size-14 items-center justify-center rounded-full border border-destructive/50 bg-destructive/10"
				>
					<AlertCircle class="size-6 text-destructive" />
				</div>
				<div class="text-center">
					<p class="font-medium">Failed to load links</p>
					<p class="text-sm text-muted-foreground">{linksQuery.error.message}</p>
				</div>
			</div>
		{:else if links.length === 0}
			<!-- Empty state -->
			<EmptyLinks onCreate={openCreateDialog} class="py-20" />
		{:else}
			<!-- Links list -->
			<div class="border-t border-border">
				{#each links as link (link._id)}
					<LinkItem
						{link}
						stats={link.stats}
						{baseUrl}
						onEdit={openEditDialog}
						onDelete={openDeleteDialog}
					/>
				{/each}
			</div>
		{/if}
	</main>
</div>

<!-- Desktop Dialog -->
{#if !isMobile}
	<Dialog.Root bind:open={isDialogOpen}>
		<Dialog.Content class="max-w-md">
			<Dialog.Header>
				<Dialog.Title>
					{#if dialogMode === 'create'}
						Create Short Link
					{:else if dialogMode === 'edit'}
						Edit Link
					{:else if dialogMode === 'preview'}
						Link Created!
					{:else if dialogMode === 'delete'}
						Delete Link
					{/if}
				</Dialog.Title>
			</Dialog.Header>

			{#if error}
				<div class="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3">
					<p class="text-sm text-destructive">{error}</p>
				</div>
			{/if}

			{#if dialogMode === 'create'}
				<LinkForm onSubmit={handleCreate} isEditing={false} />
			{:else if dialogMode === 'edit' && selectedLink}
				<LinkForm
					onSubmit={(url) => handleUpdate(url)}
					initialUrl={selectedLink.url}
					initialShortId={selectedLink.shortId}
					isEditing={true}
				/>
			{:else if dialogMode === 'preview' && createdShortId}
				<div class="flex flex-col gap-4">
					<LinkPreview shortId={createdShortId} {baseUrl} />
					<Button variant="outline" onclick={closeDialog}>Done</Button>
				</div>
			{:else if dialogMode === 'delete' && selectedLink}
				<div class="flex flex-col gap-4">
					<p class="text-sm text-muted-foreground">
						Are you sure you want to delete the link
						<strong class="text-foreground">{selectedLink.shortId}</strong>? This action cannot be
						undone.
					</p>
					<div class="flex justify-end gap-2">
						<Button variant="outline" onclick={closeDialog} disabled={isDeleting}>Cancel</Button>
						<Button variant="destructive" onclick={handleDelete} disabled={isDeleting}>
							{#if isDeleting}
								<Loader2 class="size-4 animate-spin" />
								Deleting...
							{:else}
								Delete
							{/if}
						</Button>
					</div>
				</div>
			{/if}
		</Dialog.Content>
	</Dialog.Root>
{/if}

<!-- Mobile Drawer -->
{#if isMobile}
	<Drawer.Root bind:open={isDialogOpen}>
		<Drawer.Content>
			<Drawer.Header>
				<Drawer.Title>
					{#if dialogMode === 'create'}
						Create Short Link
					{:else if dialogMode === 'edit'}
						Edit Link
					{:else if dialogMode === 'preview'}
						Link Created!
					{:else if dialogMode === 'delete'}
						Delete Link
					{/if}
				</Drawer.Title>
			</Drawer.Header>

			<div class="px-4 pb-6">
				{#if error}
					<div class="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3">
						<p class="text-sm text-destructive">{error}</p>
					</div>
				{/if}

				{#if dialogMode === 'create'}
					<LinkForm onSubmit={handleCreate} isEditing={false} />
				{:else if dialogMode === 'edit' && selectedLink}
					<LinkForm
						onSubmit={(url) => handleUpdate(url)}
						initialUrl={selectedLink.url}
						initialShortId={selectedLink.shortId}
						isEditing={true}
					/>
				{:else if dialogMode === 'preview' && createdShortId}
					<div class="flex flex-col gap-4">
						<LinkPreview shortId={createdShortId} {baseUrl} />
						<Button variant="outline" onclick={closeDialog}>Done</Button>
					</div>
				{:else if dialogMode === 'delete' && selectedLink}
					<div class="flex flex-col gap-4">
						<p class="text-sm text-muted-foreground">
							Are you sure you want to delete the link
							<strong class="text-foreground">{selectedLink.shortId}</strong>? This action cannot be
							undone.
						</p>
						<div class="flex gap-2">
							<Button variant="outline" onclick={closeDialog} disabled={isDeleting} class="flex-1">
								Cancel
							</Button>
							<Button
								variant="destructive"
								onclick={handleDelete}
								disabled={isDeleting}
								class="flex-1"
							>
								{#if isDeleting}
									<Loader2 class="size-4 animate-spin" />
									Deleting...
								{:else}
									Delete
								{/if}
							</Button>
						</div>
					</div>
				{/if}
			</div>
		</Drawer.Content>
	</Drawer.Root>
{/if}
