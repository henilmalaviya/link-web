<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="flex min-h-[50vh] flex-col items-center justify-center gap-4">
	<h1 class="text-4xl font-bold text-gray-900">Link Not Found</h1>
	<p class="text-lg text-gray-600">
		The short URL <span class="font-mono font-medium text-gray-800">/{page.params.slug}</span> doesn't
		exist.
	</p>
	<a
		href="/"
		class="mt-4 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
	>
		Go Home
	</a>
</div>
