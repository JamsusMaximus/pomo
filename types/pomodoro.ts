export type Mode = "focus" | "break";

export interface PersistedPreferences {
  focusDuration: number;
  breakDuration: number;
  lastMode: Mode;
  cyclesCompleted: number;
}

export interface PomodoroSession {
  id: string;
  tag?: string;
  duration: number; // seconds
  mode: Mode;
  completedAt: number; // timestamp
  synced: boolean; // whether it's been synced to Convex
}
