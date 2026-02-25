<script lang="ts">
	import { Tabs as TabsPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils/ui.js';

	let { ref = $bindable(null), class: className, ...restProps }: TabsPrimitive.ListProps = $props();
</script>

<TabsPrimitive.List
	bind:ref
	data-slot="tabs-list"
	class={cn(
		'inline-flex items-center gap-1 rounded-lg border bg-muted/30 px-1 py-1 text-xs text-muted-foreground',
		className
	)}
	{...restProps}
/>
