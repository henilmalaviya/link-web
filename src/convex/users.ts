import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { customMutation, customQuery } from 'convex-helpers/server/customFunctions';
import { hash, randomBase62Id } from './crypto';
import type { Doc, Id } from './_generated/dataModel';

// Public query and mutation helpers
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

/* -------------------------------------------------------------------------- */
// HELPERS
export async function authorizeUser(
	ctx: QueryCtx | MutationCtx,
	args: {
		userId: Id<'users'>;
		token: string;
	}
): Promise<Doc<'users'>> {
	const { userId, token } = args;

	const tokenHash = await hash(token);
	const user = await ctx.db.get('users', userId);

	if (!user || user.tokenHash !== tokenHash) {
		throw new Error('Unauthorized');
	}

	return user;
}

/* -------------------------------------------------------------------------- */
// MIDDLEWARES
export const protectedUserQuery = customQuery(query, {
	args: {
		userId: v.id('users'),
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
		userId: v.id('users'),
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
		userId: v.id('users'),
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
		userId: v.id('users'),
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

/* -------------------------------------------------------------------------- */
// PUBLIC FUNCTIONS

export const create = mutation({
	handler: async (ctx) => {
		const token = randomBase62Id(32);

		const tokenHash = await hash(token);

		const userId = await ctx.db.insert('users', {
			tokenHash
		});

		return {
			id: userId,
			token
		};
	}
});

export const get = protectedUserQuery({
	args: {},
	handler: async (ctx) => {
		return {
			id: ctx.user._id,
			createdAt: ctx.user._creationTime
		};
	}
});
