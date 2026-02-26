<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import '@fontsource-variable/nunito-sans';
	import { PUBLIC_CONVEX_URL } from '$env/static/public';
	import { setupConvex, useConvexClient } from 'convex-svelte';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { BarChart3, Loader } from '@lucide/svelte';
	import { userManager } from '$lib/state/userManager.svelte';
	import { globalState } from '$lib/state/global.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import UserSwitcher from '$lib/components/UserSwitcher.svelte';
	import { Toaster } from '$lib/components/ui/sonner';

	setupConvex(PUBLIC_CONVEX_URL);

	let { children } = $props();

	const convex = useConvexClient();

	let userSwitcherOpen = $state(false);

	const isHydrated = $derived(globalState.hydrated);
	const hasNoUsers = $derived(isHydrated && userManager.users.length === 0);
	const hasNoActiveUser = $derived(
		isHydrated && !userManager.activeAccount && userManager.users.length > 0
	);

	const handleManageUsers = () => {
		userSwitcherOpen = true;
	};

	onMount(async () => {
		await userManager.ensureUser(convex);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="mx-auto flex min-h-screen w-full max-w-4xl flex-col">
	<Navbar />
	{#if !isHydrated}
		<div class="flex flex-1 items-center justify-center p-6">
			<Loader class="h-5 w-5 animate-spin text-muted-foreground" />
		</div>
	{:else if hasNoUsers}
		<div class="flex flex-1 flex-col items-center justify-center py-12 text-center">
			<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
				<BarChart3 class="h-8 w-8 text-muted-foreground" />
			</div>
			<h3 class="text-lg font-medium">No account selected</h3>
			<p class="mt-2 max-w-sm text-muted-foreground">
				Create a new account to start creating links.
			</p>
			<Button class="mt-4" onclick={handleManageUsers}>Manage Users</Button>
		</div>
	{:else if hasNoActiveUser}
		<div class="flex flex-1 flex-col items-center justify-center py-12 text-center">
			<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
				<BarChart3 class="h-8 w-8 text-muted-foreground" />
			</div>
			<h3 class="text-lg font-medium">No account selected</h3>
			<p class="mt-2 max-w-sm text-muted-foreground">
				Select an account from the user menu to view your links.
			</p>
			<Button class="mt-4" onclick={() => (userSwitcherOpen = true)}>Select Account</Button>
		</div>
	{:else}
		{@render children()}
	{/if}
</div>

<UserSwitcher bind:open={userSwitcherOpen} />

<Toaster />
