/**
 * @fileoverview Optimized profile page data query
 * @module convex/profile
 *
 * Key responsibilities:
 * - Fetch all profile page data in a single optimized query
 * - Reduce database round-trips from 5 queries to 1
 * - Calculate stats, activity, focus graph, challenges, and level config together
 *
 * Dependencies: Convex server runtime
 * Used by: app/profile/page.tsx
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get default level configuration
 */
function getDefaultLevelConfig() {
  return [
    { level: 1, title: "Beginner", threshold: 0 },
    { level: 2, title: "Novice", threshold: 2 },
    { level: 3, title: "Apprentice", threshold: 4 },
    { level: 4, title: "Adept", threshold: 8 },
    { level: 5, title: "Expert", threshold: 16 },
    { level: 6, title: "Master", threshold: 31 },
    { level: 7, title: "Grandmaster", threshold: 51 },
    { level: 8, title: "Legend", threshold: 76 },
    { level: 9, title: "Mythic", threshold: 106 },
    { level: 10, title: "Immortal", threshold: 141 },
    { level: 11, title: "Transcendent", threshold: 181 },
    { level: 12, title: "Eternal", threshold: 226 },
    { level: 13, title: "Divine", threshold: 276 },
    { level: 14, title: "Omniscient", threshold: 331 },
    { level: 15, title: "Ultimate", threshold: 391 },
  ];
}

/**
 * Get all profile data in a single optimized query
 * This replaces 5 separate queries with 1, significantly improving load time
 */
