export function getHostname(urlString: string): string {
	try {
		return new URL(urlString).hostname.replace(/^www\./, '');
	} catch {
		return urlString;
	}
}

export function getFavicon(urlString: string): string {
	const hostname = getHostname(urlString);
	return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
}
