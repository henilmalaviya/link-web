<script lang="ts">
	import { Drawer as DrawerPrimitive } from 'vaul-svelte';
	import { cn } from '$lib/utils/ui.js';
	import DrawerOverlay from './drawer-overlay.svelte';

	let { class: className, children, ...restProps }: DrawerPrimitive.ContentProps = $props();
</script>

<DrawerPrimitive.Portal>
	<DrawerOverlay />
	<DrawerPrimitive.Content
		class={cn(
			'fixed inset-x-0 bottom-0 z-50 mt-24 flex max-h-[90vh] flex-col rounded-t-lg border bg-background p-6 shadow-lg data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom',
			className
		)}
		{...restProps}
	>
		<div class="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted" />
		{@render children?.()}
	</DrawerPrimitive.Content>
</DrawerPrimitive.Portal>
