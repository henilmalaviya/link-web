<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import * as Popover from '$lib/components/ui/popover';
	import {
		Drawer,
		DrawerContent,
		DrawerDescription,
		DrawerFooter,
		DrawerHeader,
		DrawerTitle,
		DrawerTrigger
	} from '$lib/components/ui/drawer/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ArrowUpDown, ArrowDown, ArrowUp, BarChart3 } from '@lucide/svelte';
	import * as Select from '$lib/components/ui/select';
	import { LayoutGrid } from '@lucide/svelte';

	interface Props {
		orderBy: 'newest' | 'oldest' | 'most_clicks' | 'least_clicks';
	}

	let { orderBy = $bindable() }: Props = $props();

	const isMobile = new MediaQuery('(max-width: 640px)');
	const useDrawer = $derived(isMobile.current);
	let popoverOpen = $state(false);
	let drawerOpen = $state(false);

	const handleOpenChange = (nextOpen: boolean) => {
		drawerOpen = nextOpen;
	};

	$effect(() => {
		if (orderBy) {
			popoverOpen = false;
			drawerOpen = false;
		}
	});
</script>

{#if useDrawer}
	<Button variant="outline" size="icon" onclick={() => (drawerOpen = true)}>
		<LayoutGrid class="h-4 w-4" />
	</Button>
	<Drawer bind:open={drawerOpen} onOpenChange={handleOpenChange}>
		<DrawerContent>
			<DrawerHeader class="mb-4">
				<DrawerTitle>Display Options</DrawerTitle>
				<DrawerDescription>Choose how to order your links.</DrawerDescription>
			</DrawerHeader>
			<div class="px-4">
				<div class="flex items-center justify-between gap-3">
					<div class="flex items-center gap-2 text-sm">
						<ArrowUpDown class="h-4 w-4" />
						<span>Ordering</span>
					</div>
					<Select.Root type="single" bind:value={orderBy}>
						<Select.Trigger class="w-fit">
							<span
								>{orderBy === 'newest'
									? 'Newest first'
									: orderBy === 'oldest'
										? 'Oldest first'
										: orderBy === 'most_clicks'
											? 'Most clicks'
											: 'Least clicks'}</span
							>
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="newest">
								<ArrowDown class="mr-2 inline h-4 w-4" />
								Newest first
							</Select.Item>
							<Select.Item value="oldest">
								<ArrowUp class="mr-2 inline h-4 w-4" />
								Oldest first
							</Select.Item>
							<Select.Item value="most_clicks">
								<BarChart3 class="mr-2 inline h-4 w-4" />
								Most clicks
							</Select.Item>
							<Select.Item value="least_clicks">
								<ArrowUpDown class="mr-2 inline h-4 w-4" />
								Least clicks
							</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
			</div>
		</DrawerContent>
	</Drawer>
{:else}
	<Popover.Root bind:open={popoverOpen}>
		<Popover.Trigger>
			<Button variant="outline" size="sm">
				<LayoutGrid class="mr-2 h-4 w-4" />
				Display
			</Button>
		</Popover.Trigger>
		<Popover.Content align="start" class="w-80">
			<div class="flex items-center justify-between gap-3">
				<div class="flex items-center gap-2 text-sm">
					<ArrowUpDown class="h-4 w-4" />
					<span>Ordering</span>
				</div>
				<Select.Root type="single" bind:value={orderBy}>
					<Select.Trigger class="w-fit">
						<span
							>{orderBy === 'newest'
								? 'Newest first'
								: orderBy === 'oldest'
									? 'Oldest first'
									: orderBy === 'most_clicks'
										? 'Most clicks'
										: 'Least clicks'}</span
						>
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="newest">
							<ArrowDown class="mr-2 inline h-4 w-4" />
							Newest first
						</Select.Item>
						<Select.Item value="oldest">
							<ArrowUp class="mr-2 inline h-4 w-4" />
							Oldest first
						</Select.Item>
						<Select.Item value="most_clicks">
							<BarChart3 class="mr-2 inline h-4 w-4" />
							Most clicks
						</Select.Item>
						<Select.Item value="least_clicks">
							<ArrowUpDown class="mr-2 inline h-4 w-4" />
							Least clicks
						</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
		</Popover.Content>
	</Popover.Root>
{/if}
