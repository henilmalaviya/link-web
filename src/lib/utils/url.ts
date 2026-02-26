export function getHostname(urlString: string): string {
	try {
		return new URL(urlString).hostname.replace(/^www\./, '');
	} catch {
		return urlString;
	}
}

export function getOrigin(urlString: string): string {
	try {
		return new URL(urlString).origin;
	} catch {
		return urlString;
	}
}

export function getFavicon(urlString: string): string {
	const origin = getOrigin(urlString);
	return `https://www.google.com/s2/favicons?domain=${origin}&sz=64`;
}
