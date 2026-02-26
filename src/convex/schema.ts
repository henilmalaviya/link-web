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
	ownerId: v.id('accounts')
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

export default defineSchema({
	accounts: defineTable(accountSchema).index('byUsername', ['username']),
	links: defineTable(linkSchema).index('byShortId', ['shortId']).index('byOwnerId', ['ownerId']),
	redirects: defineTable(redirectSchema)
		.index('byShortId', ['shortId'])
		.index('byGeolocationStatus', ['meta.status.geolocation'])
});
