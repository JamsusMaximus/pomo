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
import type * as backfillChallenges from "../backfillChallenges.js";
import type * as challenges from "../challenges.js";
import type * as createTestFriend from "../createTestFriend.js";
import type * as deleteTestFriend from "../deleteTestFriend.js";
import type * as flowSessions from "../flowSessions.js";
import type * as follows from "../follows.js";
import type * as levels from "../levels.js";
import type * as migrateChallenges from "../migrateChallenges.js";
import type * as pomodoros from "../pomodoros.js";
import type * as profile from "../profile.js";
import type * as publicProfile from "../publicProfile.js";
import type * as seed from "../seed.js";
import type * as seedChallenges from "../seedChallenges.js";
import type * as stats_helpers from "../stats-helpers.js";
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
  backfillChallenges: typeof backfillChallenges;
  challenges: typeof challenges;
  createTestFriend: typeof createTestFriend;
  deleteTestFriend: typeof deleteTestFriend;
  flowSessions: typeof flowSessions;
  follows: typeof follows;
  levels: typeof levels;
  migrateChallenges: typeof migrateChallenges;
  pomodoros: typeof pomodoros;
  profile: typeof profile;
  publicProfile: typeof publicProfile;
  seed: typeof seed;
  seedChallenges: typeof seedChallenges;
  "stats-helpers": typeof stats_helpers;
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
