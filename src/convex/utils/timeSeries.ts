import { DateTime, DateTimeUnit } from 'luxon';

export interface TimeSeriesParams<T, R> {
	data: T[]; // The raw array of database records
	start: number; // Range start (UTC ms)
	end: number; // Range end (UTC ms)
	timezone?: string; // IANA timezone string (default: 'UTC')
	unit?: DateTimeUnit; // Luxon unit: 'hour', 'day', 'month', etc.
	step?: number; // Interval size (e.g., 1 for 1 hour, 15 for 15 mins)
	getTimestamp: (item: T) => number; // Extracts the timestamp from a record
	getInitialValue: () => R; // Factory for the starting state of an empty bucket
	reducer: (acc: R, item: T) => R; // The logic to aggregate data into the bucket
}

export interface Bucket<R> {
	bucketStart: number;
	bucketEnd: number;
	value: R;
}

export function createTimeSeriesBuckets<T, R>({
	data,
	start,
	end,
	timezone = 'UTC',
	unit = 'hour',
	step = 1,
	getTimestamp,
	getInitialValue,
	reducer
}: TimeSeriesParams<T, R>): Bucket<R>[] {
	const buckets = new Map<number, R>();

	// 1. Determine local boundaries snapped to the requested unit
	const localStart = DateTime.fromMillis(start).setZone(timezone).startOf(unit);
	const localEnd = DateTime.fromMillis(end).setZone(timezone).startOf(unit);

	// 2. Pre-fill the buckets to ensure zero gaps
	let currentBoundary = localStart;
	while (currentBoundary <= localEnd) {
		const bucketStartUTC = currentBoundary.toMillis();

		// Only include buckets that start strictly before our end time
		if (bucketStartUTC < end) {
			// Use a factory function so objects/arrays aren't passed by reference
			buckets.set(bucketStartUTC, getInitialValue());
		}

		currentBoundary = currentBoundary.plus({ [unit]: step });
	}

	// 3. Map the data into the buckets
	for (const item of data) {
		const timestamp = getTimestamp(item);

		// Skip items outside the explicit bounds
		if (timestamp < start || timestamp >= end) continue;

		const bucketStartUTC = DateTime.fromMillis(timestamp)
			.setZone(timezone)
			.startOf(unit)
			.toMillis();

		if (buckets.has(bucketStartUTC)) {
			const currentValue = buckets.get(bucketStartUTC)!;
			buckets.set(bucketStartUTC, reducer(currentValue, item));
		}
	}

	// 4. Format and return the final array
	return Array.from(buckets.entries()).map(([bucketStart, value]) => ({
		bucketStart,
		bucketEnd: DateTime.fromMillis(bucketStart)
			.setZone(timezone)
			.plus({ [unit]: step })
			.toMillis(),
		value
	}));
}
