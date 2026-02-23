<script lang="ts">
	import { Drawer as DrawerPrimitive } from 'vaul-svelte';

	let { children, ...restProps }: DrawerPrimitive.CloseProps = $props();
</script>

<DrawerPrimitive.Close {...restProps}>
	{@render children?.()}
</DrawerPrimitive.Close>
