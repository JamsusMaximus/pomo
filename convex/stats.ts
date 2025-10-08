/**
 * @fileoverview User statistics and activity queries
 * @module convex/stats
 *
 * Key responsibilities:
 * - Calculate user stats (total, weekly, monthly, yearly pomodoro counts)
 * - Compute current daily and weekly streaks
 * - Track best historical daily streak (never decreases)
 * - Generate daily activity data for heatmap visualization
 * - Update user's bestDailyStreak field when new records achieved
 *
 * Dependencies: Convex server runtime
 * Used by: app/profile/page.tsx (stats display), components/ActivityHeatmap.tsx
 */

import { query } from "./_generated/server";

/**
 * Get minimal profile data for instant loading (cached values only)
 * Used by the top-right profile section for fast initial render
 */
export const getProfileStats = query({
  args: {},
  handler: async (ctx) => {
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

    // Return only cached values - no expensive session queries
    return {
      total: {
        count: user.totalPomos ?? 0,
      },
    };
  },
});

/**
 * Get user statistics for pomodoro sessions
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
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

    // Get all focus sessions
    const sessions = await ctx.db
      .query("pomodoros")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("mode"), "focus"))
      .collect();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate start of week (Monday)
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days
    startOfWeek.setDate(today.getDate() + diff);
    const weekTimestamp = startOfWeek.getTime();

    // Calculate start of month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthTimestamp = startOfMonth.getTime();

    // Calculate start of year
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const yearTimestamp = startOfYear.getTime();

    // Single-pass aggregation: O(N) instead of O(4N)
    const stats = sessions.reduce(
      (acc, session) => {
        const minutes = session.duration / 60;

        // Total (all sessions)
        acc.total.count++;
        acc.total.minutes += minutes;

        // Year
        if (session.completedAt >= yearTimestamp) {
          acc.year.count++;
          acc.year.minutes += minutes;
        }

        // Month
        if (session.completedAt >= monthTimestamp) {
          acc.month.count++;
          acc.month.minutes += minutes;
        }

        // Week
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

    // Calculate best historical streak from all sessions
    const historicalBest = calculateBestHistoricalStreak(sessions);

    // Get the actual best (either stored or calculated)
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
      userCreatedAt: user.createdAt,
    };
  },
});

/**
 * Get daily activity for the past year (for heatmap)
 */
export const getActivity = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return [];
    }

    // Get sessions from the past year
    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const sessions = await ctx.db
      .query("pomodoros")
      .withIndex("by_user_and_date", (q) => q.eq("userId", user._id).gte("completedAt", oneYearAgo))
      .filter((q) => q.eq(q.field("mode"), "focus"))
      .collect();

    // Group by day
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

    // Convert to array
    return Object.entries(dailyActivity).map(([date, data]) => ({
      date,
      count: data.count,
      minutes: Math.round(data.minutes),
    }));
  },
});

/**
 * Calculate the best historical streak from all sessions
 * Finds the longest consecutive daily streak in the entire history
 */
function calculateBestHistoricalStreak(sessions: Array<{ completedAt: number }>): number {
  if (sessions.length === 0) {
    return 0;
  }

  // Group sessions by date
  const sessionsByDate: Record<string, number> = {};
  sessions.forEach((session) => {
    const date = new Date(session.completedAt);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    sessionsByDate[dateKey] = (sessionsByDate[dateKey] || 0) + 1;
  });

  // Get all dates sorted chronologically
  const sortedDates = Object.keys(sessionsByDate).sort();

  if (sortedDates.length === 0) {
    return 0;
  }

  let maxStreak = 0;
  let currentStreak = 1;

  // Iterate through sorted dates to find longest consecutive streak
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1]);
    const currDate = new Date(sortedDates[i]);

    // Calculate difference in days
    const diffTime = currDate.getTime() - prevDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Consecutive day
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      // Gap in streak, reset
      currentStreak = 1;
    }
  }

  // Don't forget the last streak
  maxStreak = Math.max(maxStreak, currentStreak);

  return maxStreak;
}

/**
 * Calculate daily and weekly streaks
 * Daily streak: consecutive days with at least 1 completed pomodoro
 * Weekly streak: consecutive weeks with at least 5 completed pomodoros
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

  // Get sorted dates (most recent first) - kept for potential future use
  // const sortedDates = Object.keys(sessionsByDate).sort().reverse();

  // Calculate daily streak
  let dailyStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Start from today or yesterday (allow for timezone differences)
  const checkDate = new Date(today);
  if (!sessionsByDate[todayKey]) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Count consecutive days with sessions
  while (true) {
    const checkKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;
    if (sessionsByDate[checkKey]) {
      dailyStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate weekly streak (weeks with at least 5 pomodoros)
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

  // const sortedWeeks = Object.keys(sessionsByWeek).sort().reverse();
  let weeklyStreak = 0;

  const currentWeekStart = new Date();
  const dayOfWeek = currentWeekStart.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  currentWeekStart.setDate(currentWeekStart.getDate() + diff);
  currentWeekStart.setHours(0, 0, 0, 0);

  const checkWeek = new Date(currentWeekStart);

  // Count consecutive weeks with at least 5 pomodoros
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
 * Get Focus Graph data - similar to Strava's fitness graph
 * Uses exponential weighted moving average to show productivity trends
 */
export const getFocusGraph = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return [];
    }

    // Get sessions from past 90 days
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const sessions = await ctx.db
      .query("pomodoros")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", user._id).gte("completedAt", ninetyDaysAgo)
      )
      .filter((q) => q.eq(q.field("mode"), "focus"))
      .collect();

    // Group by date
    const pomosByDate: Record<string, number> = {};
    sessions.forEach((session) => {
      const date = new Date(session.completedAt);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      pomosByDate[dateKey] = (pomosByDate[dateKey] || 0) + 1;
    });

    // Calculate focus score for each day using exponential weighted moving average
    // Uses Strava's CTL (Chronic Training Load) algorithm: 42-day EWMA
    const DECAY_FACTOR = 0.976; // ~2.4% daily decay (matches Strava's 42-day time constant)
    const POMO_WEIGHT = 1; // Each pomo adds 1 point (more reasonable scale)

    const focusData: Array<{ date: string; score: number }> = [];
    let currentScore = 0;

    // Generate data for past 90 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 89; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

      // Apply decay from previous day
      currentScore = currentScore * DECAY_FACTOR;

      // Add today's pomos
      const todayPomos = pomosByDate[dateKey] || 0;
      currentScore += todayPomos * POMO_WEIGHT;

      focusData.push({
        date: dateKey,
        score: Math.round(currentScore),
      });
    }

    return focusData;
  },
});
