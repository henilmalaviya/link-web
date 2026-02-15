import { error, redirect } from '@sveltejs/kit';
import { resolveLink } from '$lib/server/convex';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	// params.slug is a string like "google" or "workspace/link"
	const segments = params.slug.split('/');

	if (segments.length === 1) {
		const [identifier] = segments;
		const result = await resolveLink(identifier);
		if (!result) throw error(404, 'Link not found');
		throw redirect(302, result.url);
	}

	if (segments.length === 2) {
		const [workspace, identifier] = segments;
		const result = await resolveLink(identifier, workspace);
		if (!result) throw error(404, 'Link not found');
		throw redirect(302, result.url);
	}

	throw error(404, 'Not found');
};
