import { publicMutation, protectedUserQuery } from './users';
import { linkSchema } from './schema';

export const create = publicMutation({
	args: {
		shortId: linkSchema.shortId
	},
	handler: async (ctx, { shortId }) => {
		await ctx.db.insert('redirects', {
			shortId
		});
		return { ok: true };
	}
});

export const countByShortId = protectedUserQuery({
	args: {
		shortId: linkSchema.shortId
	},
	handler: async (ctx, { shortId }) => {
		const link = await ctx.db
			.query('links')
			.withIndex('byShortId', (q) => q.eq('shortId', shortId))
			.first();
		if (!link || link.ownerId !== ctx.user._id) {
			return 0;
		}

		const redirects = await ctx.db
			.query('redirects')
			.withIndex('byShortId', (q) => q.eq('shortId', shortId))
			.collect();

		return redirects.length;
	}
});
