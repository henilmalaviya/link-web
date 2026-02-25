/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analytics from "../analytics.js";
import type * as crons from "../crons.js";
import type * as crypto from "../crypto.js";
import type * as links from "../links.js";
import type * as redirects from "../redirects.js";
import type * as users from "../users.js";
import type * as utils_timeSeries from "../utils/timeSeries.js";
import type * as utilts from "../utilts.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  crons: typeof crons;
  crypto: typeof crypto;
  links: typeof links;
  redirects: typeof redirects;
  users: typeof users;
  "utils/timeSeries": typeof utils_timeSeries;
  utilts: typeof utilts;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
