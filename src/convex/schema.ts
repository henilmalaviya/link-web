import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const userSchema = {
	tokenHash: v.string()
};

export const linkSchema = {
	url: v.string(),
	shortId: v.string(),

	// REF
	ownerId: v.id('users')
};

export const redirectSchema = {
	shortId: v.string(),
	meta: v.object({
		geolocation: v.nullable(
			v.object({
				country: v.optional(v.string()),
				region: v.optional(v.string()),
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
	users: defineTable(userSchema),
	links: defineTable(linkSchema).index('byShortId', ['shortId']).index('byOwnerId', ['ownerId']),
	redirects: defineTable(redirectSchema)
		.index('byShortId', ['shortId'])
		.index('byGeolocationStatus', ['meta.status.geolocation'])
});
