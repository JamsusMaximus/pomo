/**
 * @fileoverview Unified stats calculation from pomodoros table
 * @module convex/stats-helpers
 *
 * Single source of truth for user statistics.
 * Computes stats on-demand from pomodoros table - always correct, no cache to sync.
 *
 * Key responsibilities:
 * - Calculate total, daily, weekly, monthly pomodoro counts
 * - Compute streak information
 * - Provide stats for challenge progress calculations
 *
 * Dependencies: Convex server runtime
 * Used by: challenges.ts, stats.ts, profile.ts
 */

import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Get the start of the week (Monday) for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // If Sunday (0), go back 6 days, else go to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Calculate best historical streak from sessions
 * Finds the longest consecutive daily streak in entire history
 */
function calculateBestStreak(sessions: Array<{ completedAt: number }>): number {
  if (sessions.length === 0) return 0;

  // Group sessions by date
  const sessionsByDate: Record<string, number> = {};
  sessions.forEach((session) => {
    const date = new Date(session.completedAt);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    sessionsByDate[dateKey] = (sessionsByDate[dateKey] || 0) + 1;
  });

  // Get all dates sorted chronologically
  const sortedDates = Object.keys(sessionsByDate).sort();
  if (sortedDates.length === 0) return 0;

  let maxStreak = 1;
  let currentStreak = 1;

  // Find longest consecutive streak
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

  return maxStreak;
}

/**
 * Calculate current daily streak
 * Counts consecutive days with at least one pomodoro, ending today or yesterday
 */
function calculateCurrentStreak(sessions: Array<{ completedAt: number }>): number {
  if (sessions.length === 0) return 0;

  // Group sessions by date
  const sessionsByDate: Record<string, number> = {};
  sessions.forEach((session) => {
    const date = new Date(session.completedAt);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    sessionsByDate[dateKey] = (sessionsByDate[dateKey] || 0) + 1;
  });

  const sortedDates = Object.keys(sessionsByDate).sort().reverse(); // Most recent first
  if (sortedDates.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

  // Streak must include today or yesterday
  if (sortedDates[0] !== todayKey && sortedDates[0] !== yesterdayKey) {
    return 0;
  }

  let streak = 1;
  const expectedDate = new Date(sortedDates[0]);

  for (let i = 1; i < sortedDates.length; i++) {
    expectedDate.setDate(expectedDate.getDate() - 1);
    const expectedKey = `${expectedDate.getFullYear()}-${String(expectedDate.getMonth() + 1).padStart(2, "0")}-${String(expectedDate.getDate()).padStart(2, "0")}`;

    if (sortedDates[i] === expectedKey) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export interface UserStats {
  total: number;
  today: number;
  week: number;
  month: number;
  currentStreak: number;
  bestStreak: number;
  pomodoros: Array<{ completedAt: number; duration: number; tag?: string }>;
}

/**
 * Calculate all user statistics from pomodoros table
 * This is the single source of truth - always accurate, no cache sync issues
 *
 * Fast with proper indexes (by_user_and_date)
 * Convex client-side caching makes this feel instant
 */
export async function calculateUserStats(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
): Promise<UserStats> {
  // Fetch all focus pomodoros for this user (indexed query, fast)
  const allPomos = await ctx.db
    .query("pomodoros")
    .withIndex("by_user_and_date", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("mode"), "focus"))
    .collect();

  const now = new Date();

  // Calculate period start timestamps
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = getWeekStart(now).getTime();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  // Filter once, use multiple times
  const todayPomos = allPomos.filter((p) => p.completedAt >= todayStart);
  const weekPomos = allPomos.filter((p) => p.completedAt >= weekStart);
  const monthPomos = allPomos.filter((p) => p.completedAt >= monthStart);

  // Calculate streaks
  const currentStreak = calculateCurrentStreak(allPomos);
  const bestStreak = calculateBestStreak(allPomos);

  return {
    total: allPomos.length,
    today: todayPomos.length,
    week: weekPomos.length,
    month: monthPomos.length,
    currentStreak,
    bestStreak,
    pomodoros: allPomos.map((p) => ({
      completedAt: p.completedAt,
      duration: p.duration,
      tag: p.tag,
    })),
  };
}
