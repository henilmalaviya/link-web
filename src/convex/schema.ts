import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const workspacesSchema = {
	name: v.string(),
	secretHash: v.string()
};

export const linksSchema = {
	shortId: v.string(),
	shortName: v.optional(v.string()),
	secretHash: v.string(),

	url: v.string(),
	title: v.optional(v.string()),

	// REF
	workspaceId: v.optional(v.id('workspaces'))
};

export const redirectsSchema = {
	// REF
	linkId: v.id('links')
};

export default defineSchema({
	workspaces: defineTable(workspacesSchema).index('byName', ['name']),
	links: defineTable(linksSchema)
		.index('byShortId', ['shortId'])
		.index('byWorkspaceShortName', ['workspaceId', 'shortName']),
	redirects: defineTable(redirectsSchema).index('byLinkId', ['linkId'])
});
