<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import '@fontsource-variable/nunito-sans';
	import { PUBLIC_CONVEX_URL } from '$env/static/public';
	import { setupConvex, useConvexClient } from 'convex-svelte';
	import { onMount } from 'svelte';
	import { userManager } from '$lib/state/userManager.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import { Toaster } from '$lib/components/ui/sonner';

	setupConvex(PUBLIC_CONVEX_URL);

	let { children } = $props();

	const convex = useConvexClient();

	onMount(async () => {
		await userManager.ensureUser(convex);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="mx-auto flex min-h-screen w-full max-w-4xl flex-col">
	<Navbar />
	{@render children()}
</div>

<Toaster />
