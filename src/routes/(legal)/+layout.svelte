<script lang="ts">
	import '../layout.css';
	import '@fontsource-variable/nunito-sans';
	import favicon from '$lib/assets/favicon.svg';
	import { ArrowLeft } from '@lucide/svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-8 sm:px-6 sm:py-12">
	<nav class="mb-8">
		<a
			href="/"
			class="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
		>
			<ArrowLeft class="h-4 w-4" />
			Back to Link
		</a>
	</nav>
	<main class="flex-1">
		{@render children()}
	</main>
	<footer class="mt-12 border-t pt-6 text-center text-sm text-muted-foreground">
		<div class="flex items-center justify-center gap-4">
			<a href="/terms" class="transition-colors hover:text-foreground">Terms & Conditions</a>
			<span class="text-border">·</span>
			<a href="/privacy" class="transition-colors hover:text-foreground">Privacy Policy</a>
		</div>
	</footer>
</div>
