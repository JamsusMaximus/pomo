/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as challenges from "../challenges.js";
import type * as pomodoros from "../pomodoros.js";
import type * as seed from "../seed.js";
import type * as seedChallenges from "../seedChallenges.js";
import type * as stats from "../stats.js";
import type * as timers from "../timers.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  challenges: typeof challenges;
  pomodoros: typeof pomodoros;
  seed: typeof seed;
  seedChallenges: typeof seedChallenges;
  stats: typeof stats;
  timers: typeof timers;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
