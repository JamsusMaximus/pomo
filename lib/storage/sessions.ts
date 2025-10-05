import type { PomodoroSession, Mode } from "@/types/pomodoro";
import { SESSIONS_STORAGE_KEY } from "@/lib/constants";

/**
 * Loads all pomodoro sessions from localStorage
 *
 * Safe for SSR: Returns empty array during server-side rendering
 *
 * @returns Array of session objects
 */
export function loadSessions(): PomodoroSession[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(SESSIONS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Saves sessions array to localStorage
 *
 * Safe for SSR: No-op during server-side rendering
 *
 * @param sessions - Array of sessions to persist
 */
export function saveSessions(sessions: PomodoroSession[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Silently fail if localStorage is disabled
  }
}

/**
 * Creates and saves a new completed pomodoro session
 *
 * Features:
 * - Generates unique ID using timestamp + random string
 * - Marks as unsynced (for later Convex upload when user signs in)
 * - Appends to existing sessions in localStorage
 *
 * @param mode - Session type (focus or break)
 * @param duration - Duration in seconds
 * @param tag - Optional tag/label for focus sessions
 * @returns The created session object
 */
export function saveCompletedSession(mode: Mode, duration: number, tag?: string): PomodoroSession {
  const session: PomodoroSession = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    mode,
    duration,
    tag: tag || undefined,
    completedAt: Date.now(),
    synced: false,
  };

  const sessions = loadSessions();
  sessions.push(session);
  saveSessions(sessions);

  return session;
}

/**
 * Gets all sessions that haven't been synced to Convex yet
 *
 * Used when user signs in to upload local sessions to cloud
 *
 * @returns Array of unsynced sessions
 */
export function getUnsyncedSessions(): PomodoroSession[] {
  const sessions = loadSessions();
  return sessions.filter((s) => !s.synced);
}

/**
 * Marks sessions as synced to Convex
 *
 * Updates the synced flag to prevent duplicate uploads
 *
 * @param sessionIds - Array of session IDs to mark as synced
 */
export function markSessionsSynced(sessionIds: string[]): void {
  const sessions = loadSessions();
  const updated = sessions.map((s) => (sessionIds.includes(s.id) ? { ...s, synced: true } : s));
  saveSessions(updated);
}

/**
 * Seeds localStorage with test pomodoro data (DEV only)
 *
 * Only runs if no existing sessions found.
 * Creates 3 sample focus sessions for UI testing.
 *
 * Safe for SSR: No-op during server-side rendering
 */
export function seedTestPomodoros(): void {
  if (typeof window === "undefined") return;

  // Check if test data already exists
  const existing = loadSessions();
  if (existing.length > 0) return; // Don't seed if there's already data

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const testPomodoros: PomodoroSession[] = [
    {
      id: "test-1",
      mode: "focus",
      duration: 25 * 60, // 25 minutes
      tag: "Deep Work",
      completedAt: today.getTime() + 20 * 60 * 60 * 1000, // 8pm today
      synced: false,
    },
    {
      id: "test-2",
      mode: "focus",
      duration: 25 * 60,
      tag: "Code Review",
      completedAt: today.getTime() + 21 * 60 * 60 * 1000, // 9pm today
      synced: false,
    },
    {
      id: "test-3",
      mode: "focus",
      duration: 25 * 60,
      tag: undefined, // No tag
      completedAt: today.getTime() + 22 * 60 * 60 * 1000 + 60 * 1000, // 10:01pm today
      synced: false,
    },
  ];

  saveSessions(testPomodoros);
}
