import { v } from 'convex/values';
import { mutation, MutationCtx, query, QueryCtx } from './_generated/server';
import { linksSchema, workspacesSchema } from './schema';
import { generateRandomBytes, generateShortId, hashString } from './helpers';
import { authenticateWorkspace } from './workspaces';
import { customMutation, customQuery } from 'convex-helpers/server/customFunctions';
import { Doc } from './_generated/dataModel';

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

// --- Public Functions ---

export const create = mutation({
	args: {
		url: linksSchema.url,
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

		const secret = generateRandomBytes(16);
		const secretHash = await hashString(secret);

		let workspaceId = undefined;
		if (args.workspaceName && args.workspaceSecret) {
			const workspace = await authenticateWorkspace(ctx, {
				workspaceName: args.workspaceName,
				workspaceSecret: args.workspaceSecret
			});
			workspaceId = workspace._id;
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
			secretHash,
			url: args.url,
			workspaceId
		});

		return {
			id: linkId,
			shortId,
			secret
		};
	}
});
