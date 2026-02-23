import { redirect, error, type ServerLoad } from '@sveltejs/kit';
import { api, client } from '$lib/server/convex';

export const load: ServerLoad = async ({ params }) => {
	const shortId = params.slug;
	if (!shortId) {
		throw error(404, 'Not found');
	}

	const link = await client.query(api.links.findByShortId, { shortId });
	if (!link) {
		throw error(404, 'Not found');
	}

	void (async () => {
		try {
			await client.mutation(api.redirects.create, { shortId: link.shortId });
		} catch {
			// ignore
		}
	})();

	throw redirect(302, link.url);
};
