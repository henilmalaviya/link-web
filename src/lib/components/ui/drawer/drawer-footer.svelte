<script lang="ts">
	import { cn } from '$lib/utils/ui.js';

	let { class: className, children, ...restProps } = $props();
</script>

<div
	class={cn('mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
	{...restProps}
>
	{@render children?.()}
</div>
