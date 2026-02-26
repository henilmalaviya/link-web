import { ConvexError, v } from 'convex/values';
import { linkSchema } from './schema';
import {
	protectedUserMutation,
	protectedUserQuery,
	protectedShortIdQuery,
	protectedShortIdMutation,
	publicQuery
} from './users';
import { randomBase62Id } from './crypto';
import type { MutationCtx, QueryCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';

/* -------------------------------------------------------------------------- */
// HELPERS

async function generateUniqueShortId(ctx: QueryCtx | MutationCtx): Promise<string> {
	let attempts = 0;
	let length = 4;
	const maxLength = 6;

	while (true) {
		if (length > maxLength) {
			throw new Error('Unable to generate unique short ID');
		}

		const shortId = randomBase62Id(length);
		const existingLink = await ctx.db
			.query('links')
			.withIndex('byShortId', (q) => q.eq('shortId', shortId))
			.first();
		if (!existingLink) {
			return shortId;
		}

		attempts++;
		if (attempts > 10) {
			length++;
			attempts = 0;
		}
	}
}

/* -------------------------------------------------------------------------- */
// PUBLIC FUNCTIONS

export const findByShortId = publicQuery({
	args: { shortId: linkSchema.shortId },
	handler: async (ctx, data) => {
		const { shortId } = data;
		return ctx.db
			.query('links')
			.withIndex('byShortId', (q) => q.eq('shortId', shortId))
			.first();
	}
});

/* -------------------------------------------------------------------------- */
// PROTECTED FUNCTIONS

export const create = protectedUserMutation({
	args: {
		url: linkSchema.url,
		shortId: v.optional(linkSchema.shortId)
	},
	handler: async (ctx, data) => {
		const { url, shortId } = data;

		const finalShortId = shortId || (await generateUniqueShortId(ctx));

		const existingLink = await ctx.db
			.query('links')
			.withIndex('byShortId', (q) => q.eq('shortId', finalShortId))
			.first();
		if (existingLink) {
			throw new ConvexError({ code: 'SHORT_ID_TAKEN', message: 'Short link already in use' });
		}

		const linkId = await ctx.db.insert('links', {
			url,
			shortId: finalShortId,
			ownerId: ctx.user._id
		});

		return {
			id: linkId,
			url: url,
			shortId: finalShortId
		};
	}
});

export const generateShortId = protectedUserMutation({
	args: {},
	handler: async (ctx) => {
		return generateUniqueShortId(ctx);
	}
});

export const listShortIdsByUser = protectedUserQuery({
	args: {
		search: v.optional(v.string()),
		orderBy: v.optional(
			v.union(
				v.literal('newest'),
				v.literal('oldest'),
				v.literal('most_clicks'),
				v.literal('least_clicks')
			)
		),
		limit: v.optional(v.number()),
		skip: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const search = args.search?.toLowerCase();
		const orderBy = args.orderBy ?? 'newest';
		const limit = args.limit ?? 10;
		const skip = args.skip ?? 0;

		let links = await ctx.db
			.query('links')
			.withIndex('byOwnerId', (q) => q.eq('ownerId', ctx.user._id))
			.collect();

		if (search) {
			links = links.filter(
				(link) =>
					link.shortId.toLowerCase().includes(search) || link.url.toLowerCase().includes(search)
			);
		}

		const total = links.length;

		if (orderBy === 'newest') {
			links.sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0));
		} else if (orderBy === 'oldest') {
			links.sort((a, b) => (a._creationTime ?? 0) - (b._creationTime ?? 0));
		} else if (orderBy === 'most_clicks' || orderBy === 'least_clicks') {
			const shortIds = links.map((l) => l.shortId);
			const clickCounts: Record<string, number> = {};

			for (const shortId of shortIds) {
				const redirects = await ctx.db
					.query('redirects')
					.withIndex('byShortId', (q) => q.eq('shortId', shortId))
					.collect();
				clickCounts[shortId] = redirects.length;
			}

			links.sort((a, b) => {
				const countA = clickCounts[a.shortId] ?? 0;
				const countB = clickCounts[b.shortId] ?? 0;
				return orderBy === 'most_clicks' ? countB - countA : countA - countB;
			});
		}

		const paginatedLinks = links.slice(skip, skip + limit);

		return {
			links: paginatedLinks.map((link) => ({ shortId: link.shortId })),
			total
		};
	}
});

export const getByShortId = protectedShortIdQuery({
	args: {},
	handler: async (ctx) => {
		return ctx.link;
	}
});

export const update = protectedShortIdMutation({
	args: { url: linkSchema.url },
	handler: async (ctx, { url }) => {
		await ctx.db.patch(ctx.link._id, { url });
		return { ok: true };
	}
});

export const deleteLink = protectedShortIdMutation({
	args: {},
	handler: async (ctx) => {
		const link = ctx.link;

		const redirects = await ctx.db
			.query('redirects')
			.withIndex('byShortId', (q) => q.eq('shortId', link.shortId))
			.collect();

		for (const redirect of redirects) {
			await ctx.db.delete(redirect._id);
		}

		await ctx.db.delete(link._id);
		return { ok: true };
	}
});
