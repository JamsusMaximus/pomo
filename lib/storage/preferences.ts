import type { PersistedPreferences } from "@/types/pomodoro";
import { STORAGE_KEY } from "@/lib/constants";

/**
 * Loads user preferences from localStorage
 *
 * Safe for SSR: Returns null during server-side rendering
 *
 * @returns Preferences object or null if not found or invalid
 */
export function loadPreferences(): PersistedPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Saves user preferences to localStorage
 *
 * Safe for SSR: No-op during server-side rendering
 * Silently fails if localStorage is disabled or quota exceeded
 *
 * @param prefs - Preferences object to persist
 */
export function savePreferences(prefs: PersistedPreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Silently fail if localStorage is disabled
  }
}
