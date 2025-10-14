/**
 * @fileoverview Public profile data with privacy filtering
 * @module convex/publicProfile
 *
 * Key responsibilities:
 * - Get public profile data for any user by username
 * - Respect privacy settings (public/followers_only/private)
 * - Return filtered stats and activity based on privacy level
 * - Check viewer permissions (self, follower, stranger)
 *
 * Dependencies: Convex server runtime, stats.ts, challenges.ts
 * Used by: app/profile/[username]/page.tsx
 */

import { query } from "./_generated/server";
import { v } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Get public profile data with privacy filtering
 * Returns different data based on:
 * - Viewing own profile: full access
 * - Following the user & privacy is "followers_only": full access
 * - User privacy is "public": full access
 * - Otherwise: limited access (just basic info)
 */
export const getPublicProfile = query({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the target user
    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (!targetUser) {
      return null;
    }

    // Get current viewer (if authenticated)
    const identity = await ctx.auth.getUserIdentity();
    let currentUser = null;
    if (identity) {
      currentUser = await ctx.db
        .query("users")
        .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
        .first();
    }

    // Check if viewer is the profile owner
    const isOwnProfile = currentUser && currentUser._id === targetUser._id;

    // Check if viewer follows the target user
    let isFollowing = false;
    if (currentUser && !isOwnProfile) {
      const followRelation = await ctx.db
        .query("follows")
        .withIndex("by_follower_and_following", (q) =>
          q.eq("followerId", currentUser._id).eq("followingId", targetUser._id)
        )
        .first();
      isFollowing = !!followRelation;
    }

    // Determine privacy level
    const privacy = targetUser.privacy || "followers_only"; // Default to followers_only

    // Check access permission
    const hasAccess =
      isOwnProfile || privacy === "public" || (privacy === "followers_only" && isFollowing);

    // Get follower/following counts
    const followers = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", targetUser._id))
      .collect();

    const following = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", targetUser._id))
      .collect();

    // Basic profile info (always visible)
    const basicProfile = {
      username: targetUser.username,
      avatarUrl: targetUser.avatarUrl,
      bio: targetUser.bio,
      privacy,
      createdAt: targetUser.createdAt,
      isOwnProfile,
      isFollowing,
      followersCount: followers.length,
      followingCount: following.length,
    };

    // If no access, return basic profile only
    if (!hasAccess) {
      return {
        ...basicProfile,
        hasAccess: false,
        stats: null,
        activity: null,
        recentSessions: null,
        levelInfo: null,
      };
    }

    // Full access - get all stats using helper function
    console.log("Getting stats for targetUser:", targetUser.username, targetUser._id);
    const stats = await calculateUserStats(ctx, targetUser._id);
    console.log("Stats result:", stats);

    // Get activity for heatmap (past year)
    const activity = await getActivityForUser(ctx, targetUser._id);
    console.log("Activity result count:", activity.length);

    // Get recent sessions (last 10)
    const last10Sessions = await ctx.db
      .query("pomodoros")
      .withIndex("by_user_and_date", (q) => q.eq("userId", targetUser._id))
      .order("desc")
      .take(10);

    // Get level info
    const levelInfo = getLevelInfo(stats.total.count);

    // Get completed challenges with full details
    const completedChallenges = await ctx.db
      .query("userChallenges")
      .withIndex("by_user", (q) => q.eq("userId", targetUser._id))
      .filter((q) => q.eq(q.field("completed"), true))
      .collect();

    // Fetch challenge definitions for completed challenges
    const completedChallengesWithDetails = await Promise.all(
      completedChallenges.map(async (uc) => {
        const challenge = await ctx.db.get(uc.challengeId);
        return challenge
          ? {
              _id: uc._id,
              name: challenge.name,
              description: challenge.description,
              badge: challenge.badge,
              completedAt: uc.completedAt,
            }
          : null;
      })
    );

    // Get focus fitness data (last 90 days)
    const focusFitness = await getFocusFitnessForUser(ctx, targetUser._id, 90);

    return {
      ...basicProfile,
      hasAccess: true,
      stats,
      activity,
      recentSessions: last10Sessions,
      levelInfo,
      challengesCompleted: completedChallenges.length,
      completedChallengesDetails: completedChallengesWithDetails.filter((c) => c !== null),
      focusFitness,
    };
  },
});

/**
 * Calculate user stats (reusable helper for both own profile and public profiles)
 */
