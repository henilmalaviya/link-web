<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Navbar from '$lib/components/Navbar.svelte';
	import '@fontsource-variable/nunito-sans';
	import { PUBLIC_CONVEX_URL } from '$env/static/public';
	import { setupConvex } from 'convex-svelte';

	setupConvex(PUBLIC_CONVEX_URL);

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="mx-auto flex min-h-screen w-full max-w-4xl flex-col">
	<Navbar />
	{@render children()}
</div>
