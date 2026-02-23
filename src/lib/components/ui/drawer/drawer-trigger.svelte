<script lang="ts">
	import { Drawer as DrawerPrimitive } from 'vaul-svelte';

	let { children, ...restProps }: DrawerPrimitive.TriggerProps = $props();
</script>

<DrawerPrimitive.Trigger {...restProps}>
	{@render children?.()}
</DrawerPrimitive.Trigger>
