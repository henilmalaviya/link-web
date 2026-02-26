import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	const shortId = url.searchParams.get('shortId');
	if (!shortId) {
		throw redirect(302, '/');
	}

	return {};
};
