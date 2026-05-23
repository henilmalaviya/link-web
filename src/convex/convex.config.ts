import { defineApp } from 'convex/server';
import { v } from 'convex/values';

const app = defineApp({
	env: {
		OPENROUTER_API_KEY: v.optional(v.string()),
		AI_MODEL: v.optional(v.string()),
		AI_SUGGESTION_COUNT: v.optional(v.string()),
		AI_RATE_LIMIT: v.optional(v.string()),
		AI_RATE_WINDOW_MS: v.optional(v.string()),
		AI_CACHE_TTL_MS: v.optional(v.string())
	}
});

export default app;
