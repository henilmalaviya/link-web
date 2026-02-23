<script lang="ts">
	import { cn } from '$lib/utils';

	interface StatPoint {
		date: string;
		count: number;
	}

	interface Props {
		data: StatPoint[];
		class?: string;
		height?: number;
		barWidth?: number;
	}

	let { data, class: className, height = 24, barWidth = 6 }: Props = $props();

	const maxCount = $derived(Math.max(...data.map((d) => d.count), 1));

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
	}
</script>

<div class={cn('flex items-end gap-0.5', className)} style="height: {height}px;">
	{#each data as point, i (i)}
		{@const barHeight = maxCount > 0 ? Math.max(2, (point.count / maxCount) * height) : 2}
		<div
			class="rounded-sm bg-primary/60 transition-colors hover:bg-primary/80"
			style="width: {barWidth}px; height: {barHeight}px;"
			title="{formatDate(point.date)}: {point.count} click{point.count !== 1 ? 's' : ''}"
		></div>
	{/each}
</div>
