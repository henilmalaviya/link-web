# AGENTS.md

Repository guidance for agentic coding assistants.

## Build, lint, test

Commands (from package.json):

- Dev server: `bun run dev`
- Build: `bun run build`
- Preview: `bun run preview --host`
- Typecheck: `bun run check`
- Typecheck (watch): `bun run check:watch`
- Lint/format check: `bun run lint`
- Format: `bun run format`

Tests:

- There is no test runner configured (no `test` script). Single-test execution is not applicable.
- If tests are added later, update this section with the exact command and single-test syntax.

Convex:

- Regenerate Convex API types when server functions change: `npx convex dev --once`
- Run this after adding/removing Convex functions or indexes.

## Project stack

- SvelteKit + Svelte 5 (runes mode)
- Tailwind CSS 4 + shadcn-svelte UI
- Convex backend (queries/mutations/actions)
- Charts: LayerChart v2 (pre-release)
- Date/time: Moment

## Code style and conventions

### General

- Prefer explicit types for public functions and component props.
- Keep logic small, composable, and readable. Avoid large monolithic functions.
- Use ASCII only unless the file already contains non-ASCII content.
- Avoid unnecessary comments; add only when behavior is non-obvious.

### Imports

- Group imports by source:
  1. Svelte/SvelteKit
  2. Third-party libs
  3. $lib and local modules
- Use `$lib/...` for app modules.
- Keep import order stable and avoid mixed default + named imports when possible.

### Formatting

- Use Prettier defaults (see `bun run format`).
- Use single quotes in TS/JS.
- Tailwind class order is handled by prettier-plugin-tailwindcss.

### Svelte 5 patterns

- Use runes (`$state`, `$derived`, `$effect`) instead of legacy reactivity.
- Use `{#snippet}` and `{@render}` for reusable markup inside a component.
- Prefer small components when a UI block is reused or grows complex.

### Component ownership

- For analytics widgets, each component should fetch its own data (Convex query) unless explicitly asked otherwise.
- Keep loading states inside each component; avoid global loading placeholders for isolated widgets.

### Error handling

- Prefer `getErrorMessage` from `src/lib/utils.ts` for UI error text.
- Convex queries using protected helpers already handle auth; do not duplicate auth checks in the client.

### Naming

- Components: PascalCase, file name matches component (e.g., `ClicksTimeSeriesChart.svelte`).
- Functions: camelCase, verbs for actions (e.g., `fetchRedirects`).
- Convex queries/mutations: describe intent and scope (`totalClicksByShortId`, `timeSeriesByShortId`).

### Types

- Keep TS strict. Add explicit types on external-facing props and helper arguments.
- Do not add `declare module 'd3-*'` shims. Types are already installed via devDependencies.

## Convex backend guidelines

- Use `protectedShortIdQuery` for auth + ownership checks.
- Prefer small helper functions for shared logic (e.g., shared redirect filtering).
- Favor server-side bucketing for analytics; client only formats timestamps.
- Time series buckets are aligned to client-local hours using `tzOffsetMinutes` sent by the client.
- Use Moment for time calculations (both server and client).

## Analytics specifics

- Current analytics are fixed to a rolling last 24 hours.
- Time series uses hourly buckets and 5-hour tick spacing on the chart.
- If adding ranges later, reintroduce range args and UI intentionally (not default).

## UI and design

- Use shadcn-svelte components where possible (e.g., Tabs, Button, Skeleton).
- Maintain the dub.sh-inspired analytics layout (single KPI, area chart, two tabbed cards).
- Use real icons:
  - Flags: `https://hatscripts.github.io/circle-flags/flags/{code}.svg`
  - Browsers/OS: `https://raw.githubusercontent.com/faisalman/ua-parser-js/master/dist/icons/color/{icon}.png`
  - Devices: `@lucide/svelte` icons (Monitor, Smartphone, Tablet, Bot)

## Known patterns in this repo

- Convex API types are generated; run `npx convex dev` after backend changes.
- UI state uses runes (no Svelte stores unless required).
- Analytics components are in `src/lib/components/analytics/`.

## Do not do

- Do not reintroduce `declare module 'd3-*'` shims.
- Do not move analytics queries back into `redirects.ts`.

## File map (common locations)

- Frontend routes: `src/routes/**`
- Analytics UI: `src/routes/analytics/+page.svelte`
- Analytics components: `src/lib/components/analytics/**`
- Convex functions: `src/convex/**`
- Convex schema: `src/convex/schema.ts`

## Single test notes

- No test framework is configured. If a test framework is added, update this file with:
  - The base test command
  - How to run a single test file and a single test case
