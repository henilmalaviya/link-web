import { v } from 'convex/values';
import { mutation, MutationCtx, query, QueryCtx } from './_generated/server';
import { customMutation, customQuery } from 'convex-helpers/server/customFunctions';
import { hash, randomBase62Id } from './crypto';
import { Doc, Id } from './_generated/dataModel';

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
