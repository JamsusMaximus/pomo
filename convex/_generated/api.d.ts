/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accountabilityChallenges from "../accountabilityChallenges.js";
import type * as backfillChallenges from "../backfillChallenges.js";
import type * as challenges from "../challenges.js";
import type * as createTestFriend from "../createTestFriend.js";
import type * as dateHelpers from "../dateHelpers.js";
import type * as deleteTestFriend from "../deleteTestFriend.js";
import type * as flowSessions from "../flowSessions.js";
import type * as follows from "../follows.js";
import type * as grantPomodoros from "../grantPomodoros.js";
import type * as levels from "../levels.js";
import type * as migrateChallenges from "../migrateChallenges.js";
import type * as notificationRules from "../notificationRules.js";
import type * as pomodoros from "../pomodoros.js";
import type * as profile from "../profile.js";
import type * as publicProfile from "../publicProfile.js";
import type * as pushSubscriptions from "../pushSubscriptions.js";
import type * as seed from "../seed.js";
import type * as seedChallenges from "../seedChallenges.js";
import type * as seedTestPact from "../seedTestPact.js";
import type * as sendNotifications from "../sendNotifications.js";
import type * as sendNotificationsSimple from "../sendNotificationsSimple.js";
import type * as stats from "../stats.js";
import type * as stats_helpers from "../stats_helpers.js";
import type * as streakHelpers from "../streakHelpers.js";
import type * as timeHelpers from "../timeHelpers.js";
import type * as timers from "../timers.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  accountabilityChallenges: typeof accountabilityChallenges;
  backfillChallenges: typeof backfillChallenges;
  challenges: typeof challenges;
  createTestFriend: typeof createTestFriend;
  dateHelpers: typeof dateHelpers;
  deleteTestFriend: typeof deleteTestFriend;
  flowSessions: typeof flowSessions;
  follows: typeof follows;
  grantPomodoros: typeof grantPomodoros;
  levels: typeof levels;
  migrateChallenges: typeof migrateChallenges;
  notificationRules: typeof notificationRules;
  pomodoros: typeof pomodoros;
  profile: typeof profile;
  publicProfile: typeof publicProfile;
  pushSubscriptions: typeof pushSubscriptions;
  seed: typeof seed;
  seedChallenges: typeof seedChallenges;
  seedTestPact: typeof seedTestPact;
  sendNotifications: typeof sendNotifications;
  sendNotificationsSimple: typeof sendNotificationsSimple;
  stats: typeof stats;
  stats_helpers: typeof stats_helpers;
  streakHelpers: typeof streakHelpers;
  timeHelpers: typeof timeHelpers;
  timers: typeof timers;
  users: typeof users;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
