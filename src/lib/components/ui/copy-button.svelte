<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { copyToClipboard } from '$lib/utils/clipboard';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import type { ButtonVariant, ButtonSize } from '$lib/components/ui/button/button.svelte';

	let {
		text,
		class: className = '',
		variant = 'ghost',
		size = 'icon',
		...restProps
	}: {
		text: string;
		class?: string;
		variant?: ButtonVariant;
		size?: ButtonSize;
	} = $props();

	let showCheck = $state(false);

	const handleCopy = async () => {
		const success = await copyToClipboard(text);
		if (success) {
			showCheck = true;
			setTimeout(() => {
				showCheck = false;
			}, 2000);
		}
	};
</script>

<Button {variant} {size} class={className} onclick={handleCopy} {...restProps}>
	{#if showCheck}
		<Check class="size-[1.2rem]" />
	{:else}
		<Copy class="size-[1.2rem]" />
	{/if}
</Button>
