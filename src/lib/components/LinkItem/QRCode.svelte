<script lang="ts">
	import QRCodeLib from 'qrcode';

	interface Props {
		value: string;
		scale?: number;
		darkColor?: string;
		lightColor?: string;
	}

	let { value, scale = 4, darkColor = '#000000', lightColor = '#ffffff' }: Props = $props();

	let canvas: HTMLCanvasElement | undefined = $state();

	$effect(() => {
		if (canvas && value) {
			QRCodeLib.toCanvas(canvas, value, {
				scale: scale,
				color: {
					dark: darkColor,
					light: lightColor
				},
				margin: 2
			}).catch(console.error);
		}
	});

	export async function toDataURL(downloadScale?: number): Promise<string | null> {
		if (!value) return null;
		const effectiveScale = downloadScale ?? scale;
		return QRCodeLib.toDataURL(value, {
			scale: effectiveScale,
			color: {
				dark: darkColor,
				light: lightColor
			},
			margin: 2
		});
	}
</script>

<canvas bind:this={canvas} class="block h-64 w-64"></canvas>
