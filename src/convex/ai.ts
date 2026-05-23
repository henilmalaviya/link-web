'use node';

import { internalAction, action, env } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { OpenRouter } from '@openrouter/sdk';

const SUGGESTION_SCHEMA = {
	name: 'slug_suggestions',
	strict: true,
	schema: {
		type: 'object',
		properties: {
			suggestions: {
				type: 'array',
				items: {
					type: 'string',
					description: 'A short, URL-safe slug using only lowercase letters, numbers, and hyphens'
				},
				minItems: 1,
				maxItems: 10
			}
		},
		required: ['suggestions'],
		additionalProperties: false
	}
} as const;

async function fetchPageContent(
	url: string
): Promise<{ title: string | null; description: string | null }> {
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 5000);

		const response = await fetch(url, {
			signal: controller.signal,
			headers: { 'User-Agent': 'Link/1.0' }
		});
		clearTimeout(timeout);

		const contentType = response.headers.get('content-type') ?? '';
		if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
			console.log(`[AI] fetchPageContent: non-HTML response for ${url} (${contentType})`);
			return { title: null, description: null };
		}

		const html = await response.text();

		const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
		const title = titleMatch?.[1]?.trim() ?? null;

		const descMatch = html.match(
			/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i
		);
		const description = descMatch?.[1]?.trim() ?? null;

		if (!title && !description) {
			console.log(`[AI] fetchPageContent: no title or description found for ${url}`);
		}

		return { title, description };
	} catch (e) {
		console.log(`[AI] fetchPageContent: fetch failed for ${url}`, e);
		return { title: null, description: null };
	}
}

function buildPrompt(
	title: string | null,
	description: string | null,
	url: string,
	count: number
): { system: string; user: string } {
	const system =
		'You are a helpful assistant that generates short, memorable URL slugs for a link shortening service.';

	const parts: string[] = [];
	if (title) parts.push(`Title: ${title}`);
	parts.push(`URL: ${url}`);
	if (description) parts.push(`Description: ${description}`);

	const user = `${parts.join('\n')}

Generate ${count} short, URL-safe slugs. Rules:
- 3-30 characters each
- Only lowercase letters, numbers, and hyphens
- 1-4 words separated by hyphens
- Easy to type and remember
- Relevant to the page content
- Do not use generic words like "link", "page", "site", "home", "main"`;

	return { system, user };
}

function validateSlugs(slugs: string[]): string[] {
	const seen = new Set<string>();
	return slugs.filter((s) => {
		const valid = /^[a-z0-9-]{3,30}$/.test(s) && !seen.has(s);
		if (valid) seen.add(s);
		return valid;
	});
}

export const fetchPageInfo = internalAction({
	args: { url: v.string() },
	handler: async (_ctx, { url }) => {
		return fetchPageContent(url);
	}
});

export const suggestSlugs = action({
	args: { username: v.string(), token: v.string(), url: v.string() },
	handler: async (ctx, { username, token, url }) => {
		try {
			if (!env.OPENROUTER_API_KEY) {
				return { suggestions: [], disabled: true };
			}

			const suggestionCount = Math.min(Math.max(parseInt(env.AI_SUGGESTION_COUNT ?? '3', 10) || 3, 1), 10);
			const rateLimit = Math.max(parseInt(env.AI_RATE_LIMIT ?? '10', 10) || 10, 1);
			const rateWindowMs = Math.max(parseInt(env.AI_RATE_WINDOW_MS ?? '3600000', 10) || 3600000, 1);

			const accountId = (await ctx.runQuery(
				internal.ai_helpers.authorizeAccountForAction,
				{
					username,
					token
				}
			)) as Id<'accounts'>;

			const rateDoc = (await ctx.runQuery(
				internal.ai_helpers.getAccountSuggestionRate,
				{
					accountId
				}
			)) as { count: number; windowStart: number } | null;
			if (rateDoc && Date.now() - rateDoc.windowStart < rateWindowMs && rateDoc.count >= rateLimit) {
				console.log(`[AI] suggestSlugs: rate limited for account ${accountId}`);
				return { suggestions: [] };
			}

			let pageInfo = (await ctx.runQuery(internal.ai_helpers.getCachedPageInfo, {
				url
			})) as { title: string | null; description: string | null } | null;
			if (!pageInfo) {
				console.log(`[AI] suggestSlugs: cache miss, fetching page info for ${url}`);
				pageInfo = await ctx.runAction(internal.ai.fetchPageInfo, { url });
				await ctx.runMutation(internal.ai_helpers.cachePageInfo, {
					url,
					title: pageInfo.title ?? undefined,
					description: pageInfo.description ?? undefined
				});
			}

			const { system, user } = buildPrompt(pageInfo.title, pageInfo.description, url, suggestionCount);

			const client = new OpenRouter({
				apiKey: env.OPENROUTER_API_KEY!
			});

			const response = await client.chat.send({
				chatRequest: {
					model: env.AI_MODEL || 'openai/gpt-4o-mini',
					messages: [
						{ role: 'system' as const, content: system },
						{ role: 'user' as const, content: user }
					],
					responseFormat: { type: 'json_schema', jsonSchema: SUGGESTION_SCHEMA }
				}
			});

			if (!('choices' in response)) {
				console.log(`[AI] suggestSlugs: unexpected response shape from OpenRouter`, response);
				return { suggestions: [] };
			}

			const content = response.choices[0]?.message?.content;
			if (!content || typeof content !== 'string') {
				console.log(`[AI] suggestSlugs: empty or non-string content from OpenRouter`);
				return { suggestions: [] };
			}

			let parsed: { suggestions?: string[] };
			try {
				parsed = JSON.parse(content);
			} catch (e) {
				console.log(`[AI] suggestSlugs: failed to parse OpenRouter response as JSON`, content, e);
				return { suggestions: [] };
			}

			const rawSlugs: string[] = parsed.suggestions ?? [];
			const validSlugs = validateSlugs(rawSlugs).slice(0, suggestionCount);

			if (validSlugs.length === 0) {
				console.log(`[AI] suggestSlugs: no valid slugs after validation`, { rawSlugs });
				return { suggestions: [] };
			}

			const available = (await ctx.runQuery(internal.ai_helpers.checkSlugsAvailable, {
				slugs: validSlugs
			})) as string[];

			await ctx.runMutation(internal.ai_helpers.incrementAccountSuggestionCount, {
				accountId
			});

			return { suggestions: available.slice(0, suggestionCount) };
		} catch (e) {
			console.log(`[AI] suggestSlugs: unexpected error for ${url}`, e);
			return { suggestions: [] };
		}
	}
});
