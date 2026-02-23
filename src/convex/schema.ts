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
	shortId: v.string()
};

export default defineSchema({
	users: defineTable(userSchema),
	links: defineTable(linkSchema).index('byShortId', ['shortId']).index('byOwnerId', ['ownerId']),
	redirects: defineTable(redirectSchema).index('byShortId', ['shortId'])
});
