import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { customMutation, customQuery } from 'convex-helpers/server/customFunctions';
import { hash, randomBase62Id } from './crypto';
import type { Doc, Id } from './_generated/dataModel';

export const publicQuery = customQuery(query, {
	args: {},
	input: async (ctx, data) => {
		return {
			args: {},
			ctx: {}
		};
	}
});

export const publicMutation = customMutation(mutation, {
	args: {},
	input: async (ctx, data) => {
		return {
			args: {},
			ctx: {}
		};
	}
});

export async function authorizeAccount(
	ctx: QueryCtx | MutationCtx,
	args: {
		username: string;
		token: string;
	}
): Promise<Doc<'accounts'>> {
	const { username, token } = args;

	const tokenHash = await hash(token);
	const account = await ctx.db
		.query('accounts')
		.withIndex('byUsername', (q) => q.eq('username', username))
		.first();

	if (!account || account.tokenHash !== tokenHash) {
		throw new Error('Unauthorized');
	}

	return account;
}

export const protectedAccountQuery = customQuery(query, {
	args: {
		username: v.string(),
		token: v.string()
	},
	input: async (ctx, data) => {
		const account = await authorizeAccount(ctx, data);

		return {
			args: {
				token: data.token
			},
			ctx: {
				account
			}
		};
	}
});

export const protectedAccountMutation = customMutation(mutation, {
	args: {
		username: v.string(),
		token: v.string()
	},
	input: async (ctx, data) => {
		const account = await authorizeAccount(ctx, data);

		return {
			args: {
				token: data.token
			},
			ctx: {
				account
			}
		};
	}
});

export const protectedShortIdQuery = customQuery(query, {
	args: {
		username: v.string(),
		token: v.string(),
		shortId: v.string()
	},
	input: async (ctx, data) => {
		const account = await authorizeAccount(ctx, data);
		const link = await ctx.db
			.query('links')
			.withIndex('byShortId', (q) => q.eq('shortId', data.shortId))
			.first();

		if (!link) {
			throw new ConvexError({ code: 'LINK_NOT_FOUND', message: 'Link not found' });
		}
		if (link.ownerId !== account._id) {
			throw new ConvexError({ code: 'FORBIDDEN', message: 'Forbidden' });
		}

		return {
			args: {
				shortId: data.shortId
			},
			ctx: {
				account,
				link
			}
		};
	}
});

export const protectedShortIdMutation = customMutation(mutation, {
	args: {
		username: v.string(),
		token: v.string(),
		shortId: v.string()
	},
	input: async (ctx, data) => {
		const account = await authorizeAccount(ctx, data);
		const link = await ctx.db
			.query('links')
			.withIndex('byShortId', (q) => q.eq('shortId', data.shortId))
			.first();

		if (!link) {
			throw new ConvexError({ code: 'LINK_NOT_FOUND', message: 'Link not found' });
		}
		if (link.ownerId !== account._id) {
			throw new ConvexError({ code: 'FORBIDDEN', message: 'Forbidden' });
		}

		return {
			args: {
				shortId: data.shortId
			},
			ctx: {
				account,
				link
			}
		};
	}
});

export const create = mutation({
	args: {
		username: v.string()
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query('accounts')
			.withIndex('byUsername', (q) => q.eq('username', args.username))
			.first();

		if (existing) {
			throw new ConvexError({ code: 'USERNAME_TAKEN', message: 'Username already taken' });
		}

		const token = randomBase62Id(32);
		const tokenHash = await hash(token);

		const accountId = await ctx.db.insert('accounts', {
			tokenHash,
			username: args.username
		});

		return {
			id: accountId,
			token,
			username: args.username
		};
	}
});

export const get = protectedAccountQuery({
	args: {},
	handler: async (ctx) => {
		return {
			id: ctx.account._id,
			username: ctx.account.username,
			createdAt: ctx.account._creationTime
		};
	}
});

export const updateUsername = protectedAccountMutation({
	args: {
		newUsername: v.string()
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query('accounts')
			.withIndex('byUsername', (q) => q.eq('username', args.newUsername))
			.first();

		if (existing && existing._id !== ctx.account._id) {
			throw new ConvexError({ code: 'USERNAME_TAKEN', message: 'Username already taken' });
		}

		await ctx.db.patch(ctx.account._id, {
			username: args.newUsername
		});

		return { success: true };
	}
});

export const deleteUser = protectedAccountMutation({
	args: {},
	handler: async (ctx) => {
		const accountId = ctx.account._id;

		const links = await ctx.db
			.query('links')
			.withIndex('byOwnerId', (q) => q.eq('ownerId', accountId))
			.collect();

		for (const link of links) {
			while (true) {
				const redirects = await ctx.db
					.query('redirects')
					.withIndex('byShortId', (q) => q.eq('shortId', link.shortId))
					.take(100);

				if (redirects.length === 0) {
					break;
				}

				for (const redirect of redirects) {
					await ctx.db.delete(redirect._id);
				}
			}

			await ctx.db.delete(link._id);
		}

		await ctx.db.delete(accountId);

		return { success: true };
	}
});
