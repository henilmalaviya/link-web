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

	if (result.device.type) {
		parsed.device = result.device.type;
	}

	return parsed;
}
