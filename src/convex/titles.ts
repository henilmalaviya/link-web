import { v } from 'convex/values';
import { internalQuery, internalMutation, internalAction } from './_generated/server';
import { internal } from './_generated/api';

function extractTitle(html: string): string | null {
	const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
	const title = match ? match[1].trim() : null;
	if (!title) return null;
	return title.slice(0, 500);
}

async function fetchPageTitle(url: string, timeoutMs = 8000): Promise<string | null> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(url, {
			signal: controller.signal,
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; LinkTitleBot/1.0)'
			},
			redirect: 'follow'
		});

		clearTimeout(timeout);

		if (!response.ok) return null;

		const contentType = response.headers.get('content-type') || '';
		if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
			return null;
		}

		const html = await response.text();
		return extractTitle(html);
	} catch {
		clearTimeout(timeout);
		return null;
	}
}

export const getLinksMissingTitles = internalQuery({
	args: {},
	handler: async (ctx) => {
		return await ctx.db
			.query('links')
			.filter((q) => q.eq(q.field('title'), undefined))
			.take(100);
	}
});

export const updateLinkTitle = internalMutation({
	args: {
		linkId: v.id('links'),
		title: v.string()
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.linkId, { title: args.title });
	}
});

export const fetchMissingTitles = internalAction({
	args: {},
	handler: async (ctx) => {
		const links = await ctx.runQuery(internal.titles.getLinksMissingTitles, {});

		for (const link of links) {
			try {
				const title = await fetchPageTitle(link.url);
				if (title) {
					await ctx.runMutation(internal.titles.updateLinkTitle, {
						linkId: link._id,
						title
					});
				}
			} catch {
				// Skip on error, will retry next run
			}
		}
	}
});
