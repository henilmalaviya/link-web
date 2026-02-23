import { v } from 'convex/values';
import { linkSchema } from './schema';
import { protectedUserMutation, protectedUserQuery } from './users';
import { randomBase62Id } from './crypto';
import type { Doc, Id } from './_generated/dataModel';
import { query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';

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

async function authorizeLinkOwner(
	ctx: QueryCtx | MutationCtx,
	args: {
		linkId: Id<'links'>;
		userId: Id<'users'>;
	}
): Promise<Doc<'links'>> {
	const link = await ctx.db.get(args.linkId);
	if (!link) {
		throw new Error('Link not found');
	}

	if (link.ownerId !== args.userId) {
		throw new Error('Unauthorized');
	}

	return link;
}

async function authorizeLinkOwnerByShortId(
	ctx: QueryCtx | MutationCtx,
	args: {
		shortId: string;
		userId: Id<'users'>;
	}
): Promise<Doc<'links'>> {
	const { shortId } = args;

	const link = await ctx.db
		.query('links')
		.withIndex('byShortId', (q) => q.eq('shortId', shortId))
		.first();
	if (!link) {
		throw new Error('Link not found');
	}

	if (link.ownerId !== args.userId) {
		throw new Error('Unauthorized');
	}

	return link;
}

/* -------------------------------------------------------------------------- */
// PUBLIC FUNCTIONS

export const findByShortId = query({
	args: {
		shortId: v.string()
	},
	handler: async (ctx, args) => {
		const link = await ctx.db
			.query('links')
			.withIndex('byShortId', (q) => q.eq('shortId', args.shortId))
			.first();

		if (!link) {
			return null;
		}

		return {
			_id: link._id,
			url: link.url,
			shortId: link.shortId
		};
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
			throw new Error('Short ID already in use');
		}

		const linkId = await ctx.db.insert('links', {
			url,
			shortId: finalShortId,
			ownerId: ctx.user._id,
			createdAt: Date.now()
		});

		return {
			id: linkId,
			url: url,
			shortId: finalShortId
		};
	}
});

export const getByShortId = protectedUserQuery({
	args: {
		shortId: v.string()
	},
	handler: async (ctx, data) => {
		const link = await authorizeLinkOwnerByShortId(ctx, {
			shortId: data.shortId,
			userId: ctx.user._id
		});
		return {
			shortId: link.shortId,
			url: link.url,
			creationTime: link._creationTime
		};
	}
});

export const getAll = protectedUserQuery({
	args: {},
	handler: async (ctx) => {
		const links = await ctx.db
			.query('links')
			.filter((q) => q.eq(q.field('ownerId'), ctx.user._id))
			.collect();

		const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

		const initStats = () => {
			const stats: Record<string, number> = {};
			for (let i = 0; i < 7; i++) {
				const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
				const dateKey = date.toISOString().split('T')[0];
				stats[dateKey] = 0;
			}
			return stats;
		};

		const linksWithStats = await Promise.all(
			links.map(async (link) => {
				const redirects = await ctx.db
					.query('redirects')
					.withIndex('byLinkId', (q) => q.eq('linkId', link._id))
					.filter((q) => q.gte(q.field('redirectedAt'), sevenDaysAgo))
					.collect();

				const statsByDay = initStats();

				for (const redirect of redirects) {
					const date = new Date(redirect.redirectedAt);
					const dateKey = date.toISOString().split('T')[0];
					if (dateKey in statsByDay) {
						statsByDay[dateKey]++;
					}
				}

				const stats = Object.entries(statsByDay)
					.map(([date, count]) => ({ date, count }))
					.sort((a, b) => a.date.localeCompare(b.date));

				return {
					_id: link._id,
					shortId: link.shortId,
					url: link.url,
					createdAt: link.createdAt,
					redirectCount: redirects.length,
					stats
				};
			})
		);

		return linksWithStats;
	}
});

export const update = protectedUserMutation({
	args: {
		linkId: v.id('links'),
		url: v.string()
	},
	handler: async (ctx, data) => {
		await authorizeLinkOwner(ctx, {
			linkId: data.linkId,
			userId: ctx.user._id
		});

		await ctx.db.patch(data.linkId, {
			url: data.url
		});

		return { success: true };
	}
});

export const deleteLink = protectedUserMutation({
	args: {
		linkId: v.id('links')
	},
	handler: async (ctx, data) => {
		await authorizeLinkOwner(ctx, {
			linkId: data.linkId,
			userId: ctx.user._id
		});

		const redirects = await ctx.db
			.query('redirects')
			.withIndex('byLinkId', (q) => q.eq('linkId', data.linkId))
			.collect();

		for (const redirect of redirects) {
			await ctx.db.delete(redirect._id);
		}

		await ctx.db.delete(data.linkId);

		return { success: true };
	}
});

export const getStats = protectedUserQuery({
	args: {
		linkId: v.id('links')
	},
	handler: async (ctx, data) => {
		await authorizeLinkOwner(ctx, {
			linkId: data.linkId,
			userId: ctx.user._id
		});

		const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

		const redirects = await ctx.db
			.query('redirects')
			.withIndex('byLinkId', (q) => q.eq('linkId', data.linkId))
			.filter((q) => q.gte(q.field('redirectedAt'), sevenDaysAgo))
			.collect();

		const statsByDay: Record<string, number> = {};

		for (let i = 0; i < 7; i++) {
			const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
			const dateKey = date.toISOString().split('T')[0];
			statsByDay[dateKey] = 0;
		}

		for (const redirect of redirects) {
			const date = new Date(redirect.redirectedAt);
			const dateKey = date.toISOString().split('T')[0];
			if (dateKey in statsByDay) {
				statsByDay[dateKey]++;
			}
		}

		return Object.entries(statsByDay)
			.map(([date, count]) => ({ date, count }))
			.sort((a, b) => a.date.localeCompare(b.date));
	}
});
