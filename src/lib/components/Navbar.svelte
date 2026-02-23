<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Kbd } from '$lib/components/ui/kbd/index.js';
	import { Link, Loader } from '@lucide/svelte';
	import CreateLink from '$lib/components/CreateLink.svelte';
	import { user } from '$lib/state/user.svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { globalState } from '$lib/state/global.svelte';

	let isMobile = new MediaQuery('(max-width: 640px)');
</script>

<header
	class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60"
>
	<div class="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6 lg:px-8">
		<div class="flex items-center gap-2">
			<div
				class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
			>
				<Link class="h-4 w-4" />
			</div>
			<span class="text-lg font-bold">Link</span>
		</div>

		<div class="flex items-center gap-4">
			<!-- Create Link Button -->
			<CreateLink>
				<Button
					size="default"
					hotkey="c"
					hotkeyEnabled={!isMobile.current}
					disabled={user.ensuring || !globalState.hydrated}
				>
					{#if user.ensuring || !globalState.hydrated}
						<Loader class="h-4 w-4 animate-spin" />
					{/if}
					Create link
					{#if !isMobile.current}
						<Kbd class="bg-primary-foreground/15 text-primary-foreground">C</Kbd>
					{/if}
				</Button>
			</CreateLink>
		</div>
	</div>
</header>
