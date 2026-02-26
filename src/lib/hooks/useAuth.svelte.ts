import { userManager } from '$lib/state/userManager.svelte';
import { globalState } from '$lib/state/global.svelte';

export type AuthArgs = {
	username: string;
	token: string;
};

export function getAuthArgs(): AuthArgs | 'skip' {
	if (!globalState.hydrated || !userManager.activeAccount) {
		return 'skip';
	}
	return {
		username: userManager.activeAccount.username,
		token: userManager.activeAccount.token
	};
}
