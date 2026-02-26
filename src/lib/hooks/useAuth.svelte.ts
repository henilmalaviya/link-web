import { accountManager } from '$lib/state/accountManager.svelte';
import { globalState } from '$lib/state/global.svelte';

export type AuthArgs = {
	username: string;
	token: string;
};

export function getAuthArgs(): AuthArgs | 'skip' {
	if (!globalState.hydrated || !accountManager.activeAccount) {
		return 'skip';
	}
	return {
		username: accountManager.activeAccount.username,
		token: accountManager.activeAccount.token
	};
}
