function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
	}
	return Math.abs(hash);
}

export function getTagColor(tag: string): string {
	const hash = hashString(tag);
	const hue = hash % 360;
	return `hsl(${hue}, 70%, 85%)`;
}

export function getTagTextColor(tag: string): string {
	const hash = hashString(tag);
	const hue = hash % 360;
	return `hsl(${hue}, 70%, 25%)`;
}
