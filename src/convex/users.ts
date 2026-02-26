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

export async function authorizeUser(
	ctx: QueryCtx | MutationCtx,
	args: {
		username: string;
		token: string;
	}
): Promise<Doc<'users'>> {
	const { username, token } = args;

	const tokenHash = await hash(token);
	const user = await ctx.db
		.query('users')
		.withIndex('byUsername', (q) => q.eq('username', username))
		.first();

	if (!user || user.tokenHash !== tokenHash) {
		throw new Error('Unauthorized');
	}

	return user;
}

export const protectedUserQuery = customQuery(query, {
	args: {
		username: v.string(),
		token: v.string()
	},
	input: async (ctx, data) => {
		const user = await authorizeUser(ctx, data);

		return {
			args: {
				token: data.token
			},
			ctx: {
				user
			}
		};
	}
});

export const protectedUserMutation = customMutation(mutation, {
	args: {
		username: v.string(),
		token: v.string()
	},
	input: async (ctx, data) => {
		const user = await authorizeUser(ctx, data);

		return {
			args: {
				token: data.token
			},
			ctx: {
				user
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
		const user = await authorizeUser(ctx, data);
		const link = await ctx.db
			.query('links')
			.withIndex('byShortId', (q) => q.eq('shortId', data.shortId))
			.first();

		if (!link) {
			throw new ConvexError({ code: 'LINK_NOT_FOUND', message: 'Link not found' });
		}
		if (link.ownerId !== user._id) {
			throw new ConvexError({ code: 'FORBIDDEN', message: 'Forbidden' });
		}

		return {
			args: {
				shortId: data.shortId
			},
			ctx: {
				user,
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
		const user = await authorizeUser(ctx, data);
		const link = await ctx.db
			.query('links')
			.withIndex('byShortId', (q) => q.eq('shortId', data.shortId))
			.first();

		if (!link) {
			throw new ConvexError({ code: 'LINK_NOT_FOUND', message: 'Link not found' });
		}
		if (link.ownerId !== user._id) {
			throw new ConvexError({ code: 'FORBIDDEN', message: 'Forbidden' });
		}

		return {
			args: {
				shortId: data.shortId
			},
			ctx: {
				user,
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
			.query('users')
			.withIndex('byUsername', (q) => q.eq('username', args.username))
			.first();

		if (existing) {
			throw new ConvexError({ code: 'USERNAME_TAKEN', message: 'Username already taken' });
		}

		const token = randomBase62Id(32);
		const tokenHash = await hash(token);

		const userId = await ctx.db.insert('users', {
			tokenHash,
			username: args.username
		});

		return {
			id: userId,
			token,
			username: args.username
		};
	}
});

export const get = protectedUserQuery({
	args: {},
	handler: async (ctx) => {
		return {
			id: ctx.user._id,
			username: ctx.user.username,
			createdAt: ctx.user._creationTime
		};
	}
});

export const updateUsername = protectedUserMutation({
	args: {
		newUsername: v.string()
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query('users')
			.withIndex('byUsername', (q) => q.eq('username', args.newUsername))
			.first();

		if (existing && existing._id !== ctx.user._id) {
			throw new ConvexError({ code: 'USERNAME_TAKEN', message: 'Username already taken' });
		}

		await ctx.db.patch(ctx.user._id, {
			username: args.newUsername
		});

		return { success: true };
	}
});

export const deleteUser = protectedUserMutation({
	args: {},
	handler: async (ctx) => {
		const userId = ctx.user._id;

		const links = await ctx.db
			.query('links')
			.withIndex('byOwnerId', (q) => q.eq('ownerId', userId))
			.collect();

		for (const link of links) {
			const redirects = await ctx.db
				.query('redirects')
				.withIndex('byShortId', (q) => q.eq('shortId', link.shortId))
				.collect();

			for (const redirect of redirects) {
				await ctx.db.delete(redirect._id);
			}

			await ctx.db.delete(link._id);
		}

		await ctx.db.delete(userId);

		return { success: true };
	}
});
