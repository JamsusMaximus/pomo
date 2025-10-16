/**
 * @fileoverview Date formatting utilities for Convex backend
 * @module convex/date-helpers
 *
 * Key responsibilities:
 * - Format dates as YYYY-MM-DD strings for consistent date keys
 * - Parse date strings back to Date objects
 * - Ensure timezone-independent date handling
 *
 * Dependencies: None (pure functions)
 * Used by: stats.ts, profile.ts, publicProfile.ts, follows.ts, challenges.ts
 */

/**
 * Format a Date object as YYYY-MM-DD string
 * Used for consistent date keys across the backend
 *
 * @example
 * formatDateKey(new Date("2025-10-16")) // "2025-10-16"
 *
 * @param date - Date object to format
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string to a Date object
 * Sets time to midnight local time
 *
 * @param dateKey - Date string in YYYY-MM-DD format
 * @returns Date object at midnight local time
 */
export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get today's date key in YYYY-MM-DD format
 * Sets time to midnight for consistent date comparisons
 *
 * @returns Today's date as YYYY-MM-DD string
 */
export function getTodayKey(): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return formatDateKey(today);
}

/**
 * Check if two date keys represent consecutive days
 *
 * @param dateKey1 - First date in YYYY-MM-DD format
 * @param dateKey2 - Second date in YYYY-MM-DD format
 * @returns True if dates are consecutive (1 day apart)
 */
export function areConsecutiveDays(dateKey1: string, dateKey2: string): boolean {
  const date1 = parseDateKey(dateKey1);
  const date2 = parseDateKey(dateKey2);
  const diffTime = date2.getTime() - date1.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return Math.abs(diffDays) === 1;
}
