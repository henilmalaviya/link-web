<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import '@fontsource-variable/nunito-sans';
	import { PUBLIC_CONVEX_URL } from '$env/static/public';
	import { setupConvex, useConvexClient } from 'convex-svelte';
	import { onMount } from 'svelte';
	import { user } from '$lib/state/user.svelte';

	setupConvex(PUBLIC_CONVEX_URL);

	let { children } = $props();

	// Get convex client synchronously during component initialization
	const convex = useConvexClient();

	onMount(async () => {
		await user.ensureUser(convex);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="mx-auto flex min-h-screen w-full max-w-4xl flex-col">
	{@render children()}
</div>
