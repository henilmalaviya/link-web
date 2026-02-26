<script lang="ts">
	import { cn } from '$lib/utils/ui.js';

	let { class: className, children, ...restProps } = $props();
</script>

<div class={cn('flex flex-col gap-1.5 text-center sm:text-left', className)} {...restProps}>
	{@render children?.()}
</div>
