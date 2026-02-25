import { useQuery } from 'convex-svelte';
import { api } from '$convex/_generated/api';
import { user } from '$lib/state/user.svelte';
import { globalState } from '$lib/state/global.svelte';
import type { Id } from '$convex/_generated/dataModel';

export function useLink(shortIdGetter: () => string) {
	const linkResult = useQuery(api.links.getByShortId, () => {
		const shortId = shortIdGetter();
		if (!globalState.hydrated || !user.data.current || !shortId) {
			return 'skip';
		}
		return {
			userId: user.data.current.id as Id<'users'>,
			token: user.data.current.token,
			shortId
		};
	});

	const isLoading = $derived(!globalState.hydrated || linkResult.isLoading);
	const link = $derived(linkResult.data);
	const error = $derived(linkResult.error);

	return {
		get isLoading() {
			return isLoading;
		},
		get link() {
			return link;
		},
		get error() {
			return error;
		}
	};
}
