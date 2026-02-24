import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

crons.interval(
	'process pending redirects',
	{ seconds: 30 },
	internal.redirects.processPendingRedirects
);

export default crons;
