import { UAParser } from 'ua-parser-js';

export function parseUserAgent(userAgent: string | undefined): {
	os?: string;
	browser?: string;
	device?: string;
} {
	if (!userAgent) {
		return {};
	}

	const result = UAParser(userAgent);

	const parsed: { os?: string; browser?: string; device?: string } = {};

	if (result.os.name) {
		parsed.os = result.os.name;
	}

	if (result.browser.name) {
		parsed.browser = result.browser.name;
	}

	// The Fix: If device type is undefined but we found an OS or Browser, it's a desktop
	if (result.device.type) {
		parsed.device = result.device.type;
	} else if (result.os.name || result.browser.name) {
		parsed.device = 'desktop';
	}

	return parsed;
}
