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
