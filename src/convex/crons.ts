import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

crons.interval('fetch-link-titles', { hours: 1 }, internal.titles.fetchMissingTitles);

export default crons;
