import type { PersistedPreferences } from "@/types/pomodoro";
import { STORAGE_KEY } from "@/lib/constants";

export function loadPreferences(): PersistedPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function savePreferences(prefs: PersistedPreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Silently fail if localStorage is disabled
  }
}
