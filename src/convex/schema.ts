import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const accountSchema = {
	tokenHash: v.string(),
	username: v.optional(v.string())
};

export const linkSchema = {
	url: v.string(),
	shortId: v.string(),
	clickCount: v.number(),
	ownerId: v.id('accounts'),
	lastClickTime: v.optional(v.number()),
	tags: v.optional(v.array(v.string())),
	archived: v.optional(v.boolean())
};

export const redirectSchema = {
	shortId: v.string(),
	meta: v.object({
		geolocation: v.nullable(
			v.object({
				countryCode: v.optional(v.string()),
				regionCode: v.optional(v.string()),
				city: v.optional(v.string()),
				rawIp: v.optional(v.string())
			})
		),
		userAgent: v.nullable(
			v.object({
				os: v.optional(v.string()),
				browser: v.optional(v.string()),
				device: v.optional(v.string())
			})
		),
		status: v.object({
			geolocation: v.nullable(
				v.union(
					v.literal('pending'),
					v.literal('processing'),
					v.literal('done'),
					v.literal('failed')
				)
			)
		})
	})
};

export const pageCacheSchema = {
	url: v.string(),
	title: v.optional(v.string()),
	description: v.optional(v.string()),
	fetchedAt: v.number()
};

export const aiRateLimitSchema = {
	accountId: v.id('accounts'),
	count: v.number(),
	windowStart: v.number()
};

export default defineSchema({
	accounts: defineTable(accountSchema).index('byUsername', ['username']),
	links: defineTable(linkSchema).index('byShortId', ['shortId']).index('byOwnerId', ['ownerId']),
	redirects: defineTable(redirectSchema)
		.index('byShortId', ['shortId'])
		.index('byGeolocationStatus', ['meta.status.geolocation']),
	pageCache: defineTable(pageCacheSchema).index('byUrl', ['url']),
	aiRateLimits: defineTable(aiRateLimitSchema).index('byAccountId', ['accountId'])
});
