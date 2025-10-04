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

  // Ensure user exists in Convex when signed in and sync username to Clerk
  useEffect(() => {
    if (isSignedIn && user) {
      ensureUser({
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        avatarUrl: user.imageUrl,
      })
        .then((result) => {
          // Sync username to Clerk if user is new and doesn't have a username set
          if (result.isNew || !user.username) {
            user
              .update({ username: result.username })
              .then(() => {
                console.log(`✅ Username synced to Clerk: ${result.username}`);
              })
              .catch((err) => {
                console.error("Failed to sync username to Clerk:", err);
              });
          }
        })
        .catch((err) => {
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
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-20 sm:py-24">
      {/* Top Controls - Positioned to avoid overlap */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 sm:gap-3">
        <SignedOut>
          <SignUpButton mode="modal">
            <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
              Signup / Signin
            </Button>
          </SignUpButton>
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
        <ThemeToggle />
      </div>

      <div className="w-full max-w-2xl flex flex-col items-center gap-12">
        {/* Circular Timer Container with Progress Ring Border */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative flex items-center justify-center"
          style={{ width: "min(90vw, 480px)", height: "min(90vw, 480px)" }}
        >
          {/* Progress Ring SVG (positioned as border around container) */}
          <svg
            className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
            viewBox="0 0 200 200"
          >
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--color-primary))" stopOpacity="1" />
                <stop offset="100%" stopColor="hsl(var(--color-primary))" stopOpacity="0.7" />
              </linearGradient>
            </defs>

            {/* Background circle (the border) */}
            <circle
              cx="100"
              cy="100"
              r="96"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-border"
            />

            {/* Animated progress circle (overlays the border) */}
            <motion.circle
              cx="100"
              cy="100"
              r="96"
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              initial={{ strokeDasharray: "603.19", strokeDashoffset: "0" }}
              animate={{
                strokeDashoffset: `${603.19 * (1 - percent / 100)}`,
              }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </svg>

          {/* Circular Content Container (slightly smaller than SVG) */}
          <div className="relative bg-card rounded-full shadow-2xl flex flex-col items-center justify-center p-10 sm:p-12 w-[calc(100%-20px)] h-[calc(100%-20px)]">
            {/* Header */}
            <div className="text-center space-y-2 mb-6">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Pomodoro</h1>
              <p className="text-sm text-muted-foreground">
                Cycles: <span className="font-semibold text-foreground">{cyclesCompleted}</span>
              </p>
            </div>

            {/* Timer */}
            <div
              className="text-6xl sm:text-7xl md:text-8xl font-semibold tabular-nums tracking-tighter mb-8"
              style={{
                fontFamily: 'ui-sans-serif, system-ui, -apple-system, "SF Pro Display", sans-serif',
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {mm}:{ss}
            </div>

            {/* Tag Input */}
            <div className="w-full max-w-[300px] mb-8">
              <Input
                type="text"
                placeholder="Tag (e.g., coding)"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                className="h-11 text-sm rounded-full text-center"
                disabled={isRunning}
              />
            </div>

            {/* Controls */}
            <div className="flex gap-3">
              <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>
                <Button
                  onClick={start}
                  size="default"
                  className="rounded-full px-8"
                  disabled={isRunning}
                >
                  Start
                </Button>
              </motion.div>
              <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>
                <Button
                  variant="secondary"
                  onClick={pause}
                  size="default"
                  className="rounded-full px-8"
                  disabled={!isRunning}
                >
                  Pause
                </Button>
              </motion.div>
              <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>
                <Button
                  variant="outline"
                  onClick={reset}
                  size="default"
                  className="rounded-full px-8"
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
            className="w-full bg-card rounded-2xl shadow-lg border border-border p-6"
          >
            <PomodoroFeed sessions={sessions} />
          </motion.div>
        )}
      </div>
    </main>
  );
}
