import { useQuery } from 'convex-svelte';
import { api } from '$convex/_generated/api';
import { userManager } from '$lib/state/userManager.svelte';
import { globalState } from '$lib/state/global.svelte';

export function useLink(shortIdGetter: () => string) {
	const linkResult = useQuery(api.links.getByShortId, () => {
		const shortId = shortIdGetter();
		if (!globalState.hydrated || !userManager.activeAccount || !shortId) {
			return 'skip';
		}
		return {
			username: userManager.activeAccount.username,
			token: userManager.activeAccount.token,
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
