/**
 * @fileoverview Custom React hook for Pomodoro timer functionality
 * @module hooks/useTimer
 *
 * Key responsibilities:
 * - Manage timer countdown state (remaining time, running/paused)
 * - Handle focus/break mode transitions with callbacks
 * - Provide start, pause, reset, and skip controls
 * - Auto-start break mode when focus completes (configurable)
 * - Support debug mode for testing (set custom duration)
 *
 * Dependencies: React hooks
 * Used by: app/page.tsx (main timer UI)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { Mode } from "@/types/pomodoro";

/**
 * Options for configuring the Pomodoro timer
 */
interface UseTimerOptions {
  /** Duration of focus sessions in seconds */
  focusDuration: number;
  /** Duration of break sessions in seconds */
  breakDuration: number;
  /** Whether to automatically start break after focus session completes */
  autoStartBreak?: boolean;
  /** Callback fired when timer mode changes (focus ↔ break) */
  onModeChange?: (mode: Mode) => void;
  /** Callback fired when a full cycle (focus + break) completes */
  onCycleComplete?: () => void;
}

/**
 * Return value from useTimer hook
 */
interface UseTimerReturn {
  /** Seconds remaining in current session */
  remaining: number;
  /** Total duration of current session in seconds */
  duration: number;
  /** Current timer mode (focus or break) */
  mode: Mode;
  /** Whether timer is actively running */
  isRunning: boolean;
  /** Start or resume the timer */
  start: () => void;
  /** Pause the timer (can be resumed) */
  pause: () => void;
  /** Reset timer to initial state (focus mode, full duration) */
  reset: () => void;
  /** Debug helper: Set timer to specific seconds (DEV only) */
  setDebugTime: (seconds: number) => void;
}

/**
 * Drift-resistant Pomodoro timer hook
 *
 * Features:
 * - Uses Date.now() for elapsed time calculation (prevents drift)
 * - Visibility change reconciliation (handles tab switching)
 * - Auto-mode switching (focus → break → focus)
 * - Pause/resume support
 *
 * Performance: O(1) updates every second, no expensive calculations
 *
 * @param options - Timer configuration options
 * @returns Timer state and control functions
 *
 * @example
 * ```tsx
 * const { remaining, isRunning, start, pause } = useTimer({
 *   focusDuration: 25 * 60,
 *   breakDuration: 5 * 60,
 *   onModeChange: (mode) => console.log('Mode:', mode),
 * });
 * ```
 */
export function useTimer({
  focusDuration,
  breakDuration,
  autoStartBreak = false,
  onModeChange,
  onCycleComplete,
}: UseTimerOptions): UseTimerReturn {
  const [mode, setMode] = useState<Mode>("focus");
  const [remaining, setRemaining] = useState(focusDuration);
  const [isRunning, setIsRunning] = useState(false);

  const durationRef = useRef(focusDuration);
  const startedAtRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const modeRef = useRef<Mode>("focus");
  const focusDurationRef = useRef(focusDuration);
  const breakDurationRef = useRef(breakDuration);

  // Keep refs in sync
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    focusDurationRef.current = focusDuration;
    breakDurationRef.current = breakDuration;
  }, [focusDuration, breakDuration]);

  // Define handleTimerComplete before it's used
  const handleTimerComplete = useCallback(() => {
    if (modeRef.current === "focus") {
      // Focus finished → switch to break
      const newMode: Mode = "break";
      setMode(newMode);
      durationRef.current = breakDurationRef.current;
      setRemaining(breakDurationRef.current);
      onModeChange?.(newMode);

      if (autoStartBreak) {
        // Auto-start break after a short delay
        setTimeout(() => {
          startedAtRef.current = Date.now();
          pausedAtRef.current = null;
          setIsRunning(true);
        }, 100);
      }
    } else {
      // Break finished → switch to focus and signal cycle complete
      const newMode: Mode = "focus";
      setMode(newMode);
      durationRef.current = focusDurationRef.current;
      setRemaining(focusDurationRef.current);
      onModeChange?.(newMode);
      onCycleComplete?.();
    }

    // Reset timing refs for next session (unless auto-starting)
    if (!autoStartBreak || modeRef.current === "break") {
      startedAtRef.current = null;
      pausedAtRef.current = null;
    }
  }, [autoStartBreak, onModeChange, onCycleComplete]);

  // Reconcile timer when tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isRunning && startedAtRef.current) {
        // Recalculate remaining time based on actual elapsed time
        const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
        const next = Math.max(durationRef.current - elapsed, 0);
        setRemaining(next);

        // If timer expired while tab was hidden, handle completion
        if (next === 0) {
          setIsRunning(false);
          handleTimerComplete();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isRunning, handleTimerComplete]);

  // Main timer tick
  useEffect(() => {
    if (!isRunning) return;

    const tick = () => {
      if (!startedAtRef.current) return;

      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      const next = Math.max(durationRef.current - elapsed, 0);
      setRemaining(next);

      if (next === 0) {
        setIsRunning(false);
        handleTimerComplete();
      }
    };

    const id = setInterval(tick, 1000);
    tick(); // Immediate tick to avoid 1s delay

    return () => clearInterval(id);
  }, [isRunning, handleTimerComplete]);

  const start = useCallback(() => {
    if (isRunning) return;

    const now = Date.now();
    if (pausedAtRef.current && startedAtRef.current) {
      // Resume: shift startedAt by the paused duration
      const pausedDuration = now - pausedAtRef.current;
      startedAtRef.current += pausedDuration;
      pausedAtRef.current = null;
    } else {
      // Fresh start
      startedAtRef.current = now;
      setRemaining(durationRef.current);
    }
    setIsRunning(true);
  }, [isRunning]);

  const pause = useCallback(() => {
    if (!isRunning) return;
    setIsRunning(false);
    pausedAtRef.current = Date.now();
  }, [isRunning]);

  const reset = useCallback(() => {
    setIsRunning(false);
    startedAtRef.current = null;
    pausedAtRef.current = null;
    setMode("focus");
    durationRef.current = focusDurationRef.current;
    setRemaining(focusDurationRef.current);
  }, []);

  const setDebugTime = useCallback((seconds: number) => {
    setIsRunning(false);
    startedAtRef.current = null;
    pausedAtRef.current = null;
    durationRef.current = seconds;
    setRemaining(seconds);
  }, []);

  return {
    remaining,
    duration: durationRef.current,
    mode,
    isRunning,
    start,
    pause,
    reset,
    setDebugTime,
  };
}
