import { api } from '$convex/_generated/api';
import type { ConvexClient } from 'convex/browser';
import { PersistedState } from 'runed';
import { generateRandomUsername } from '$lib/utils/username';

export type UserAccount = {
	username: string;
	token: string;
};

type UserManagerData = {
	users: UserAccount[];
	activeUsername: string | null;
};

export class UserManager {
	data = new PersistedState<UserManagerData>('link-users', {
		users: [],
		activeUsername: null
	});

	creating = $state(false);
	ensuring = $state(false);
	ensured = $state(false);

	users = $derived(this.data.current.users);
	activeUsername = $derived(this.data.current.activeUsername);

	activeAccount = $derived.by(() => {
		const username = this.activeUsername;
		if (!username) return null;
		return this.users.find((u) => u.username === username) ?? null;
	});

	authArgs = $derived.by(() => {
		const account = this.activeAccount;
		if (!account) return null;
		return {
			username: account.username,
			token: account.token
		};
	});

	async ensureUser(convex: ConvexClient) {
		this.ensuring = true;
		this.ensured = false;

		if (this.activeAccount) {
			const isValid = await this.isValidUser(convex);
			if (isValid) {
				this.ensuring = false;
				this.ensured = true;
				return;
			}
			this.data.current = {
				users: this.users.filter((u) => u.username !== this.activeUsername),
				activeUsername: this.users.find((u) => u.username !== this.activeUsername)?.username ?? null
			};
		}

		if (this.users.length === 0) {
			await this.createNewUser(convex);
		} else {
			await this.switchToUser(this.users[0].username);
			const isValid = await this.isValidUser(convex);
			if (!isValid) {
				this.data.current = {
					users: this.users.filter((u) => u.username !== this.activeUsername),
					activeUsername: null
				};
				await this.ensureUser(convex);
			}
		}

		this.ensuring = false;
		this.ensured = true;
	}

	private async isValidUser(convex: ConvexClient): Promise<boolean> {
		const account = this.activeAccount;
		if (!account) return false;
		try {
			await convex.query(api.users.get, {
				username: account.username,
				token: account.token
			});
			return true;
		} catch (e) {
			console.warn('User validation failed', e);
			return false;
		}
	}

	async createNewUser(convex: ConvexClient, customUsername?: string) {
		this.creating = true;
		const username = customUsername ?? generateRandomUsername();
		const result = await convex.mutation(api.users.create, { username });
		const newUser: UserAccount = {
			username: result.username,
			token: result.token
		};
		this.data.current = {
			users: [...this.users, newUser],
			activeUsername: newUser.username
		};
		this.creating = false;
		return newUser;
	}

	async addExistingUser(convex: ConvexClient, username: string, token: string) {
		this.creating = true;
		try {
			await convex.query(api.users.get, { username, token });
		} catch {
			this.creating = false;
			throw new Error('Invalid username or token');
		}
		const existingUser: UserAccount = { username, token };
		if (this.users.find((u) => u.username === username)) {
			this.creating = false;
			throw new Error('User already exists');
		}
		this.data.current = {
			users: [...this.users, existingUser],
			activeUsername: username
		};
		this.creating = false;
		return existingUser;
	}

	async switchToUser(username: string) {
		const user = this.users.find((u) => u.username === username);
		if (!user) {
			throw new Error('User not found');
		}
		this.data.current = {
			...this.data.current,
			activeUsername: username
		};
	}

	async removeUser(convex: ConvexClient, username: string) {
		const user = this.users.find((u) => u.username === username);
		if (!user) {
			throw new Error('User not found');
		}

		await convex.mutation(api.users.deleteUser, {
			username: user.username,
			token: user.token
		});

		const newUsers = this.users.filter((u) => u.username !== username);
		const newActive =
			this.activeUsername === username ? (newUsers[0]?.username ?? null) : this.activeUsername;
		this.data.current = {
			users: newUsers,
			activeUsername: newActive
		};
	}

	async updateUsername(convex: ConvexClient, oldUsername: string, newUsername: string) {
		const token = this.users.find((u) => u.username === oldUsername)?.token ?? '';
		await convex.mutation(api.users.updateUsername, {
			username: oldUsername,
			token: token,
			newUsername: newUsername
		});

		const user = this.users.find((u) => u.username === oldUsername);
		if (!user) return;

		const newUsers = this.users.map((u) =>
			u.username === oldUsername ? { ...u, username: newUsername } : u
		);
		const newActive = this.activeUsername === oldUsername ? newUsername : this.activeUsername;

		this.data.current = {
			users: newUsers,
			activeUsername: newActive
		};
	}
}

export const userManager = new UserManager();
