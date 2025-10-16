/**
 * @fileoverview Streak calculation utilities for daily and weekly streaks
 * @module convex/streakHelpers
 *
 * Key responsibilities:
 * - Calculate current daily streaks from session history
 * - Calculate current weekly streaks (5+ pomos per week)
 * - Calculate best historical streak (all-time longest)
 * - Single source of truth for streak logic
 *
 * Dependencies: dateHelpers.ts
 * Used by: stats.ts, profile.ts, publicProfile.ts, stats_helpers.ts, follows.ts
 */

import { formatDateKey, parseDateKey } from "./dateHelpers";

/**
 * Session type for streak calculations
 */
export interface Session {
  completedAt: number;
}

/**
 * Streak calculation result
 */
export interface StreakResult {
  daily: number;
  weekly: number;
}

/**
 * Calculate current daily and weekly streaks from sessions
 *
 * Daily streak: Consecutive days with at least 1 pomodoro
 * - If today has sessions, start from today
 * - If today has no sessions, start from yesterday
 * - Count backwards until gap found
 *
 * Weekly streak: Consecutive weeks with 5+ pomodoros
 * - Week starts Monday (ISO 8601)
 * - Requires minimum 5 pomodoros per week
 *
 * @param sessions - Array of completed session objects
 * @returns Object with daily and weekly streak counts
 */
export function calculateStreaks(sessions: Session[]): StreakResult {
  if (sessions.length === 0) {
    return { daily: 0, weekly: 0 };
  }

  // Group sessions by date for daily streak
  const sessionsByDate: Record<string, number> = {};
  sessions.forEach((session) => {
    const date = new Date(session.completedAt);
    const dateKey = formatDateKey(date);
    sessionsByDate[dateKey] = (sessionsByDate[dateKey] || 0) + 1;
  });

  // Calculate daily streak
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = formatDateKey(today);

  let dailyStreak = 0;
  const checkDate = new Date(today);

  // If no sessions today, start from yesterday
  if (!sessionsByDate[todayKey]) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Count backwards until gap found
  while (true) {
    const checkKey = formatDateKey(checkDate);
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
    // Week must have 5+ pomodoros to count
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
 * Calculate best historical daily streak from all sessions
 * Scans entire session history to find longest consecutive daily streak
 *
 * Algorithm:
 * 1. Group sessions by date
 * 2. Sort dates chronologically
 * 3. Scan for consecutive days, tracking max streak length
 *
 * @param sessions - Array of completed session objects
 * @returns Length of longest historical daily streak
 */
export function calculateBestHistoricalStreak(sessions: Session[]): number {
  if (sessions.length === 0) return 0;

  // Group sessions by date
  const sessionsByDate: Record<string, number> = {};
  sessions.forEach((session) => {
    const date = new Date(session.completedAt);
    const dateKey = formatDateKey(date);
    sessionsByDate[dateKey] = (sessionsByDate[dateKey] || 0) + 1;
  });

  const sortedDates = Object.keys(sessionsByDate).sort();
  if (sortedDates.length === 0) return 0;

  let maxStreak = 0;
  let currentStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = parseDateKey(sortedDates[i - 1]);
    const currDate = parseDateKey(sortedDates[i]);

    const diffTime = currDate.getTime() - prevDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Consecutive day
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      // Gap found, reset streak
      currentStreak = 1;
    }
  }

  // Final check in case the longest streak is at the end
  maxStreak = Math.max(maxStreak, currentStreak);

  return maxStreak;
}

/**
 * Get comprehensive streak stats including current and best streaks
 *
 * @param sessions - Array of completed session objects
 * @param cachedBestStreak - Optional cached best streak from database
 * @returns Object with daily, weekly, and best daily streak
 */
export function getStreakStats(
  sessions: Session[],
  cachedBestStreak?: number
): {
  dailyStreak: number;
  weeklyStreak: number;
  bestDailyStreak: number;
} {
  const { daily, weekly } = calculateStreaks(sessions);
  const historicalBest = calculateBestHistoricalStreak(sessions);

  // Best streak is the maximum of:
  // 1. Current streak (daily)
  // 2. Historical best from all sessions
  // 3. Cached best from database (if provided)
  const bestDailyStreak = Math.max(daily, historicalBest, cachedBestStreak || 0);

  return {
    dailyStreak: daily,
    weeklyStreak: weekly,
    bestDailyStreak,
  };
}
