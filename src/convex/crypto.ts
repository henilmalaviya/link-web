'use node';

export const randomBase62Id = (byteLength: number) => {
	const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
	const randomBytes = crypto.getRandomValues(new Uint8Array(byteLength));
	let result = '';
	for (let i = 0; i < randomBytes.length; i++) {
		result += chars[randomBytes[i] % chars.length];
	}
	return result;
};

export async function hash(input: string) {
	const encoder = new TextEncoder();
	const data = encoder.encode(input);

	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));

	// Convert bytes to hex string
	const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

	return hashHex;
}
