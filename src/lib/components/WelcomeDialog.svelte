<script lang="ts">
	import {
		Dialog,
		DialogContent,
		DialogTitle,
		DialogDescription
	} from '$lib/components/ui/dialog/index.js';
	import {
		Drawer,
		DrawerContent,
		DrawerTitle,
		DrawerDescription
	} from '$lib/components/ui/drawer/index.js';
	import { MediaQuery } from 'svelte/reactivity';
	import { Button } from '$lib/components/ui/button/index.js';
	import { PersistedState } from 'runed';
	import { browser } from '$app/environment';
	import { Link, Link2, MousePointerClick, Globe, ChartArea } from '@lucide/svelte';

	let dismissed = new PersistedState<boolean>('link-welcome-dismissed', false);
	let open = $state(false);

	let isMobile = new MediaQuery('(max-width: 640px)');
	const useDrawer = $derived(isMobile.current);

	$effect(() => {
		if (browser && !dismissed.current) {
			open = true;
		}
	});

	const handleDismiss = () => {
		dismissed.current = true;
		open = false;
	};

	const features = [
		{ icon: Link2, label: 'Create short links' },
		{ icon: MousePointerClick, label: 'Track every click' },
		{ icon: Globe, label: 'Geo & device stats' },
		{ icon: ChartArea, label: 'Time-series analytics' }
	] as const;
</script>

{#snippet featureItems()}
	{#each features as { icon: Icon, label }}
		<div class="flex items-center gap-3 rounded-lg border p-3">
			<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
				<Icon class="h-4 w-4 text-primary" />
			</div>
			<span class="text-sm font-medium">{label}</span>
		</div>
	{/each}
{/snippet}

{#if useDrawer}
	<Drawer bind:open>
		<DrawerContent class="">
			<div class="px-4 pt-6 pb-6 text-center">
				<div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
					<Link class="h-6 w-6 text-primary" />
				</div>
				<DrawerTitle class="mt-3">Welcome to Link</DrawerTitle>
				<DrawerDescription>Your URL shortener &amp; link management hub.</DrawerDescription>
			</div>
			<div class="grid gap-3 px-4 pb-6">
				{@render featureItems()}
				<Button class="mt-1 w-full" onclick={handleDismiss}>Get Started</Button>
			</div>
		</DrawerContent>
	</Drawer>
{:else}
	<Dialog bind:open>
		<DialogContent class="sm:max-w-md">
			<div class="-mx-6 -mt-6 mb-0 rounded-t-lg px-6 pt-10 pb-6 text-center">
				<div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
					<Link class="h-7 w-7 text-primary" />
				</div>
				<DialogTitle class="mt-4">Welcome to Link</DialogTitle>
				<DialogDescription>Your URL shortener &amp; link management hub.</DialogDescription>
			</div>
			<div class="grid grid-cols-2 gap-3">
				{@render featureItems()}
			</div>
			<div class="flex justify-end">
				<Button onclick={handleDismiss}>Get Started</Button>
			</div>
		</DialogContent>
	</Dialog>
{/if}
