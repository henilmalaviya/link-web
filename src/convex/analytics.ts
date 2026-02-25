import { v } from 'convex/values';
import type { Doc } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';
import { protectedShortIdQuery } from './users';
import { DateTime, DateTimeUnit, Duration } from 'luxon';
import { createTimeSeriesBuckets } from './utils/timeSeries';

const fetchRedirects = async (
	ctx: QueryCtx,
	args: {
		shortId: string;
		start: number;
		end?: number;
	}
) => {
	const { shortId, start, end } = args;
	const redirects = await ctx.db
		.query('redirects')
		.withIndex('byShortId', (q) => {
			const range = q.eq('shortId', shortId).gte('_creationTime', start);

			// If we have an end time (historical data), apply the ceiling.
			// If undefined (live data), leave it open to catch new incoming redirects!
			return end ? range.lt('_creationTime', end) : range;
		})
		.collect();

	return redirects;
};

export const totalClicksByShortId = protectedShortIdQuery({
	args: {
		start: v.optional(v.number()),
		end: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const { shortId, start = ctx.link._creationTime, end } = args;

		const scoped = await fetchRedirects(ctx, {
			shortId,
			start: start,
			end: end
		});

		return { totalClicks: scoped.length };
	}
});

export const timeSeriesByShortId = protectedShortIdQuery({
	args: {
		start: v.optional(v.number()),
		end: v.optional(v.number()),
		timezone: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const { shortId, start = ctx.link._creationTime, end, timezone = 'UTC' } = args;

		const redirects = await fetchRedirects(ctx, {
			shortId,
			start,
			end
		});

		const loopEnd = end ?? Date.now();

		const diff = Duration.fromMillis(loopEnd - start);
		const diffHours = diff.as('hours');

		let unit: DateTimeUnit;
		if (diffHours <= 1) {
			unit = 'minute';
		} else if (diffHours <= 48) {
			unit = 'hour';
		} else {
			unit = 'day';
		}

		console.log({ diffHours, unit, loopEnd, start, shortId, timezone });

		const timeSeriesBuckets = createTimeSeriesBuckets({
			data: redirects,
			start,
			end: loopEnd,
			timezone,
			unit,
			getTimestamp: (redirect) => redirect._creationTime,
			getInitialValue: () => 0,
			reducer: (count) => count + 1
		});

		return {
			buckets: timeSeriesBuckets,
			meta: {
				unit,
				timezone,
				start,
				end: loopEnd
			}
		};
	}
});
