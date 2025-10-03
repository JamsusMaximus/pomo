"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useTimer } from "@/hooks/useTimer";

const FOCUS_DEFAULT = 25 * 60; // seconds
const BREAK_DEFAULT = 5 * 60; // seconds
const STORAGE_KEY = "pomo-preferences";

type Mode = "focus" | "break";

interface PersistedPreferences {
  focusDuration: number;
  breakDuration: number;
  lastMode: Mode;
  cyclesCompleted: number;
}

function formatTime(seconds: number): { mm: string; ss: string } {
  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");
  return { mm, ss };
}

function loadPreferences(): PersistedPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function savePreferences(prefs: PersistedPreferences) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Silently fail if localStorage is disabled
  }
}

export default function Home() {
  const [focusDuration, setFocusDuration] = useState(FOCUS_DEFAULT);
  const [breakDuration, setBreakDuration] = useState(BREAK_DEFAULT);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);

  const {
    remaining,
    duration,
    mode,
    isRunning,
    start,
    pause,
    reset,
  } = useTimer({
    focusDuration,
    breakDuration,
    autoStartBreak: false,
    onModeChange: () => {
      // Mode changes are handled by the hook, we just need to sync to localStorage
    },
    onCycleComplete: () => {
      setCyclesCompleted((prev) => prev + 1);
    },
  });

  // Hydrate from localStorage on mount
  useEffect(() => {
    const prefs = loadPreferences();
    if (prefs) {
      setFocusDuration(prefs.focusDuration);
      setBreakDuration(prefs.breakDuration);
      setCyclesCompleted(prefs.cyclesCompleted);
    }
    setIsHydrated(true);
  }, []);

  // Persist to localStorage when preferences change
  useEffect(() => {
    if (!isHydrated) return; // Don't save initial values before hydration
    savePreferences({
      focusDuration,
      breakDuration,
      lastMode: mode,
      cyclesCompleted,
    });
  }, [focusDuration, breakDuration, mode, cyclesCompleted, isHydrated]);

  const percent = (remaining / duration) * 100;
  const { mm, ss } = formatTime(remaining);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl">
        <div className="flex flex-col items-center space-y-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-2">
              Pomodoro
            </h1>
            <div className="text-sm text-muted-foreground">
              Cycles completed: {cyclesCompleted}
            </div>
          </motion.div>
          
          {/* Circular Progress Timer */}
          <div className="relative flex items-center justify-center w-full">
            <svg className="w-[400px] h-[400px] sm:w-[480px] sm:h-[480px] -rotate-90" viewBox="0 0 200 200">
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--color-primary))" stopOpacity="1" />
                  <stop offset="100%" stopColor="hsl(var(--color-primary))" stopOpacity="0.6" />
                </linearGradient>
              </defs>
              
              {/* Background circle */}
              <circle
                cx="100"
                cy="100"
                r="85"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-secondary opacity-20"
              />
              
              {/* Animated progress circle */}
              <motion.circle
                cx="100"
                cy="100"
                r="85"
                fill="none"
                stroke="url(#progressGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                initial={{ strokeDasharray: "534.07", strokeDashoffset: "0" }}
                animate={{ 
                  strokeDashoffset: `${534.07 * (1 - percent / 100)}`
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            </svg>
            
            {/* Timer content - positioned absolutely in center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.div
                className="inline-block px-4 py-1.5 mb-4 rounded-full text-sm font-medium bg-secondary"
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {mode === "focus" ? "Time to focus..." : "Take a break"}
              </motion.div>
              
              <div className="text-7xl sm:text-8xl md:text-9xl font-semibold tabular-nums tracking-tighter"
                   style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, "SF Pro Display", sans-serif', fontVariantNumeric: 'tabular-nums' }}>
                {mm}:{ss}
              </div>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex gap-3 justify-center">
            <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>
              <Button
                onClick={start}
                size="lg"
                className="min-w-[100px]"
                disabled={isRunning}
              >
                Start
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>
              <Button
                variant="secondary"
                onClick={pause}
                size="lg"
                className="min-w-[100px]"
                disabled={!isRunning}
              >
                Pause
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>
              <Button
                variant="outline"
                onClick={reset}
                size="lg"
                className="min-w-[100px]"
              >
                Reset
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}

