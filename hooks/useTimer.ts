import { useState, useEffect, useRef, useCallback } from "react";
import type { Mode } from "@/types/pomodoro";

interface UseTimerOptions {
  focusDuration: number;
  breakDuration: number;
  autoStartBreak?: boolean;
  onModeChange?: (mode: Mode) => void;
  onCycleComplete?: () => void;
}

interface UseTimerReturn {
  remaining: number;
  duration: number;
  mode: Mode;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
}

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

  return {
    remaining,
    duration: durationRef.current,
    mode,
    isRunning,
    start,
    pause,
    reset,
  };
}
