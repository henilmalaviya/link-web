import { error, redirect } from '@sveltejs/kit';
import { client, api } from '$lib/server/convex';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { slug } = params;

	const link = await client.query(api.links.findByShortId, { shortId: slug });

	if (!link) {
		throw error(404, { message: 'Link not found' });
	}

	client.mutation(api.redirects.logRedirect, { linkId: link._id }).catch(() => {});

	throw redirect(302, link.url);
};
