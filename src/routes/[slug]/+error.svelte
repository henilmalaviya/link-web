<script lang="ts">
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import Button from '$lib/components/ui/button/button.svelte';
</script>

<div class="flex min-h-screen flex-col items-center justify-center p-6 text-center">
	<div class="mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
		<AlertCircleIcon class="h-10 w-10 text-muted-foreground" />
	</div>
	<h1 class="text-2xl font-semibold">Link not found</h1>
	<p class="max-w-sm text-muted-foreground">If this is a mistake, please contact the sender.</p>
	<div class="my-3"></div>
	<Button href="/">Go to Home</Button>
</div>
