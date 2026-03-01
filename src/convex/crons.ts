import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

crons.interval(
	'process pending redirects',
	{ seconds: 60 },
	internal.redirects.processPendingRedirects
);

crons.interval('sync click data', { hours: 24 }, internal.redirects.syncClickData);

export default crons;
