export function generateRandomBytes(bytes: number = 16): string {
	const arr = new Uint8Array(bytes);
	crypto.getRandomValues(arr);
	return btoa(String.fromCharCode(...arr));
}

export function generateShortId(bytes: number = 4): string {
	const arr = new Uint8Array(bytes);
	crypto.getRandomValues(arr);
	return btoa(String.fromCharCode(...arr))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

export async function hashString(
	input: string,
	algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256'
): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(input);
	const hashBuffer = await crypto.subtle.digest(algorithm, data);
	const hashArray = new Uint8Array(hashBuffer);
	return Array.from(hashArray)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}
