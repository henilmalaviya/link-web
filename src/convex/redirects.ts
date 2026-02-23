import { v } from 'convex/values';
import { protectedUserMutation, protectedUserQuery } from './users';
import type { Id } from './_generated/dataModel';
import { mutation } from './_generated/server';
import type { QueryCtx } from './_generated/server';

async function authorizeLinkOwner(
	ctx: QueryCtx,
	args: {
		linkId: Id<'links'>;
		userId: Id<'users'>;
	}
): Promise<void> {
	const link = await ctx.db.get(args.linkId);
	if (!link) {
		throw new Error('Link not found');
	}

	if (link.ownerId !== args.userId) {
		throw new Error('Unauthorized');
	}
}

export const logRedirect = mutation({
	args: {
		linkId: v.id('links')
	},
	handler: async (ctx, args) => {
		await ctx.db.insert('redirects', {
			linkId: args.linkId,
			redirectedAt: Date.now()
		});

		return { success: true };
	}
});

export const log = protectedUserMutation({
	args: {
		linkId: v.id('links')
	},
	handler: async (ctx, data) => {
		await ctx.db.insert('redirects', {
			linkId: data.linkId,
			redirectedAt: Date.now()
		});

		return { success: true };
	}
});

export const getCountByLink = protectedUserQuery({
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

		return redirects.length;
	}
});

export const getStatsByLink = protectedUserQuery({
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
