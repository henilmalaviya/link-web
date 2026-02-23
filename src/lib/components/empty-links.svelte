<script lang="ts">
	import { Empty, EmptyContent, EmptyDescription, EmptyTitle } from '$lib/components/ui/empty';
	import { Button } from '$lib/components/ui/button';
	import { Link2, Plus } from '@lucide/svelte';
	import { cn } from '$lib/utils';

	interface Props {
		onCreate: () => void;
		class?: string;
	}

	let { onCreate, class: className }: Props = $props();
</script>

<Empty class={cn('border border-border', className)}>
	<EmptyContent>
		<div class="flex flex-col items-center gap-4">
			<div
				class="flex size-14 items-center justify-center rounded-full border border-border bg-muted/30"
			>
				<Link2 class="size-6 text-muted-foreground" />
			</div>
			<EmptyTitle>No links yet</EmptyTitle>
			<EmptyDescription>
				Create your first short link to get started. It only takes a few seconds.
			</EmptyDescription>
			<Button onclick={onCreate} class="gap-2">
				<Plus class="size-4" />
				Create your first link
			</Button>
		</div>
	</EmptyContent>
</Empty>
