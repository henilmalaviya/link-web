import { ConvexError, v } from 'convex/values';
import { linkSchema } from './schema';
import {
	protectedAccountMutation,
	protectedAccountQuery,
	protectedShortIdQuery,
	protectedShortIdMutation,
	publicQuery,
	authorizeAccount
} from './accounts';
import { randomBase62Id } from './crypto';
import type { MutationCtx, QueryCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';

/* -------------------------------------------------------------------------- */
// HELPERS

function validateUrl(url: string): void {
	const trimmed = url.trim();
	if (!trimmed) {
		throw new ConvexError({ code: 'INVALID_URL', message: 'URL is required' });
	}
	try {
		const parsed = new URL(trimmed);
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
			throw new ConvexError({
				code: 'INVALID_URL',
				message: 'URL must start with http:// or https://'
			});
		}
		if (!parsed.hostname) {
			throw new ConvexError({
				code: 'INVALID_URL',
				message: 'URL must have a valid hostname'
			});
		}
	} catch {
		throw new ConvexError({ code: 'INVALID_URL', message: 'Invalid URL format' });
	}
}

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

export const create = protectedAccountMutation({
	args: {
		url: linkSchema.url,
		shortId: v.optional(linkSchema.shortId),
		tags: v.optional(v.array(v.string()))
	},
	handler: async (ctx, data) => {
		const { url, shortId, tags } = data;

		validateUrl(url);

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
			clickCount: 0,
			ownerId: ctx.account._id,
			tags: tags ?? []
		});

		return {
			id: linkId,
			url: url,
			shortId: finalShortId,
			tags: tags ?? []
		};
	}
});

export const generateShortId = protectedAccountMutation({
	args: {},
	handler: async (ctx) => {
		return generateUniqueShortId(ctx);
	}
});

export const listShortIdsByUser = protectedAccountQuery({
	args: {
		search: v.optional(v.string()),
		tag: v.optional(v.string()),
		orderBy: v.optional(
			v.union(
				v.literal('newest'),
				v.literal('oldest'),
				v.literal('most_clicks'),
				v.literal('least_clicks'),
				v.literal('latest_click')
			)
		),
		limit: v.optional(v.number()),
		skip: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const search = args.search?.toLowerCase();
		const tag = args.tag;
		const orderBy = args.orderBy ?? 'newest';
		const limit = args.limit ?? 10;
		const skip = args.skip ?? 0;

		const isTimeOrder = orderBy === 'newest' || orderBy === 'oldest';
		const isClickOrder = orderBy === 'most_clicks' || orderBy === 'least_clicks';
		const isLatestClickOrder = orderBy === 'latest_click';

		let query = ctx.db
			.query('links')
			.withIndex('byOwnerId', (q) => q.eq('ownerId', ctx.account._id));

		if (isTimeOrder && !search && !tag) {
			// @ts-expect-error Convex allows order on indexed queries
			query = query.order(orderBy === 'newest' ? 'desc' : 'asc');
		}

		let links = await query.collect();

		if (search) {
			links = links.filter(
				(link) =>
					link.shortId.toLowerCase().includes(search) || link.url.toLowerCase().includes(search)
			);
		}

		if (tag) {
			links = links.filter((link) => (link.tags ?? []).includes(tag));
		}

		const total = links.length;

		if (isTimeOrder && (search || tag)) {
			links.sort((a, b) => {
				const aTime = a._creationTime ?? 0;
				const bTime = b._creationTime ?? 0;
				return orderBy === 'newest' ? bTime - aTime : aTime - bTime;
			});
		} else if (isClickOrder) {
			links.sort((a, b) => {
				const countA = a.clickCount ?? 0;
				const countB = b.clickCount ?? 0;
				return orderBy === 'most_clicks' ? countB - countA : countA - countB;
			});
		} else if (isLatestClickOrder) {
			links.sort((a, b) => {
				const timeA = a.lastClickTime ?? 0;
				const timeB = b.lastClickTime ?? 0;
				return timeB - timeA;
			});
		}

		const paginatedLinks = links.slice(skip, skip + limit);

		return {
			links: paginatedLinks.map((link) => ({
				shortId: link.shortId,
				clickCount: link.clickCount,
				tags: link.tags ?? []
			})),
			total
		};
	}
});

export const getTagsByUser = protectedAccountQuery({
	args: {},
	handler: async (ctx) => {
		const links = await ctx.db
			.query('links')
			.withIndex('byOwnerId', (q) => q.eq('ownerId', ctx.account._id))
			.collect();

		const allTags = links.flatMap((link) => link.tags ?? []);
		return Array.from(new Set(allTags)).sort();
	}
});

export const getByShortId = protectedShortIdQuery({
	args: {},
	handler: async (ctx) => {
		return ctx.link;
	}
});

export const update = protectedShortIdMutation({
	args: {
		url: v.optional(linkSchema.url),
		tags: v.optional(v.array(v.string()))
	},
	handler: async (ctx, data) => {
		const { url, tags } = data;

		const updates: Record<string, unknown> = {};

		if (url !== undefined) {
			validateUrl(url);
			updates.url = url;
		}

		if (tags !== undefined) {
			updates.tags = tags;
		}

		if (Object.keys(updates).length > 0) {
			await ctx.db.patch(ctx.link._id, updates);
		}

		return { ok: true };
	}
});

export const deleteLink = protectedShortIdMutation({
	args: {},
	handler: async (ctx) => {
		const link = ctx.link;

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
		return { ok: true };
	}
});

export const moveLink = protectedShortIdMutation({
	args: {
		targetUsername: v.string(),
		targetToken: v.string()
	},
	handler: async (ctx, { targetUsername, targetToken }) => {
		const targetAccount = await authorizeAccount(ctx, {
			username: targetUsername,
			token: targetToken
		});

		if (targetAccount._id === ctx.link.ownerId) {
			throw new ConvexError({
				code: 'SAME_ACCOUNT',
				message: 'Cannot move link to the same account'
			});
		}

		await ctx.db.patch(ctx.link._id, {
			ownerId: targetAccount._id
		});

		return { ok: true };
	}
});
