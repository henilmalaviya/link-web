import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

crons.interval(
	'process pending redirects',
	{ seconds: 60 },
	internal.redirects.processPendingRedirects
);

export default crons;
