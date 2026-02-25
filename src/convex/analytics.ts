import { v } from 'convex/values';
import type { Doc } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';
import { protectedShortIdQuery } from './users';
import { DateTime, DateTimeUnit, Duration } from 'luxon';
import { createTimeSeriesBuckets } from './utils/timeSeries';

// 1. Define exactly what time units are valid for your chart
export type ChartTimeInterval = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

// 2. Define the shape of a single configuration tier
interface GranularityConfig {
	maxHours: number; // The upper limit for this tier
	unit: ChartTimeInterval; // Data bucket size
	tickUnit: ChartTimeInterval; // X-axis label size
	tickStep: number; // X-axis label interval
}

// 3. Create the ordered thresholds (from smallest to largest)
const CHART_GRANULARITY_TIERS: GranularityConfig[] = [
	{ maxHours: 1, unit: 'minute', tickUnit: 'minute', tickStep: 10 },
	{ maxHours: 24, unit: 'hour', tickUnit: 'hour', tickStep: 4 },
	{ maxHours: 24 * 7, unit: 'hour', tickUnit: 'day', tickStep: 1 },
	{ maxHours: 24 * 30, unit: 'day', tickUnit: 'day', tickStep: 5 },
	{ maxHours: 24 * 90, unit: 'day', tickUnit: 'week', tickStep: 2 },
	{ maxHours: 24 * 365, unit: 'week', tickUnit: 'month', tickStep: 1 },
	{ maxHours: Infinity, unit: 'month', tickUnit: 'month', tickStep: 3 } // "All Time" fallback
];

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
		const { shortId, start, end, timezone = 'UTC' } = args;

		const redirects = await fetchRedirects(ctx, {
			shortId,
			start: start ?? ctx.link._creationTime,
			end
		});

		const loopStart = start ?? redirects[0]._creationTime;
		const loopEnd = end ?? Date.now();

		const diff = Duration.fromMillis(loopEnd - loopStart);
		const diffHours = Math.floor(diff.as('hours'));

		const config =
			CHART_GRANULARITY_TIERS.find((tier) => diffHours <= tier.maxHours) ??
			CHART_GRANULARITY_TIERS[CHART_GRANULARITY_TIERS.length - 1]; // Fallback to largest

		const { unit, tickUnit, tickStep } = config;

		const timeSeriesBuckets = createTimeSeriesBuckets({
			data: redirects,
			start: loopStart,
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
				start: loopStart,
				end: loopEnd,
				tickUnit,
				tickStep
			}
		};
	}
});
