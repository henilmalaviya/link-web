import { api } from '$convex/_generated/api';
import type { ConvexClient } from 'convex/browser';
import { PersistedState } from 'runed';
import { generateRandomUsername } from '$lib/utils/username';

export type Account = {
	username: string;
	token: string;
};

type AccountManagerData = {
	accounts: Account[];
	activeUsername: string | null;
};

export class AccountManager {
	data = new PersistedState<AccountManagerData>('link-accounts', {
		accounts: [],
		activeUsername: null
	});

	creating = $state(false);
	ensuring = $state(false);
	ensured = $state(false);

	accounts = $derived(this.data.current.accounts);
	activeUsername = $derived(this.data.current.activeUsername);

	activeAccount = $derived.by(() => {
		const username = this.activeUsername;
		if (!username) return null;
		return this.accounts.find((u) => u.username === username) ?? null;
	});

	authArgs = $derived.by(() => {
		const account = this.activeAccount;
		if (!account) return null;
		return {
			username: account.username,
			token: account.token
		};
	});

	async ensureAccount(convex: ConvexClient) {
		this.ensuring = true;
		this.ensured = false;

		if (this.activeAccount) {
			const isValid = await this.isValidAccount(convex);
			if (isValid) {
				this.ensuring = false;
				this.ensured = true;
				return;
			}
			this.data.current = {
				accounts: this.accounts.filter((u) => u.username !== this.activeUsername),
				activeUsername:
					this.accounts.find((u) => u.username !== this.activeUsername)?.username ?? null
			};
		}

		if (this.accounts.length === 0) {
			await this.createNewAccount(convex);
		} else {
			await this.switchToAccount(this.accounts[0].username);
			const isValid = await this.isValidAccount(convex);
			if (!isValid) {
				this.data.current = {
					accounts: this.accounts.filter((u) => u.username !== this.activeUsername),
					activeUsername: null
				};
				await this.ensureAccount(convex);
			}
		}

		this.ensuring = false;
		this.ensured = true;
	}

	private async isValidAccount(convex: ConvexClient): Promise<boolean> {
		const account = this.activeAccount;
		if (!account) return false;
		try {
			await convex.query(api.accounts.get, {
				username: account.username,
				token: account.token
			});
			return true;
		} catch (e) {
			console.warn('Account validation failed', e);
			return false;
		}
	}

	async createNewAccount(convex: ConvexClient, customUsername?: string) {
		this.creating = true;
		const username = customUsername ?? generateRandomUsername();
		const result = await convex.mutation(api.accounts.create, { username });
		const newAccount: Account = {
			username: result.username,
			token: result.token
		};
		this.data.current = {
			accounts: [...this.accounts, newAccount],
			activeUsername: newAccount.username
		};
		this.creating = false;
		return newAccount;
	}

	async addExistingAccount(convex: ConvexClient, username: string, token: string) {
		this.creating = true;
		try {
			await convex.query(api.accounts.get, { username, token });
		} catch {
			this.creating = false;
			throw new Error('Invalid username or token');
		}
		const existingAccount: Account = { username, token };
		if (this.accounts.find((u) => u.username === username)) {
			this.creating = false;
			throw new Error('Account already exists');
		}
		this.data.current = {
			accounts: [...this.accounts, existingAccount],
			activeUsername: username
		};
		this.creating = false;
		return existingAccount;
	}

	async switchToAccount(username: string) {
		const account = this.accounts.find((u) => u.username === username);
		if (!account) {
			throw new Error('Account not found');
		}
		this.data.current = {
			...this.data.current,
			activeUsername: username
		};
	}

	async removeAccount(convex: ConvexClient, username: string) {
		const account = this.accounts.find((u) => u.username === username);
		if (!account) {
			throw new Error('Account not found');
		}

		await convex.mutation(api.accounts.deleteUser, {
			username: account.username,
			token: account.token
		});

		const newAccounts = this.accounts.filter((u) => u.username !== username);
		const newActive =
			this.activeUsername === username ? (newAccounts[0]?.username ?? null) : this.activeUsername;
		this.data.current = {
			accounts: newAccounts,
			activeUsername: newActive
		};
	}

	async updateUsername(convex: ConvexClient, oldUsername: string, newUsername: string) {
		const token = this.accounts.find((u) => u.username === oldUsername)?.token ?? '';
		await convex.mutation(api.accounts.updateUsername, {
			username: oldUsername,
			token: token,
			newUsername: newUsername
		});

		const account = this.accounts.find((u) => u.username === oldUsername);
		if (!account) return;

		const newAccounts = this.accounts.map((u) =>
			u.username === oldUsername ? { ...u, username: newUsername } : u
		);
		const newActive = this.activeUsername === oldUsername ? newUsername : this.activeUsername;

		this.data.current = {
			accounts: newAccounts,
			activeUsername: newActive
		};
	}
}

export const accountManager = new AccountManager();
