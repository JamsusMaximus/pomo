"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTimer } from "@/hooks/useTimer";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

const FOCUS_DEFAULT = 25 * 60; // seconds
const BREAK_DEFAULT = 5 * 60; // seconds
const STORAGE_KEY = "pomo-preferences";
const SESSIONS_STORAGE_KEY = "pomo-sessions";

type Mode = "focus" | "break";

interface PersistedPreferences {
  focusDuration: number;
  breakDuration: number;
  lastMode: Mode;
  cyclesCompleted: number;
}

interface PomodoroSession {
  id: string;
  tag?: string;
  duration: number; // seconds
  mode: Mode;
  completedAt: number; // timestamp
  synced: boolean; // whether it's been synced to Convex
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

function loadSessions(): PomodoroSession[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(SESSIONS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: PomodoroSession[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Silently fail if localStorage is disabled
  }
}

function saveCompletedSession(mode: Mode, duration: number, tag?: string): PomodoroSession {
  const session: PomodoroSession = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

export default function Home() {
  const [focusDuration, setFocusDuration] = useState(FOCUS_DEFAULT);
  const [breakDuration, setBreakDuration] = useState(BREAK_DEFAULT);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentTag, setCurrentTag] = useState("");
  const [previousMode, setPreviousMode] = useState<Mode>("focus");

  const { remaining, duration, mode, isRunning, start, pause, reset } = useTimer({
    focusDuration,
    breakDuration,
    autoStartBreak: false,
    onModeChange: (newMode) => {
      // When mode changes, save the completed session for the previous mode
      if (previousMode === "focus") {
        // Save completed focus session
        saveCompletedSession("focus", focusDuration, currentTag);
        setCurrentTag(""); // Clear tag for next session
      } else if (previousMode === "break") {
        // Save completed break session
        saveCompletedSession("break", breakDuration);
      }
      setPreviousMode(newMode);
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
    <main className="min-h-screen flex items-center justify-center px-6 py-12 sm:px-8 lg:px-12">
      {/* Top Right Controls */}
      <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
        <SignedOut>
          <SignInButton mode="modal">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
        <ThemeToggle />
      </div>

      <div className="w-full max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="bg-card rounded-2xl shadow-lg border border-border p-8 sm:p-12"
        >
          <div className="flex flex-col items-center space-y-16">
            {/* Header */}
            <div className="text-center space-y-3">
              <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">Pomodoro</h1>
              <p className="text-base text-muted-foreground">
                Cycles completed:{" "}
                <span className="font-semibold text-foreground">{cyclesCompleted}</span>
              </p>
            </div>

            {/* Circular Progress Timer */}
            <div className="relative flex items-center justify-center w-full">
              <svg
                className="w-[380px] h-[380px] sm:w-[460px] sm:h-[460px] -rotate-90"
                viewBox="0 0 200 200"
              >
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--color-primary))" stopOpacity="1" />
                    <stop offset="100%" stopColor="hsl(var(--color-primary))" stopOpacity="0.7" />
                  </linearGradient>
                </defs>

                {/* Background circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="85"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-muted opacity-25"
                />

                {/* Animated progress circle */}
                <motion.circle
                  cx="100"
                  cy="100"
                  r="85"
                  fill="none"
                  stroke="url(#progressGradient)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: "534.07", strokeDashoffset: "0" }}
                  animate={{
                    strokeDashoffset: `${534.07 * (1 - percent / 100)}`,
                  }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                />
              </svg>

              {/* Timer content - positioned absolutely in center */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="text-7xl sm:text-8xl md:text-9xl font-semibold tabular-nums tracking-tighter"
                  style={{
                    fontFamily:
                      'ui-sans-serif, system-ui, -apple-system, "SF Pro Display", sans-serif',
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {mm}:{ss}
                </div>
              </div>
            </div>

            {/* Tag Input */}
            <div className="w-full max-w-md">
              <Input
                type="text"
                placeholder="Tag this pomodoro (e.g., coding, research)"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                className="h-12 text-base rounded-2xl text-center"
                disabled={isRunning}
              />
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-4 justify-center w-full">
              <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>
                <Button
                  onClick={start}
                  size="lg"
                  className="min-w-[120px] h-12 text-base font-medium rounded-2xl"
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
                  className="min-w-[120px] h-12 text-base font-medium rounded-2xl"
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
                  className="min-w-[120px] h-12 text-base font-medium rounded-2xl"
                >
                  Reset
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
