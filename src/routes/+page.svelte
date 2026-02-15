<script lang="ts">
	import { isHydrated, user } from '$lib/stores/global.svelte';
	import LinkCard from '$lib/components/LinkCard.svelte';
	import CreateLink from '$lib/components/CreateLink.svelte';
	import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '$lib/components/ui/empty';
	import { Button } from '$lib/components/ui/button';
	import LinkIcon from '@lucide/svelte/icons/link';

	const linksToDisplay = $derived(
		user.currentWorkspaceName.current
			? user.links.current.filter((l) => l.workspaceName === user.currentWorkspaceName.current)
			: user.links.current.filter((l) => l.workspaceName === null)
	);

	let createLinkOpen = $state(false);
</script>

{#if !isHydrated.current}
	<!--  -->
{:else if linksToDisplay.length === 0}
	<Empty>
		<EmptyHeader>
			<EmptyTitle>
				{#if user.currentWorkspaceName.current}
					No links in this workspace
				{:else}
					No links yet
				{/if}
			</EmptyTitle>
			<EmptyDescription>
				{#if user.currentWorkspaceName.current}
					Create your first link in this workspace to get started.
				{:else}
					Create your first link to get started.
				{/if}
			</EmptyDescription>
		</EmptyHeader>
		<Button onclick={() => (createLinkOpen = true)}>
			<LinkIcon class="size-4" />
			Create Link
		</Button>
	</Empty>
{:else}
	<div class="flex flex-col gap-4 py-4">
		<div>
			{#each linksToDisplay as link (link.shortId)}
				<LinkCard shortId={link.shortId} secret={link.secret} workspaceName={link.workspaceName} />
			{/each}
		</div>
	</div>
{/if}

<CreateLink bind:open={createLinkOpen} />
