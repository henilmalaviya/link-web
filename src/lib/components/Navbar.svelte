<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import CreateLink from './CreateLink.svelte';
	import WorkspaceSelector from './WorkspaceSelector.svelte';
	import { Button } from '$lib/components/ui/button';

	let createLinkOpen = $state(false);
</script>

<div class="flex items-center justify-between border-b px-4 py-3">
	<!-- head -->
	<div><a href="/"><h1 class="text-xl font-semibold sm:text-2xl">link</h1></a></div>

	<!-- tail -->
	<div class="flex items-center justify-center gap-2">
		<!-- workspace selector -->
		<WorkspaceSelector />

		<!-- create link -->
		<Button onclick={() => (createLinkOpen = true)}>
			<Plus class="size-4" /> <span class="hidden sm:block">Create Link</span>
		</Button>
	</div>
</div>
<CreateLink bind:open={createLinkOpen} />