async function calculateUserStats(ctx: QueryCtx, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Get all focus sessions
  const sessions = await ctx.db
    .query("pomodoros")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("mode"), "focus"))
    .collect();

  console.log("calculateUserStats - userId:", userId, "sessions count:", sessions.length);

  // Debug: Check if there are sessions without filtering by user
  const allPomodoros = await ctx.db.query("pomodoros").collect();
  const focusPomodoros = allPomodoros.filter((p) => p.mode === "focus");
  console.log("Total focus pomodoros in DB:", focusPomodoros.length);
  console.log(
    "User's pomodoros (should be 186):",
    focusPomodoros.filter((p) => p.userId === userId).length
  );

  // Check if there are pomodoros with a different userId but same username
  const allUsers = await ctx.db.query("users").collect();
  console.log(
    "All users in DB:",
    allUsers.map((u) => ({ id: u._id, username: u.username, clerkId: u.clerkId }))
  );

  // Count pomodoros per user
  const pomosByUser = allUsers.map((u) => ({
    username: u.username,
    userId: u._id,
    pomoCount: focusPomodoros.filter((p) => p.userId === u._id).length,
  }));
  console.log("Pomodoros by user:", pomosByUser);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate start of week (Monday)
  const startOfWeek = new Date(today);
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startOfWeek.setDate(today.getDate() + diff);
  const weekTimestamp = startOfWeek.getTime();

  // Calculate start of month
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthTimestamp = startOfMonth.getTime();

  // Calculate start of year
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const yearTimestamp = startOfYear.getTime();

  // Single-pass aggregation
  const stats = sessions.reduce(
    (acc, session) => {
      const minutes = session.duration / 60;

      acc.total.count++;
      acc.total.minutes += minutes;

      if (session.completedAt >= yearTimestamp) {
        acc.year.count++;
        acc.year.minutes += minutes;
      }

      if (session.completedAt >= monthTimestamp) {
        acc.month.count++;
        acc.month.minutes += minutes;
      }

      if (session.completedAt >= weekTimestamp) {
        acc.week.count++;
        acc.week.minutes += minutes;
      }

      return acc;
    },
    {
      total: { count: 0, minutes: 0 },
      year: { count: 0, minutes: 0 },
      month: { count: 0, minutes: 0 },
      week: { count: 0, minutes: 0 },
    }
  );

  // Calculate streaks
  const streaks = calculateStreaks(sessions);

  // Calculate best historical streak
  const historicalBest = calculateBestHistoricalStreak(sessions);
  const currentBest = user.bestDailyStreak ?? 0;
  const actualBest = Math.max(historicalBest, currentBest, streaks.daily);

  return {
    total: { count: stats.total.count, minutes: Math.round(stats.total.minutes) },
    week: { count: stats.week.count, minutes: Math.round(stats.week.minutes) },
    month: { count: stats.month.count, minutes: Math.round(stats.month.minutes) },
    year: { count: stats.year.count, minutes: Math.round(stats.year.minutes) },
    dailyStreak: streaks.daily,
    weeklyStreak: streaks.weekly,
    bestDailyStreak: actualBest,
  };
}

/**
 * Get activity data for heatmap (past year)
 */
async function getActivityForUser(ctx: QueryCtx, userId: Id<"users">) {
  const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const sessions = await ctx.db
    .query("pomodoros")
    .withIndex("by_user_and_date", (q) => q.eq("userId", userId).gte("completedAt", oneYearAgo))
    .filter((q) => q.eq(q.field("mode"), "focus"))
    .collect();

  const dailyActivity: Record<string, { count: number; minutes: number }> = {};
  sessions.forEach((session) => {
    const date = new Date(session.completedAt);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    if (!dailyActivity[dateKey]) {
      dailyActivity[dateKey] = { count: 0, minutes: 0 };
    }

    dailyActivity[dateKey].count += 1;
    dailyActivity[dateKey].minutes += session.duration / 60;
  });

  return Object.entries(dailyActivity).map(([date, data]) => ({
    date,
    count: data.count,
    minutes: Math.round(data.minutes),
  }));
}

/**
 * Calculate daily and weekly streaks
 */