export const getProfileData = query({
  args: {
    fitnessPeriod: v.optional(v.union(v.literal(7), v.literal(90))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return null;
    }

    // Fetch all sessions once
    const allSessions = await ctx.db
      .query("pomodoros")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("mode"), "focus"))
      .collect();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate time boundaries
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(today.getDate() + diff);
    const weekTimestamp = startOfWeek.getTime();

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthTimestamp = startOfMonth.getTime();

    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const yearTimestamp = startOfYear.getTime();

    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const fitnessDays = args.fitnessPeriod || 90;
    const fitnessAgo = Date.now() - fitnessDays * 24 * 60 * 60 * 1000;

    // Single-pass aggregation for stats
    const stats = {
      total: { count: 0, minutes: 0 },
      week: { count: 0, minutes: 0 },
      month: { count: 0, minutes: 0 },
      year: { count: 0, minutes: 0 },
    };

    const dailyActivity: Record<string, { count: number; minutes: number }> = {};
    const fitnessPomosByDate: Record<string, number> = {};

    allSessions.forEach((session) => {
      const durationMinutes = session.duration / 60;
      stats.total.count += 1;
      stats.total.minutes += durationMinutes;

      if (session.completedAt >= weekTimestamp) {
        stats.week.count += 1;
        stats.week.minutes += durationMinutes;
      }
      if (session.completedAt >= monthTimestamp) {
        stats.month.count += 1;
        stats.month.minutes += durationMinutes;
      }
      if (session.completedAt >= yearTimestamp) {
        stats.year.count += 1;
        stats.year.minutes += durationMinutes;
      }

      // Activity heatmap (past year)
      if (session.completedAt >= oneYearAgo) {
        const date = new Date(session.completedAt);
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

        if (!dailyActivity[dateKey]) {
          dailyActivity[dateKey] = { count: 0, minutes: 0 };
        }
        dailyActivity[dateKey].count += 1;
        dailyActivity[dateKey].minutes += durationMinutes;
      }

      // Focus fitness data
      if (session.completedAt >= fitnessAgo) {
        const date = new Date(session.completedAt);
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        fitnessPomosByDate[dateKey] = (fitnessPomosByDate[dateKey] || 0) + 1;
      }
    });

    // Calculate streaks
    const sortedSessions = [...allSessions].sort((a, b) => b.completedAt - a.completedAt);

    let dailyStreak = 0;
    const currentDate = new Date(today);
    let checkingDate = true;

    while (checkingDate) {
      currentDate.setHours(0, 0, 0, 0);
      const dateStart = currentDate.getTime();
      const dateEnd = dateStart + 24 * 60 * 60 * 1000;

      const hasSession = sortedSessions.some(
        (s) => s.completedAt >= dateStart && s.completedAt < dateEnd
      );

      if (hasSession) {
        dailyStreak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (currentDate.getTime() === today.getTime()) {
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        checkingDate = false;
      }
    }

    // Calculate best historical streak
    const calculateBestStreak = (sessions: Array<{ completedAt: number }>) => {
      if (sessions.length === 0) return 0;

      const sortedSessions = [...sessions].sort((a, b) => a.completedAt - b.completedAt);
      const uniqueDates = new Set<string>();

      sortedSessions.forEach((session) => {
        const date = new Date(session.completedAt);
        date.setHours(0, 0, 0, 0);
        const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        uniqueDates.add(dateKey);
      });

      const sortedDates = Array.from(uniqueDates).sort();
      let maxStreak = 0;
      let currentStreak = 1;

      for (let i = 1; i < sortedDates.length; i++) {
        const [prevYear, prevMonth, prevDay] = sortedDates[i - 1].split("-").map(Number);
        const [currYear, currMonth, currDay] = sortedDates[i].split("-").map(Number);

        const prevDate = new Date(prevYear, prevMonth, prevDay);
        const currDate = new Date(currYear, currMonth, currDay);

        const dayDiff = Math.floor(
          (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (dayDiff === 1) {
          currentStreak++;
        } else {
          maxStreak = Math.max(maxStreak, currentStreak);
          currentStreak = 1;
        }
      }

      return Math.max(maxStreak, currentStreak);
    };

    const bestDailyStreak = user.bestDailyStreak || calculateBestStreak(allSessions);

    // Calculate focus graph with Strava-style decay
    // Strava uses two values: Fitness (long-term) and Fatigue (short-term)
    // We'll use a simplified version with exponential moving average
    const DECAY_FACTOR = 0.95; // Faster decay - drops to ~60% after 7 days, ~36% after 14 days
    const POMO_WEIGHT = 10; // Higher weight so scores are more visible
    const focusData: Array<{ date: string; score: number }> = [];
    let currentScore = 0;

    for (let i = fitnessDays - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

      // Apply decay every day (Strava-style: fitness decays even on rest days)
      currentScore = currentScore * DECAY_FACTOR;

      // Add today's pomodoros (if any)
      const todayPomos = fitnessPomosByDate[dateKey] || 0;
      currentScore += todayPomos * POMO_WEIGHT;

      focusData.push({
        date: dateKey,
        score: Math.round(currentScore),
      });
    }

    // Get user challenges
    const challenges = await ctx.db.query("challenges").collect();
    const userChallenges = await ctx.db
      .query("userChallenges")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const activeChallenges = userChallenges
      .filter((uc) => !uc.completed)
      .map((uc) => {
        const challenge = challenges.find((c) => c._id === uc.challengeId);
        if (!challenge) return null;
        return {
          _id: uc._id,
          name: challenge.name,
          description: challenge.description,
          type: challenge.type,
          target: challenge.target,
          badge: challenge.badge,
          progress: uc.progress,
          completedAt: uc.completedAt,
          recurringMonth: challenge.recurringMonth,
        };
      })
      .filter((c) => c !== null);

    const completedChallenges = userChallenges
      .filter((uc) => uc.completed)
      .map((uc) => {
        const challenge = challenges.find((c) => c._id === uc.challengeId);
        if (!challenge) return null;
        return {
          _id: uc._id,
          name: challenge.name,
          description: challenge.description,
          type: challenge.type,
          target: challenge.target,
          badge: challenge.badge,
          progress: uc.progress,
          completedAt: uc.completedAt,
          recurringMonth: challenge.recurringMonth,
        };
      })
      .filter((c) => c !== null);

    // Get level config with fallback to defaults
    const levelConfigs = await ctx.db.query("levelConfig").withIndex("by_level").collect();
    const sortedLevels =
      levelConfigs.length > 0
        ? levelConfigs.sort((a, b) => a.level - b.level)
        : getDefaultLevelConfig();

    return {
      stats: {
        total: { count: stats.total.count, minutes: Math.round(stats.total.minutes) },
        week: { count: stats.week.count, minutes: Math.round(stats.week.minutes) },
        month: { count: stats.month.count, minutes: Math.round(stats.month.minutes) },
        year: { count: stats.year.count, minutes: Math.round(stats.year.minutes) },
        dailyStreak,
        weeklyStreak: 0, // Not currently used
        bestDailyStreak,
        userCreatedAt: user.createdAt,
      },
      activity: Object.entries(dailyActivity).map(([date, data]) => ({
        date,
        count: data.count,
        minutes: Math.round(data.minutes),
      })),
      focusGraph: focusData,
      userChallenges: {
        active: activeChallenges,
        completed: completedChallenges,
      },
      levelConfig: sortedLevels,
    };
  },
});
