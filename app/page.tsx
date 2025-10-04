"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { SignUpButton, SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTimer } from "@/hooks/useTimer";
import { ThemeToggle } from "@/components/theme-toggle";
import { formatTime } from "@/lib/format";
import { FOCUS_DEFAULT, BREAK_DEFAULT } from "@/lib/constants";
import { loadPreferences, savePreferences } from "@/lib/storage/preferences";
import {
  saveCompletedSession,
  loadSessions,
  seedTestPomodoros,
  getUnsyncedSessions,
  markSessionsSynced,
} from "@/lib/storage/sessions";
import { PomodoroFeed } from "@/components/PomodoroFeed";
import type { Mode, PomodoroSession } from "@/types/pomodoro";

export default function Home() {
  const [focusDuration, setFocusDuration] = useState(FOCUS_DEFAULT);
  const [breakDuration, setBreakDuration] = useState(BREAK_DEFAULT);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentTag, setCurrentTag] = useState("");
  const [previousMode, setPreviousMode] = useState<Mode>("focus");
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);

  // Convex integration (optional - only when signed in)
  const { user, isSignedIn } = useUser();
  const ensureUser = useMutation(api.users.ensureUser);
  const savePrefs = useMutation(api.timers.savePreferences);
  const saveSession = useMutation(api.pomodoros.saveSession);

  // Track previous sign-in state to detect when user signs in
  const prevIsSignedIn = useRef(isSignedIn);

  const { remaining, duration, mode, isRunning, start, pause, reset } = useTimer({
    focusDuration,
    breakDuration,
    autoStartBreak: false,
    onModeChange: (newMode) => {
      // When mode changes, save the completed session for the previous mode
      if (previousMode === "focus") {
        // Save locally
        saveCompletedSession("focus", focusDuration, currentTag);

        // Also save to Convex if signed in
        if (isSignedIn) {
          saveSession({
            mode: "focus",
            duration: focusDuration,
            tag: currentTag || undefined,
            completedAt: Date.now(),
          }).catch((err) => {
            console.error("Failed to save session to Convex:", err);
          });
        }

        setCurrentTag(""); // Clear tag for next session
      } else if (previousMode === "break") {
        // Save locally
        saveCompletedSession("break", breakDuration);

        // Also save to Convex if signed in
        if (isSignedIn) {
          saveSession({
            mode: "break",
            duration: breakDuration,
            completedAt: Date.now(),
          }).catch((err) => {
            console.error("Failed to save session to Convex:", err);
          });
        }
      }
      setPreviousMode(newMode);
      // Refresh sessions after saving
      setSessions(loadSessions());
    },
    onCycleComplete: () => {
      setCyclesCompleted((prev) => prev + 1);
    },
  });

  // Hydrate from localStorage on mount
  useEffect(() => {
    // Seed test pomodoros (only if no sessions exist)
    seedTestPomodoros();

    // Load preferences
    const prefs = loadPreferences();
    if (prefs) {
      setFocusDuration(prefs.focusDuration);
      setBreakDuration(prefs.breakDuration);
      setCyclesCompleted(prefs.cyclesCompleted);
    }

    // Load sessions
    setSessions(loadSessions());

    setIsHydrated(true);
  }, []);

  // Persist to localStorage when preferences change
  useEffect(() => {
    if (!isHydrated) return;
    savePreferences({
      focusDuration,
      breakDuration,
      lastMode: mode,
      cyclesCompleted,
    });
  }, [focusDuration, breakDuration, mode, cyclesCompleted, isHydrated]);

  // Ensure user exists in Convex when signed in
  useEffect(() => {
    if (isSignedIn && user) {
      ensureUser({
        username: user.username || user.firstName || "Anonymous",
        avatarUrl: user.imageUrl,
      }).catch((err) => {
        console.error("Failed to ensure user:", err);
      });
    }
  }, [isSignedIn, user, ensureUser]);

  // Sync preferences to Convex when signed in and preferences change
  useEffect(() => {
    if (!isHydrated || !isSignedIn) return;

    savePrefs({
      focusDuration,
      breakDuration,
      cyclesCompleted,
    }).catch((err) => {
      console.error("Failed to sync preferences to Convex:", err);
    });
  }, [isSignedIn, focusDuration, breakDuration, cyclesCompleted, isHydrated, savePrefs]);

  // Sync local pomodoros to Convex when user signs in
  useEffect(() => {
    // Detect when user transitions from signed out to signed in
    if (isSignedIn && !prevIsSignedIn.current && isHydrated) {
      const unsyncedSessions = getUnsyncedSessions();

      if (unsyncedSessions.length > 0) {
        console.log(`Syncing ${unsyncedSessions.length} local pomodoros to Convex...`);

        // Upload each unsynced session to Convex
        Promise.all(
          unsyncedSessions.map((session) =>
            saveSession({
              mode: session.mode,
              duration: session.duration,
              tag: session.tag,
              completedAt: session.completedAt,
            })
          )
        )
          .then(() => {
            // Mark all as synced in localStorage
            markSessionsSynced(unsyncedSessions.map((s) => s.id));
            console.log("✅ Local pomodoros synced successfully!");
            // Refresh the sessions display
            setSessions(loadSessions());
          })
          .catch((err) => {
            console.error("Failed to sync local sessions to Convex:", err);
          });
      }
    }

    // Update the ref for next render
    prevIsSignedIn.current = isSignedIn;
  }, [isSignedIn, isHydrated, saveSession]);

  const percent = (remaining / duration) * 100;
  const { mm, ss } = formatTime(remaining);

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12 sm:px-8 lg:px-12">
      {/* Top Right Controls */}
      <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
        <SignedOut>
          <SignUpButton mode="modal">
            <Button variant="ghost" size="sm">
              Signup / Signin
            </Button>
          </SignUpButton>
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

        {/* Pomodoro Feed */}
        {isHydrated && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 bg-card rounded-2xl shadow-lg border border-border p-6"
          >
            <PomodoroFeed sessions={sessions} />
          </motion.div>
        )}
      </div>
    </main>
  );
}