function calculateStreaks(sessions: Array<{ completedAt: number }>): {
  daily: number;
  weekly: number;
} {
  if (sessions.length === 0) {
    return { daily: 0, weekly: 0 };
  }

  // Group sessions by date
  const sessionsByDate: Record<string, number> = {};
  sessions.forEach((session) => {
    const date = new Date(session.completedAt);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    sessionsByDate[dateKey] = (sessionsByDate[dateKey] || 0) + 1;
  });

  // Calculate daily streak
  let dailyStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const checkDate = new Date(today);
  if (!sessionsByDate[todayKey]) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const checkKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;
    if (sessionsByDate[checkKey]) {
      dailyStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate weekly streak
  const sessionsByWeek: Record<string, number> = {};
  sessions.forEach((session) => {
    const date = new Date(session.completedAt);
    const startOfWeek = new Date(date);
    const dayOfWeek = date.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(date.getDate() + diff);
    startOfWeek.setHours(0, 0, 0, 0);
    const weekKey = startOfWeek.toISOString().split("T")[0];
    sessionsByWeek[weekKey] = (sessionsByWeek[weekKey] || 0) + 1;
  });

  let weeklyStreak = 0;
  const currentWeekStart = new Date();
  const currentDayOfWeek = currentWeekStart.getDay();
  const currentDiff = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  currentWeekStart.setDate(currentWeekStart.getDate() + currentDiff);
  currentWeekStart.setHours(0, 0, 0, 0);

  const checkWeek = new Date(currentWeekStart);

  while (true) {
    const weekKey = checkWeek.toISOString().split("T")[0];
    if (sessionsByWeek[weekKey] && sessionsByWeek[weekKey] >= 5) {
      weeklyStreak++;
      checkWeek.setDate(checkWeek.getDate() - 7);
    } else {
      break;
    }
  }

  return { daily: dailyStreak, weekly: weeklyStreak };
}

/**
 * Calculate best historical streak
 */
function calculateBestHistoricalStreak(sessions: Array<{ completedAt: number }>): number {
  if (sessions.length === 0) return 0;

  const sessionsByDate: Record<string, number> = {};
  sessions.forEach((session) => {
    const date = new Date(session.completedAt);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    sessionsByDate[dateKey] = (sessionsByDate[dateKey] || 0) + 1;
  });

  const sortedDates = Object.keys(sessionsByDate).sort();
  if (sortedDates.length === 0) return 0;

  let maxStreak = 0;
  let currentStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1]);
    const currDate = new Date(sortedDates[i]);

    const diffTime = currDate.getTime() - prevDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  maxStreak = Math.max(maxStreak, currentStreak);
  return maxStreak;
}

/**
 * Get level info for a user based on total pomodoros
 */
function getLevelInfo(totalPomos: number): {
  currentLevel: number;
  title: string;
  progress: number;
  pomosForNextLevel: number;
} {
  const getTotalPomosForLevel = (level: number): number => {
    if (level <= 1) return 0;
    if (level <= 5) return Math.pow(2, level - 1);
    let total = 16;
    for (let i = 6; i <= level; i++) {
      const gap = 10 + 5 * (i - 5);
      total += gap;
    }
    return total;
  };

  const getLevelTitle = (level: number): string => {
    const titles = [
      "Beginner",
      "Novice",
      "Apprentice",
      "Adept",
      "Expert",
      "Master",
      "Grandmaster",
      "Legend",
      "Mythic",
      "Immortal",
    ];
    if (level <= 0) return titles[0];
    if (level > titles.length) return titles[titles.length - 1];
    return titles[level - 1];
  };

  let currentLevel = 1;
  while (currentLevel < 100 && getTotalPomosForLevel(currentLevel + 1) <= totalPomos) {
    currentLevel++;
  }

  const pomosForCurrentLevel = getTotalPomosForLevel(currentLevel);
  const pomosForNextLevel = getTotalPomosForLevel(currentLevel + 1);
  const pomosInCurrentLevel = totalPomos - pomosForCurrentLevel;
  const pomosNeededForNextLevel = pomosForNextLevel - pomosForCurrentLevel;
  const progress = (pomosInCurrentLevel / pomosNeededForNextLevel) * 100;

  return {
    currentLevel,
    title: getLevelTitle(currentLevel),
    progress: Math.min(100, Math.max(0, progress)),
    pomosForNextLevel,
  };
}

/**
 * Get focus fitness data (EWMA score over time)
 */
async function getFocusFitnessForUser(
  ctx: QueryCtx,
  userId: Id<"users">,
  days: number
): Promise<Array<{ date: string; score: number }>> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fitnessAgo = Date.now() - days * 24 * 60 * 60 * 1000;

  const sessions = await ctx.db
    .query("pomodoros")
    .withIndex("by_user_and_date", (q) => q.eq("userId", userId).gte("completedAt", fitnessAgo))
    .filter((q) => q.eq(q.field("mode"), "focus"))
    .collect();

  // Group sessions by date
  const pomosByDate: Record<string, number> = {};
  sessions.forEach((session) => {
    const date = new Date(session.completedAt);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    pomosByDate[dateKey] = (pomosByDate[dateKey] || 0) + 1;
  });

  // Calculate EWMA
  const DECAY_FACTOR = 0.976;
  const POMO_WEIGHT = 1;
  const focusData: Array<{ date: string; score: number }> = [];
  let currentScore = 0;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    currentScore = currentScore * DECAY_FACTOR;
    const todayPomos = pomosByDate[dateKey] || 0;
    currentScore += todayPomos * POMO_WEIGHT;

    focusData.push({
      date: dateKey,
      score: Math.round(currentScore),
    });
  }

  return focusData;
}
