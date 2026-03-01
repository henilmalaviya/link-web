<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog/index.js';
	import {
		Drawer,
		DrawerContent,
		DrawerDescription,
		DrawerFooter,
		DrawerHeader,
		DrawerTitle
	} from '$lib/components/ui/drawer/index.js';
	import { MediaQuery } from 'svelte/reactivity';
	import { toast } from 'svelte-sonner';
	import { Copy, Download, QrCode } from '@lucide/svelte';
	import QRCode from './QRCode.svelte';

	interface Props {
		open: boolean;
		shortId: string;
		shortUrl: string;
	}

	let { open = $bindable(), shortId, shortUrl }: Props = $props();

	const isMobile = new MediaQuery('(max-width: 640px)');
	const useDrawer = $derived(isMobile.current);

	let scale = $state(4);
	let darkColor = $state('#000000');
	let lightColor = $state('#ffffff');
	let qrCodeRef: QRCode | undefined = $state();
	let isCopying = $state(false);
	let isDownloading = $state(false);

	const scaleOptions = [
		{ value: 4, label: '4x (1024px)', description: 'Very High (Default)' },
		{ value: 1, label: '1x (256px)', description: 'Standard' },
		{ value: 2, label: '2x (512px)', description: 'High' },
		{ value: 8, label: '8x (2048px)', description: 'Ultra' }
	];

	const handleOpenChange = (nextOpen: boolean) => {
		open = nextOpen;
		if (!nextOpen) {
			resetForm();
		}
	};

	const resetForm = () => {
		scale = 4;
		darkColor = '#000000';
		lightColor = '#ffffff';
	};

	const handleCopy = async () => {
		if (!qrCodeRef || isCopying) return;

		isCopying = true;
		try {
			const dataUrl = await qrCodeRef.toDataURL(scale);
			if (dataUrl) {
				const response = await fetch(dataUrl);
				const blob = await response.blob();
				await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
				toast.success('QR code copied to clipboard');
			}
		} catch (error) {
			toast.error('Failed to copy QR code');
			console.error(error);
		} finally {
			isCopying = false;
		}
	};

	const handleDownload = async () => {
		if (!qrCodeRef || isDownloading) return;

		isDownloading = true;
		try {
			const dataUrl = await qrCodeRef.toDataURL(scale);
			if (dataUrl) {
				const link = document.createElement('a');
				link.download = `qr-${shortId}.png`;
				link.href = dataUrl;
				link.click();
				toast.success('QR code downloaded');
			}
		} catch (error) {
			toast.error('Failed to download QR code');
			console.error(error);
		} finally {
			isDownloading = false;
		}
	};
</script>

{#if useDrawer}
	<Drawer {open} onOpenChange={handleOpenChange}>
		<DrawerContent>
			<DrawerHeader class="">
				<DrawerTitle class="flex items-center gap-2">
					<QrCode class="h-5 w-5" />
					QR Code
				</DrawerTitle>
				<DrawerDescription>Customize and download a QR code for /{shortId}</DrawerDescription>
			</DrawerHeader>
			<form
				class="mt-4 grid gap-4 px-4"
				onsubmit={(e) => {
					e.preventDefault();
				}}
			>
				<div class="flex justify-center rounded-lg border bg-white p-4">
					<QRCode bind:this={qrCodeRef} value={shortUrl} {scale} {darkColor} {lightColor} />
				</div>
				<div class="grid gap-4">
					<div class="grid gap-2">
						<Label for="qr-quality">Quality</Label>
						<select
							id="qr-quality"
							class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
							bind:value={scale}
						>
							{#each scaleOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div class="grid gap-2">
							<Label for="qr-dark">Dark Color</Label>
							<div class="flex gap-2">
								<Input
									id="qr-dark"
									type="color"
									class="h-10 w-12 cursor-pointer p-1"
									bind:value={darkColor}
								/>
								<Input type="text" class="font-mono" bind:value={darkColor} />
							</div>
						</div>
						<div class="grid gap-2">
							<Label for="qr-light">Light Color</Label>
							<div class="flex gap-2">
								<Input
									id="qr-light"
									type="color"
									class="h-10 w-12 cursor-pointer p-1"
									bind:value={lightColor}
								/>
								<Input type="text" class="font-mono" bind:value={lightColor} />
							</div>
						</div>
					</div>
				</div>
				<DrawerFooter class="">
					<Button type="button" variant="outline" onclick={() => handleOpenChange(false)}>
						Close
					</Button>
					<Button type="button" variant="outline" onclick={handleCopy} disabled={isCopying}>
						<Copy class="mr-2 h-4 w-4" />
						{isCopying ? 'Copying...' : 'Copy'}
					</Button>
					<Button type="button" onclick={handleDownload} disabled={isDownloading}>
						<Download class="mr-2 h-4 w-4" />
						{isDownloading ? 'Downloading...' : 'Download PNG'}
					</Button>
				</DrawerFooter>
			</form>
		</DrawerContent>
	</Drawer>
{:else}
	<Dialog {open} onOpenChange={handleOpenChange}>
		<DialogContent class="sm:max-w-[480px]">
			<DialogHeader class="">
				<DialogTitle class="flex items-center gap-2">
					<QrCode class="h-5 w-5" />
					QR Code
				</DialogTitle>
				<DialogDescription>
					Customize and download a QR code for /{shortId}
				</DialogDescription>
			</DialogHeader>
			<div class="grid gap-4 py-4">
				<div class="flex justify-center rounded-lg border bg-white p-4">
					<QRCode bind:this={qrCodeRef} value={shortUrl} {scale} {darkColor} {lightColor} />
				</div>
				<div class="grid gap-4">
					<div class="grid gap-2">
						<Label for="qr-quality">Quality</Label>
						<select
							id="qr-quality"
							class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
							bind:value={scale}
						>
							{#each scaleOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div class="grid gap-2">
							<Label for="qr-dark">Dark Color</Label>
							<div class="flex gap-2">
								<Input
									id="qr-dark"
									type="color"
									class="h-10 w-12 cursor-pointer p-1"
									bind:value={darkColor}
								/>
								<Input type="text" class="font-mono" bind:value={darkColor} />
							</div>
						</div>
						<div class="grid gap-2">
							<Label for="qr-light">Light Color</Label>
							<div class="flex gap-2">
								<Input
									id="qr-light"
									type="color"
									class="h-10 w-12 cursor-pointer p-1"
									bind:value={lightColor}
								/>
								<Input type="text" class="font-mono" bind:value={lightColor} />
							</div>
						</div>
					</div>
				</div>
			</div>
			<DialogFooter class="sm:justify-between">
				<Button type="button" variant="outline" onclick={handleCopy} disabled={isCopying}>
					<Copy class="mr-2 h-4 w-4" />
					{isCopying ? 'Copying...' : 'Copy'}
				</Button>
				<Button type="button" onclick={handleDownload} disabled={isDownloading}>
					<Download class="mr-2 h-4 w-4" />
					{isDownloading ? 'Downloading...' : 'Download PNG'}
				</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
{/if}
