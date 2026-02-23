import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const userSchema = {
	tokenHash: v.string()
};

export const linkSchema = {
	url: v.string(),
	shortId: v.string(),
	createdAt: v.number(),

	// REF
	ownerId: v.id('users')
};

export const redirectSchema = {
	// REF
	linkId: v.id('links'),
	redirectedAt: v.number()
};

export default defineSchema({
	users: defineTable(userSchema),
	links: defineTable(linkSchema).index('byShortId', ['shortId']),
	redirects: defineTable(redirectSchema).index('byLinkId', ['linkId'])
});
