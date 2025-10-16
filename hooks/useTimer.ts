/**
 * @fileoverview Custom React hook for Pomodoro timer functionality with state backup
 * @module hooks/useTimer
 *
 * Key responsibilities:
 * - Manage timer countdown state (remaining time, running/paused)
 * - Handle focus/break mode transitions with callbacks
 * - Provide start, pause, reset, and skip controls
 * - Auto-start break mode when focus completes (configurable)
 * - Support debug mode for testing (set custom duration)
 * - Save timer state to localStorage (emergency backup, NOT auto-restored)
 * - Warn user before refresh/close when timer is active
 *
 * Dependencies: React hooks, lib/storage/timerState.ts
 * Used by: app/page.tsx (main timer UI)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { Mode } from "@/types/pomodoro";
import {
  saveTimerState,
  loadTimerState,
  clearTimerState,
  calculateRemainingTime,
} from "@/lib/storage/timerState";

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
  /** Whether flow mode is active */
  isFlowMode?: boolean;
  /** Callback fired when a pomo completes in flow mode */
  onFlowPomoComplete?: () => void;
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
  /** Total elapsed time in flow mode (seconds) */
  flowElapsedTime: number;
  /** Number of pomos completed in current flow */
  flowCompletedPomos: number;
}

/**
 * Drift-resistant Pomodoro timer hook with localStorage backup
 *
 * Features:
 * - Uses Date.now() for elapsed time calculation (prevents drift)
 * - Visibility change reconciliation (handles tab switching)
 * - Auto-mode switching (focus → break → focus)
 * - Pause/resume support
 * - Saves state to localStorage (emergency backup only, not auto-restored)
 * - Shows "beforeunload" warning when user tries to refresh/close with active timer
 * - Clears saved state when timer completes or is reset
 *
 * Note: User must manually start timer again after page refresh.
 * Saved state is for emergency recovery only.
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
  isFlowMode = false,
  onFlowPomoComplete,
}: UseTimerOptions): UseTimerReturn {
  const [mode, setMode] = useState<Mode>("focus");
  const [remaining, setRemaining] = useState(focusDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [flowCompletedPomos, setFlowCompletedPomos] = useState(0);
  const [flowStartTime, setFlowStartTime] = useState<number | null>(null);
  const [flowElapsedTime, setFlowElapsedTime] = useState(0);

  const durationRef = useRef(focusDuration);
  const startedAtRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const modeRef = useRef<Mode>("focus");
  const focusDurationRef = useRef(focusDuration);
  const breakDurationRef = useRef(breakDuration);
  const isFlowModeRef = useRef(isFlowMode);
  const hasRestoredRef = useRef(false);

  // Keep refs in sync
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    focusDurationRef.current = focusDuration;
    breakDurationRef.current = breakDuration;
  }, [focusDuration, breakDuration]);

  useEffect(() => {
    isFlowModeRef.current = isFlowMode;
  }, [isFlowMode]);

  // PERSISTENCE: Check for saved state but DON'T auto-restore (user must manually resume)
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    const savedState = loadTimerState();
    if (!savedState) return;

    // Calculate how much time was remaining
    const remainingTime = calculateRemainingTime(savedState);

    // If timer expired while page was closed, clear it
    if (remainingTime === 0) {
      console.log("⏱️  Saved timer expired, clearing state");
      clearTimerState();
      return;
    }

    // Log that we found a saved timer, but don't restore it automatically
    console.log(
      "💾 Found saved timer state:",
      remainingTime,
      "seconds remaining. Clear localStorage if you don't want to see this."
    );

    // User must manually start the timer again if they want to continue
    // The saved state remains in localStorage for emergency recovery only
  }, []); // Run once on mount

  // PERSISTENCE: Save timer state whenever it changes
  useEffect(() => {
    // Don't save during initial restoration
    if (!hasRestoredRef.current) return;

    // Only save if timer is running or paused (not idle)
    if (!isRunning && !pausedAtRef.current) {
      clearTimerState();
      return;
    }

    // Save current timer state
    if (startedAtRef.current) {
      saveTimerState({
        isRunning,
        mode,
        startedAt: startedAtRef.current,
        duration: durationRef.current,
        pausedAt: pausedAtRef.current,
        isFlowMode,
        flowCompletedPomos,
        flowStartTime,
      });
    }
  }, [isRunning, mode, isFlowMode, flowCompletedPomos, flowStartTime]);

  // Initialize flow tracking when entering flow mode with active timer
  useEffect(() => {
    if (isFlowMode && isRunning && !flowStartTime && startedAtRef.current) {
      // Calculate how much time has already elapsed in the current pomo
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      // Set flow start time to account for already-elapsed time
      const adjustedStartTime = Date.now() - elapsed * 1000;
      setFlowStartTime(adjustedStartTime);
      console.log(`✅ Flow mode entered midway (${elapsed}s into pomo)`);
    }
  }, [isFlowMode, isRunning, flowStartTime]);

  // Update flow elapsed time every second when in flow mode
  useEffect(() => {
    if (!isFlowMode || !isRunning || !flowStartTime) return;

    const updateElapsed = () => {
      const elapsed = Math.floor((Date.now() - flowStartTime) / 1000);
      setFlowElapsedTime(elapsed);
    };

    updateElapsed(); // Immediate update
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [isFlowMode, isRunning, flowStartTime]);

  // Define handleTimerComplete before it's used
  const handleTimerComplete = useCallback(() => {
    if (modeRef.current === "focus") {
      // Flow mode: increment counter and auto-start next pomo
      if (isFlowModeRef.current) {
        setFlowCompletedPomos((prev) => prev + 1);
        onFlowPomoComplete?.();

        // Auto-start next pomo immediately
        setTimeout(() => {
          durationRef.current = focusDurationRef.current;
          setRemaining(focusDurationRef.current);
          startedAtRef.current = Date.now();
          pausedAtRef.current = null;
          setIsRunning(true);
        }, 100);
        return;
      }

      // Normal mode: switch to break
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
      } else {
        // PERSISTENCE: Clear saved state if not auto-starting
        clearTimerState();
      }
    } else {
      // Break finished → switch to focus and signal cycle complete
      const newMode: Mode = "focus";
      setMode(newMode);
      durationRef.current = focusDurationRef.current;
      setRemaining(focusDurationRef.current);
      onModeChange?.(newMode);
      onCycleComplete?.();

      // PERSISTENCE: Clear saved state after break completes
      clearTimerState();
    }

    // Reset timing refs for next session (unless auto-starting)
    if (!autoStartBreak || modeRef.current === "break") {
      startedAtRef.current = null;
      pausedAtRef.current = null;
    }
  }, [autoStartBreak, onModeChange, onCycleComplete, onFlowPomoComplete]);

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

      // Initialize flow mode tracking if this is the first start
      if (isFlowModeRef.current && !flowStartTime) {
        setFlowStartTime(now);
      }
    }
    setIsRunning(true);
  }, [isRunning, flowStartTime]);

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

    // Reset flow mode tracking
    setFlowCompletedPomos(0);
    setFlowStartTime(null);
    setFlowElapsedTime(0);

    // PERSISTENCE: Clear saved timer state on reset
    clearTimerState();
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
    flowElapsedTime,
    flowCompletedPomos,
  };
}
