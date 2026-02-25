import { DateTime, DateTimeUnit } from 'luxon';

export interface TimeSeriesParams<T, R> {
	data: T[];
	start: number;
	end: number;
	timezone?: string;
	unit?: DateTimeUnit;
	step?: number;
	getTimestamp: (item: T) => number;
	getInitialValue: () => R;
	reducer: (acc: R, item: T) => R;
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

		if (bucketStartUTC < end) {
			buckets.set(bucketStartUTC, getInitialValue());
		}

		currentBoundary = currentBoundary.plus({ [unit]: step });
	}

	// 3. Map the data into the buckets
	for (const item of data) {
		const timestamp = getTimestamp(item);

		// Skip items outside the explicit bounds
		if (timestamp < start || timestamp >= end) continue;

		const itemDate = DateTime.fromMillis(timestamp).setZone(timezone);

		// Calculate how many raw units have passed since the start boundary
		const diffUnits = itemDate.diff(localStart, unit).get(unit);

		// Floor it to the nearest step size (e.g., 7 mins with step 5 becomes 5)
		const snappedUnits = Math.floor(diffUnits / step) * step;

		// Reconstruct the exact bucket start time
		const bucketStartUTC = localStart.plus({ [unit]: snappedUnits }).toMillis();

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
