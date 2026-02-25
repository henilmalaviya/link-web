import { DateTime } from 'luxon';

export function formatDate(timestamp?: number | string): string {
	const value = Number(timestamp);
	if (!Number.isFinite(value)) return '—';

	const createdAt = DateTime.fromMillis(value);
	const now = DateTime.now();

	const hours = now.diff(createdAt).as('hours');

	if (hours < 1) {
		const minutes = now.diff(createdAt).as('minutes');
		const displayMinutes = Math.max(1, Math.floor(minutes));
		return `${displayMinutes}m`;
	}

	if (hours < 24) {
		return `${Math.floor(hours)}h`;
	}

	return createdAt.toFormat('MMM d, yyyy');
}
