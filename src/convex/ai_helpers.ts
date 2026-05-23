import { env, internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';
import { authorizeAccount } from './accounts';

export const checkSlugsAvailable = internalQuery({
	args: { slugs: v.array(v.string()) },
	handler: async (ctx, { slugs }) => {
		const taken = new Set<string>();
		for (const slug of slugs) {
			const existing = await ctx.db
				.query('links')
				.withIndex('byShortId', (q) => q.eq('shortId', slug))
				.first();
			if (existing) taken.add(slug);
		}
		return slugs.filter((s) => !taken.has(s));
	}
});

export const getCachedPageInfo = internalQuery({
	args: { url: v.string() },
	handler: async (ctx, { url }) => {
		const cached = await ctx.db
			.query('pageCache')
			.withIndex('byUrl', (q) => q.eq('url', url))
			.first();
		if (!cached) return null;
		const cacheTtl = parseInt(env.AI_CACHE_TTL_MS ?? '86400000', 10);
		if (Date.now() - cached.fetchedAt > cacheTtl) return null;
		return { title: cached.title ?? null, description: cached.description ?? null };
	}
});

export const cachePageInfo = internalMutation({
	args: {
		url: v.string(),
		title: v.optional(v.string()),
		description: v.optional(v.string())
	},
	handler: async (ctx, { url, title, description }) => {
		const existing = await ctx.db
			.query('pageCache')
			.withIndex('byUrl', (q) => q.eq('url', url))
			.first();
		if (existing) await ctx.db.delete(existing._id);
		await ctx.db.insert('pageCache', {
			url,
			title: title ?? undefined,
			description: description ?? undefined,
			fetchedAt: Date.now()
		});
	}
});

export const authorizeAccountForAction = internalQuery({
	args: { username: v.string(), token: v.string() },
	handler: async (ctx, { username, token }) => {
		const account = await authorizeAccount(ctx, { username, token });
		return account._id;
	}
});

export const getAccountSuggestionRate = internalQuery({
	args: { accountId: v.id('accounts') },
	handler: async (ctx, { accountId }) => {
		const rateDoc = await ctx.db
			.query('aiRateLimits')
			.withIndex('byAccountId', (q) => q.eq('accountId', accountId))
			.first();
		if (!rateDoc) return null;
		return { count: rateDoc.count, windowStart: rateDoc.windowStart };
	}
});

export const incrementAccountSuggestionCount = internalMutation({
	args: { accountId: v.id('accounts') },
	handler: async (ctx, { accountId }) => {
		const existing = await ctx.db
			.query('aiRateLimits')
			.withIndex('byAccountId', (q) => q.eq('accountId', accountId))
			.first();
		const now = Date.now();
		const rateWindow = parseInt(env.AI_RATE_WINDOW_MS ?? '3600000', 10);
		if (!existing || now - existing.windowStart > rateWindow) {
			if (existing) await ctx.db.delete(existing._id);
			await ctx.db.insert('aiRateLimits', { accountId, count: 1, windowStart: now });
		} else {
			await ctx.db.patch(existing._id, { count: existing.count + 1 });
		}
	}
});


