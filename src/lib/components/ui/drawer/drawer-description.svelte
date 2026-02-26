<script lang="ts">
	import { Drawer as DrawerPrimitive } from 'vaul-svelte';
	import { cn } from '$lib/utils/ui.js';

	let { class: className, children, ...restProps }: DrawerPrimitive.DescriptionProps = $props();
</script>

<DrawerPrimitive.Description class={cn('text-sm text-muted-foreground', className)} {...restProps}>
	{@render children?.()}
</DrawerPrimitive.Description>
