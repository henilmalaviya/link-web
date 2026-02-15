import { mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { workspacesSchema } from './schema';
import { generateRandomBytes, hashString } from './helpers';
import { customMutation, customQuery } from 'convex-helpers/server/customFunctions';
import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';

// --- Authentication Helper ---
const workspaceAuthArgs = {
	workspaceName: workspacesSchema.name,
	workspaceSecret: v.string()
};
export async function authenticateWorkspace(
	ctx: QueryCtx | MutationCtx,
	args: { workspaceName: string; workspaceSecret: string }
): Promise<Doc<'workspaces'>> {
	const workspace = await ctx.db
		.query('workspaces')
		.withIndex('byName', (q) => q.eq('name', args.workspaceName))
		.first();
	if (!workspace) throw new Error('Workspace not found');

	const secretHash = await hashString(args.workspaceSecret);
	if (workspace.secretHash !== secretHash) {
		throw new Error('Invalid workspace secret');
	}

	return workspace;
}

// --- Protected Functions ---
export const protectedWorkspaceQuery = customQuery(query, {
	args: workspaceAuthArgs,
	input: async (ctx, args) => {
		const workspace = await authenticateWorkspace(ctx, args);
		return { ctx: { workspace }, args: {} };
	}
});
export const protectedWorkspaceMutation = customMutation(mutation, {
	args: workspaceAuthArgs,
	input: async (ctx, args) => {
		const workspace = await authenticateWorkspace(ctx, args);
		return { ctx: { workspace }, args: {} };
	}
});

// --- Public Functions ---
export const create = mutation({
	args: {
		name: workspacesSchema.name
	},
	async handler(ctx, args) {
		const { name } = args;

		const existing = await ctx.db
			.query('workspaces')
			.withIndex('byName', (q) => q.eq('name', name))
			.first();

		if (existing) {
			throw new Error(`A workspace with the name "${name}" already exists.`);
		}

		const secret = generateRandomBytes(16);
		const secretHash = await hashString(secret);

		const workspaceId = await ctx.db.insert('workspaces', {
			name,
			secretHash
		});

		return {
			id: workspaceId,
			secret
		};
	}
});

export const get = protectedWorkspaceQuery({
	args: {},
	handler(ctx) {
		return {
			id: ctx.workspace._id,
			name: ctx.workspace.name,
			createdAt: new Date(ctx.workspace._creationTime).toISOString()
		};
	}
});
