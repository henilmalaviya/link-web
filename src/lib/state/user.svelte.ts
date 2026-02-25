import { api } from '$convex/_generated/api';
import type { Id } from '$convex/_generated/dataModel';
import type { ConvexClient } from 'convex/browser';
import { PersistedState } from 'runed';

export type UserState = {
	id: string;
	token: string;
};

export class User {
	data = new PersistedState<UserState | null>('user', null);
	exists = $derived(this.data.current !== null);
	creating = $state(false);
	ensuring = $state(false);
	ensured = $state(false);

	public async ensureUser(convex: ConvexClient) {
		this.ensuring = true;
		this.ensured = false;
		if (this.exists) {
			// validate
			const isValid = await this.isValidUser(convex);
			if (isValid) {
				this.ensuring = false;
				this.ensured = true;
				return;
			}

			// invalid, reset
			this.data.current = null;
		}

		await this.createUser(convex);
		this.ensuring = false;
		this.ensured = true;
	}

	private async isValidUser(convex: ConvexClient): Promise<boolean> {
		const user = this.data.current;
		if (!user) return false;
		try {
			await convex.query(api.users.get, {
				userId: user.id as Id<'users'>,
				token: user.token
			});

			return true;
		} catch (e) {
			console.warn('User validation failed', e);
			return false;
		}
	}

	public async createUser(convex: ConvexClient) {
		this.creating = true;
		const { id, token } = await convex.mutation(api.users.create, {});
		this.data.current = { id, token };
		this.creating = false;
	}
}

export const user = new User();
