import { ConvexHttpClient } from 'convex/browser';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from '$convex/_generated/api';

const client = new ConvexHttpClient(PUBLIC_CONVEX_URL);

export async function resolveLink(identifier: string, workspaceName?: string) {
	return client.mutation(api.links.resolveAndLogRedirect, {
		identifier,
		workspaceName
	});
}
