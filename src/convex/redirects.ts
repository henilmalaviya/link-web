import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { publicMutation, protectedShortIdQuery } from './users';
import { linkSchema } from './schema';
import { internalAction, internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import { parseUserAgent } from './utils/ua';

/* -------------------------------------------------------------------------- */
// INTERNALS

export const fetchPendingRedirects = internalQuery({
	args: {},
	handler: async (ctx) => {
		const pending = await ctx.db
			.query('redirects')
			.withIndex('byGeolocationStatus', (q) => q.eq('meta.status.geolocation', 'pending'))
			.order('asc')
			.take(100);

		type PendingRedirect = { redirectId: Id<'redirects'>; ip: string | null };
		return pending
			.map(
				(redirect): PendingRedirect => ({
					redirectId: redirect._id,
					ip: redirect.meta.geolocation?.rawIp ?? null
				})
			)
			.filter(
				(redirect): redirect is { redirectId: Id<'redirects'>; ip: string } => redirect.ip !== null
			);
	}
});

export const markRedirectsProcessing = internalMutation({
	args: {
		redirectIds: v.array(v.id('redirects'))
	},
	handler: async (ctx, { redirectIds }) => {
		for (const redirectId of redirectIds) {
			const redirect = await ctx.db.get(redirectId);
			if (!redirect) {
				continue;
			}

			await ctx.db.patch(redirectId, {
				meta: {
					...redirect.meta,
					status: {
						...redirect.meta.status,
						geolocation: 'processing'
					}
				}
			});
		}
	}
});

export const applyGeolocationResults = internalMutation({
	args: {
		updates: v.array(
			v.object({
				redirectId: v.id('redirects'),
				status: v.union(v.literal('done'), v.literal('failed')),
				city: v.optional(v.string()),
				countryCode: v.optional(v.string()),
				regionCode: v.optional(v.string())
			})
		)
	},
	handler: async (ctx, { updates }) => {
		for (const update of updates) {
			const redirect = await ctx.db.get(update.redirectId);
			if (!redirect) {
				continue;
			}

			await ctx.db.patch(update.redirectId, {
				meta: {
					...redirect.meta,
					geolocation:
						update.status === 'done'
							? {
									city: update.city,
									countryCode: update.countryCode,
									regionCode: update.regionCode
								}
							: null,
					status: {
						...redirect.meta.status,
						geolocation: update.status
					}
				}
			});
		}
	}
});

export const processPendingRedirects = internalAction({
	args: {},
	handler: async (ctx) => {
		const pending = await ctx.runQuery(internal.redirects.fetchPendingRedirects, {});

		if (pending.length === 0) {
			return;
		}

		await ctx.runMutation(internal.redirects.markRedirectsProcessing, {
			redirectIds: pending.map((redirect) => redirect.redirectId)
		});

		const requests = pending.map((redirect) => ({
			query: redirect.ip,
			fields: 'city,countryCode,region,query,status'
		}));

		let responses: Array<Record<string, unknown>> = [];
		try {
			responses = await fetch('http://ip-api.com/batch', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requests)
			}).then((res) => res.json());
		} catch (error) {
			responses = [];
		}

		const responseByQuery = new Map<string, Record<string, unknown>>();
		if (Array.isArray(responses)) {
			for (const response of responses) {
				const query = typeof response?.query === 'string' ? response.query : null;
				if (query) {
					responseByQuery.set(query, response);
				}
			}
		}

		const updates = pending.map((redirect) => {
			const response = responseByQuery.get(redirect.ip) ?? {};
			const status = response.status === 'success' ? 'done' : 'failed';

			return {
				redirectId: redirect.redirectId,
				status: status as 'done' | 'failed',
				city: status === 'done' ? (response.city as string | undefined) : undefined,
				countryCode: status === 'done' ? (response.countryCode as string | undefined) : undefined,
				regionCode: status === 'done' ? (response.region as string | undefined) : undefined
			};
		});

		await ctx.runMutation(internal.redirects.applyGeolocationResults, { updates });
	}
});

/* -------------------------------------------------------------------------- */
// PUBLIC FUNCTIONS

export const create = publicMutation({
	args: {
		shortId: linkSchema.shortId,
		ip: v.string(),
		userAgent: v.optional(v.string())
	},
	handler: async (ctx, { shortId, ip, userAgent }) => {
		const userAgentInfo = userAgent ? parseUserAgent(userAgent) : null;
		const geolocation = ip
			? {
					rawIp: ip
				}
			: null;

		await ctx.db.insert('redirects', {
			shortId,
			meta: {
				geolocation,
				userAgent: userAgentInfo,
				status: {
					geolocation: geolocation ? 'pending' : null
				}
			}
		});

		return { ok: true };
	}
});

/* -------------------------------------------------------------------------- */
// PROTECTED FUNCTIONS

export const countByShortId = protectedShortIdQuery({
	args: {},
	handler: async (ctx, { shortId }) => {
		const redirects = await ctx.db
			.query('redirects')
			.withIndex('byShortId', (q) => q.eq('shortId', shortId))
			.collect();

		return redirects.length;
	}
});
