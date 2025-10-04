import type { PomodoroSession, Mode } from "@/types/pomodoro";
import { SESSIONS_STORAGE_KEY } from "@/lib/constants";

export function loadSessions(): PomodoroSession[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(SESSIONS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: PomodoroSession[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Silently fail if localStorage is disabled
  }
}

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

export function getUnsyncedSessions(): PomodoroSession[] {
  const sessions = loadSessions();
  return sessions.filter((s) => !s.synced);
}

export function markSessionsSynced(sessionIds: string[]): void {
  const sessions = loadSessions();
  const updated = sessions.map((s) => (sessionIds.includes(s.id) ? { ...s, synced: true } : s));
  saveSessions(updated);
}

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
