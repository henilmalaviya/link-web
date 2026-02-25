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
	unitStep?: number;
	tickUnit: ChartTimeInterval; // X-axis label size
	tickStep: number; // X-axis label interval
}

// 3. Create the ordered thresholds (from smallest to largest)
const CHART_GRANULARITY_TIERS: GranularityConfig[] = [
	{ maxHours: 1, unit: 'minute', unitStep: 5, tickUnit: 'minute', tickStep: 10 },
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

		console.log({ diffHours, config, loopStart, loopEnd, redirects });

		const { unit, tickUnit, tickStep, unitStep } = config;

		const timeSeriesBuckets = createTimeSeriesBuckets({
			data: redirects,
			start: loopStart,
			end: loopEnd,
			timezone,
			unit,
			step: unitStep,
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

export const aggregateClicksByShortId = protectedShortIdQuery({
	args: {
		start: v.optional(v.number()),
		end: v.optional(v.number()),
		groupBy: v.union(
			v.literal('country'),
			v.literal('city'),
			v.literal('region'),
			v.literal('device'),
			v.literal('browser'),
			v.literal('os')
		)
	},
	handler: async (ctx, args) => {
		const { shortId, start = 0, end, groupBy } = args;

		// Fetch the scoped redirects
		const redirects = await fetchRedirects(ctx, { shortId, start, end });

		// Count the occurrences
		const counts = new Map<string, { count: number; country?: string }>();

		for (const redirect of redirects) {
			let key = 'Unknown';
			let countryCode = redirect.meta?.geolocation?.countryCode;

			switch (groupBy) {
				case 'country':
				case 'region':
				case 'city':
					if (
						redirect.meta.status.geolocation === 'pending' ||
						redirect.meta.status.geolocation === 'processing'
					) {
						// If geolocation is not yet resolved, skip this redirect for location-based aggregations
						continue;
					}
			}

			switch (groupBy) {
				case 'country':
					key = countryCode || 'Unknown';
					break;
				case 'city':
					key = redirect.meta?.geolocation?.city || 'Unknown';
					break;
				case 'region':
					key = redirect.meta?.geolocation?.regionCode || 'Unknown';
					break;
				case 'device':
					key = redirect.meta?.userAgent?.device || 'Unknown';
					break;
				case 'browser':
					key = redirect.meta?.userAgent?.browser || 'Unknown';
					break;
				case 'os':
					key = redirect.meta?.userAgent?.os || 'Unknown';
					break;
			}

			const existing = counts.get(key);
			counts.set(key, {
				count: (existing?.count || 0) + 1,
				// Only attach the country if we are looking at location tabs
				country: ['city', 'region'].includes(groupBy) ? countryCode : undefined
			});
		}

		return {
			total: Array.from(counts.values()).reduce((sum, item) => sum + item.count, 0),
			counts: Array.from(counts.entries())
				.map(([name, data]) => ({
					name,
					clicks: data.count,
					country: data.country
				}))
				.sort((a, b) => b.clicks - a.clicks)
		};
	}
});
