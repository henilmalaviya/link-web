import { user } from '$lib/state/user.svelte';
import { globalState } from '$lib/state/global.svelte';
import type { Id } from '$convex/_generated/dataModel';

export type AuthArgs = {
	userId: Id<'users'>;
	token: string;
};

export function getAuthArgs(): AuthArgs | 'skip' {
	if (!globalState.hydrated || !user.data.current) {
		return 'skip';
	}
	return {
		userId: user.data.current.id as Id<'users'>,
		token: user.data.current.token
	};
}
