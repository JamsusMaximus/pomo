/**
 * @fileoverview Timer state persistence for surviving page reloads during deployment
 * @module lib/storage/timerState
 *
 * Key responsibilities:
 * - Save active timer state to localStorage when running
 * - Restore timer state on page mount/reload
 * - Clear timer state when timer completes or is reset
 * - Prevent timer loss during Vercel deployments
 *
 * Dependencies: None
 * Used by: hooks/useTimer.ts
 */

import type { Mode } from "@/types/pomodoro";

const TIMER_STATE_KEY = "pomo_active_timer";

export interface TimerState {
  /** Whether the timer was running */
  isRunning: boolean;
  /** Current mode (focus or break) */
  mode: Mode;
  /** When the timer started (timestamp in ms) */
  startedAt: number;
  /** Total duration of current session in seconds */
  duration: number;
  /** When the timer was paused (null if not paused) */
  pausedAt: number | null;
  /** Whether flow mode is active */
  isFlowMode: boolean;
  /** Number of completed pomos in flow */
  flowCompletedPomos: number;
  /** When flow mode started (timestamp in ms) */
  flowStartTime: number | null;
}

/**
 * Save active timer state to localStorage
 * Called whenever timer state changes (start, pause, mode change)
 */
export function saveTimerState(state: TimerState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(state));
  } catch {
    console.warn("Failed to save timer state to localStorage");
  }
}

/**
 * Load saved timer state from localStorage
 * Returns null if no saved state or if state is invalid
 */
export function loadTimerState(): TimerState | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(TIMER_STATE_KEY);
    if (!stored) return null;

    const state: TimerState = JSON.parse(stored);

    // Validate the state has required fields
    if (
      typeof state.isRunning !== "boolean" ||
      typeof state.mode !== "string" ||
      typeof state.startedAt !== "number" ||
      typeof state.duration !== "number"
    ) {
      console.warn("Invalid timer state, clearing");
      clearTimerState();
      return null;
    }

    return state;
  } catch {
    console.warn("Failed to load timer state from localStorage");
    return null;
  }
}

/**
 * Clear timer state from localStorage
 * Called when timer completes, is reset, or is manually stopped
 */
export function clearTimerState(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TIMER_STATE_KEY);
  } catch {
    console.warn("Failed to clear timer state from localStorage");
  }
}

/**
 * Calculate remaining time from saved state
 * Accounts for elapsed time since state was saved
 *
 * @param state - Saved timer state
 * @returns Seconds remaining (0 if timer expired)
 */
export function calculateRemainingTime(state: TimerState): number {
  const now = Date.now();

  // If paused, calculate time remaining at pause moment
  if (state.pausedAt) {
    const elapsedBeforePause = Math.floor((state.pausedAt - state.startedAt) / 1000);
    return Math.max(state.duration - elapsedBeforePause, 0);
  }

  // If running, calculate current remaining time
  const elapsed = Math.floor((now - state.startedAt) / 1000);
  return Math.max(state.duration - elapsed, 0);
}
