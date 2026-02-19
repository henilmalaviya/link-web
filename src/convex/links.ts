import { v } from 'convex/values';
import { linkSchema } from './schema';
import { protectedUserMutation, protectedUserQuery } from './users';
import { randomBase62Id } from './crypto';
import { api } from './_generated/api';
import { Doc, Id } from './_generated/dataModel';
import { MutationCtx, QueryCtx } from './_generated/server';
import { customQuery } from 'convex-helpers/server/customFunctions';

/* -------------------------------------------------------------------------- */
// HELPERS

async function generateUniqueShortId(ctx: QueryCtx | MutationCtx): Promise<string> {
	let attempts = 0;
	const initialLength = 6;
	let length = initialLength;
	const maxLength = 8;
	// set a maximum length to prevent infinite loops in case of high collision rates
	while (true) {
		if (length > maxLength) {
			throw new Error('Unable to generate unique short ID');
		}

		const shortId = randomBase62Id(length);
		const existingLink = await ctx.db
			.query('links')
			.withIndex('byShortId', (q) => q.eq('shortId', shortId))
			.first();
		if (!existingLink) {
			return shortId;
		}
		// if shortId keeps colliding, increase the length of the generated ID after a certain number of attempts
		attempts++;
		if (attempts > 5) {
			length++;
			attempts = 0;
		}
	}
}

async function authorizeLinkOwnerByShortId(
	ctx: QueryCtx | MutationCtx,
	args: {
		shortId: string;
		userId: string;
	}
): Promise<Doc<'links'>> {
	const { shortId } = args;

	const link = await ctx.db
		.query('links')
		.withIndex('byShortId', (q) => q.eq('shortId', shortId))
		.first();
	if (!link) {
		throw new Error('Link not found');
	}

	if (link.ownerId !== args.userId) {
		throw new Error('Unauthorized');
	}

	return link;
}

/* -------------------------------------------------------------------------- */
// PROTECTED FUNCTIONS

export const create = protectedUserMutation({
	args: {
		url: linkSchema.url,
		shortId: v.optional(linkSchema.shortId)
	},
	handler: async (ctx, data) => {
		const { url, shortId } = data;

		const finalShortId = shortId || (await generateUniqueShortId(ctx));

		// check if link with finalShortId already exists to prevent duplicates in case user provided shortId
		const existingLink = await ctx.db
			.query('links')
			.withIndex('byShortId', (q) => q.eq('shortId', finalShortId))
			.first();
		if (existingLink) {
			throw new Error('Short ID already in use');
		}

		const link = await ctx.db.insert('links', {
			url,
			shortId: finalShortId,
			ownerId: ctx.user._id
		});

		return {
			id: link,
			url: url,
			shortId: finalShortId
		};
	}
});

export const getByShortId = protectedUserQuery({
	args: {
		shortId: v.string()
	},
	handler: async (ctx, data) => {
		const link = await authorizeLinkOwnerByShortId(ctx, {
			shortId: data.shortId,
			userId: ctx.user._id
		});
		return {
			shortId: link.shortId,
			url: link.url,
			creationTime: link._creationTime
		};
	}
});
