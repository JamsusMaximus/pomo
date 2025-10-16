/**
 * @fileoverview Time boundary calculations for stats aggregation
 * @module convex/time-helpers
 *
 * Key responsibilities:
 * - Calculate start-of-period timestamps (day, week, month, year)
 * - Provide consistent time boundary logic across backend
 * - Handle timezone-independent calculations
 *
 * Dependencies: None (pure functions)
 * Used by: stats.ts, profile.ts, publicProfile.ts, stats_helpers.ts
 */

/**
 * Milliseconds in one day
 */
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Milliseconds in one hour
 */
export const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Seconds per minute
 */
export const SECONDS_PER_MINUTE = 60;

/**
 * Get start of day (midnight) for a given date
 *
 * @param date - Date to get start of day for (defaults to now)
 * @returns Timestamp of midnight on the given date
 */
export function getStartOfDay(date: Date = new Date()): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Get start of week (Monday at midnight) for a given date
 * Week starts on Monday per ISO 8601
 *
 * @example
 * // For any date in a week, returns Monday midnight
 * getStartOfWeek(new Date("2025-10-16")) // Returns Monday of that week
 *
 * @param date - Date to get start of week for (defaults to now)
 * @returns Timestamp of Monday midnight for the week containing the date
 */
export function getStartOfWeek(date: Date = new Date()): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  const dayOfWeek = d.getDay();
  // If Sunday (0), go back 6 days. Otherwise go back (dayOfWeek - 1) days
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + diff);

  return d.getTime();
}

/**
 * Get start of month (first day at midnight) for a given date
 *
 * @param date - Date to get start of month for (defaults to now)
 * @returns Timestamp of first day of month at midnight
 */
export function getStartOfMonth(date: Date = new Date()): number {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Get start of year (January 1st at midnight) for a given date
 *
 * @param date - Date to get start of year for (defaults to now)
 * @returns Timestamp of January 1st at midnight
 */
export function getStartOfYear(date: Date = new Date()): number {
  const d = new Date(date);
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Check if a timestamp falls within a given time period
 *
 * @param timestamp - Timestamp to check
 * @param periodStart - Start of period (timestamp)
 * @returns True if timestamp is at or after period start
 */
export function isInPeriod(timestamp: number, periodStart: number): boolean {
  return timestamp >= periodStart;
}

/**
 * Get all time boundaries for current date
 * Useful for stats calculations that need multiple boundaries at once
 *
 * @returns Object with today, week, month, and year start timestamps
 */
export function getTimeBoundaries() {
  const now = new Date();
  return {
    today: getStartOfDay(now),
    week: getStartOfWeek(now),
    month: getStartOfMonth(now),
    year: getStartOfYear(now),
  };
}

/**
 * Get timestamp N days ago from now
 *
 * @param days - Number of days to go back
 * @returns Timestamp for N days ago
 */
export function getDaysAgo(days: number): number {
  return Date.now() - days * MS_PER_DAY;
}
