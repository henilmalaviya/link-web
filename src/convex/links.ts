import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { linksSchema, workspacesSchema } from './schema';
import { generateRandomBytes, generateShortId, hashString } from './helpers';
import { authenticateWorkspace, protectedWorkspaceQuery } from './workspaces';
import { customMutation, customQuery } from 'convex-helpers/server/customFunctions';
import type { Doc, Id } from './_generated/dataModel';

// --- Authentication Helper ---
const linkAuthArgs = {
	linkShortId: v.string(),
	linkSecret: v.string()
};
export async function authenticateLink(
	ctx: QueryCtx | MutationCtx,
	args: { linkShortId: string; linkSecret: string }
): Promise<Doc<'links'>> {
	const link = await ctx.db
		.query('links')
		.withIndex('byShortId', (q) => q.eq('shortId', args.linkShortId))
		.first();
	if (!link) throw new Error('Link not found');

	const secretHash = await hashString(args.linkSecret);
	if (link.secretHash !== secretHash) {
		throw new Error('Invalid link secret');
	}

	return link;
}

// --- Protected Functions ---
export const protectedLinkQuery = customQuery(query, {
	args: linkAuthArgs,
	input: async (ctx, args) => {
		const link = await authenticateLink(ctx, args);
		return { ctx: { link }, args: {} };
	}
});
export const protectedLinkMutation = customMutation(mutation, {
	args: linkAuthArgs,
	input: async (ctx, args) => {
		const link = await authenticateLink(ctx, args);
		return { ctx: { link }, args: {} };
	}
});

// --- Protected Functions ---

export const get = protectedLinkQuery({
	args: {},
	handler: (ctx) => {
		return {
			_id: ctx.link._id,
			shortId: ctx.link.shortId,
			shortName: ctx.link.shortName,
			url: ctx.link.url,
			title: ctx.link.title,
			createdAt: new Date(ctx.link._creationTime).toISOString()
		};
	}
});

export const getRedirectCount = protectedLinkQuery({
	args: {},
	async handler(ctx) {
		const redirects = await ctx.db
			.query('redirects')
			.withIndex('byLinkId', (q) => q.eq('linkId', ctx.link._id))
			.collect();
		return redirects.length;
	}
});

export const deleteLink = protectedLinkMutation({
	args: {},
	async handler(ctx) {
		const redirects = await ctx.db
			.query('redirects')
			.withIndex('byLinkId', (q) => q.eq('linkId', ctx.link._id))
			.collect();
		for (const redirect of redirects) {
			await ctx.db.delete(redirect._id);
		}
		await ctx.db.delete(ctx.link._id);
	}
});

// --- Public Functions ---

export const listByWorkspace = protectedWorkspaceQuery({
	args: {},
	async handler(ctx) {
		const links = await ctx.db
			.query('links')
			.withIndex('byWorkspaceShortName', (q) => q.eq('workspaceId', ctx.workspace._id))
			.collect();

		return links.map((link) => ({
			_id: link._id,
			shortId: link.shortId,
			shortName: link.shortName,
			url: link.url,
			title: link.title,
			createdAt: new Date(link._creationTime).toISOString()
		}));
	}
});

export const create = mutation({
	args: {
		url: linksSchema.url,
		shortName: linksSchema.shortName,
		workspaceName: v.optional(workspacesSchema.name),
		workspaceSecret: v.optional(v.string())
	},
	async handler(ctx, args) {
		if (
			(args.workspaceName && !args.workspaceSecret) ||
			(!args.workspaceName && args.workspaceSecret)
		) {
			throw new Error('Both workspaceName and workspaceSecret must be provided together');
		}

		if (args.shortName) {
			if (!/^[a-zA-Z0-9-_]+$/.test(args.shortName)) {
				throw new Error('shortName can only contain letters, numbers, hyphens, and underscores');
			}
		}

		const secret = generateRandomBytes(16);
		const secretHash = await hashString(secret);

		let workspaceId = undefined;
		if (args.workspaceName && args.workspaceSecret) {
			const workspace = await authenticateWorkspace(ctx, {
				workspaceName: args.workspaceName,
				workspaceSecret: args.workspaceSecret
			});
			workspaceId = workspace._id;

			if (!args.shortName?.trim()) {
				throw new Error('Short name is required when creating links in a workspace');
			}
		}

		if (args.shortName) {
			const existing = await ctx.db
				.query('links')
				.withIndex('byWorkspaceShortName', (q) =>
					q.eq('workspaceId', workspaceId ?? undefined).eq('shortName', args.shortName)
				)
				.first();
			if (existing) {
				throw new Error('shortName already exists in this workspace');
			}
		}

		let shortId: string;
		let attempts = 0;
		do {
			shortId = generateShortId(4);
			const existing = await ctx.db
				.query('links')
				.withIndex('byShortId', (q) => q.eq('shortId', shortId))
				.first();
			if (!existing) break;
			attempts++;
		} while (attempts < 10);

		if (attempts >= 10) throw new Error('Failed to generate unique shortId');

		const linkId = await ctx.db.insert('links', {
			shortId,
			shortName: args.shortName,
			secretHash,
			url: args.url,
			workspaceId
		});

		return {
			id: linkId,
			shortId,
			shortName: args.shortName,
			secret
		};
	}
});

export async function resolveLink(
	ctx: QueryCtx | MutationCtx,
	args: { identifier: string; workspaceName?: string }
): Promise<Doc<'links'> | null> {
	let workspaceId: Id<'workspaces'> | undefined;
	if (args.workspaceName) {
		const workspace = await ctx.db
			.query('workspaces')
			.withIndex('byName', (q) => q.eq('name', args.workspaceName!))
			.first();
		if (workspace) {
			workspaceId = workspace._id;
		}
	}

	if (workspaceId) {
		const byShortName = await ctx.db
			.query('links')
			.withIndex('byWorkspaceShortName', (q) =>
				q.eq('workspaceId', workspaceId).eq('shortName', args.identifier)
			)
			.first();
		if (byShortName) return byShortName;

		const byShortId = await ctx.db
			.query('links')
			.withIndex('byShortId', (q) => q.eq('shortId', args.identifier))
			.filter((q) => q.eq(q.field('workspaceId'), workspaceId))
			.first();
		if (byShortId) return byShortId;
	}

	const byShortNameNoWorkspace = await ctx.db
		.query('links')
		.withIndex('byWorkspaceShortName', (q) =>
			q.eq('workspaceId', undefined).eq('shortName', args.identifier)
		)
		.first();
	if (byShortNameNoWorkspace) return byShortNameNoWorkspace;

	const byShortIdNoWorkspace = await ctx.db
		.query('links')
		.withIndex('byShortId', (q) => q.eq('shortId', args.identifier))
		.filter((q) => q.eq(q.field('workspaceId'), undefined))
		.first();
	return byShortIdNoWorkspace;
}

export const resolveAndLogRedirect = mutation({
	args: {
		identifier: v.string(),
		workspaceName: v.optional(v.string())
	},
	async handler(ctx, args) {
		const link = await resolveLink(ctx, args);
		if (!link) return null;

		await ctx.db.insert('redirects', { linkId: link._id });

		return { url: link.url };
	}
});
