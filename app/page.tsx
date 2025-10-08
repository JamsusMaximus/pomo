/**
 * @fileoverview Main Pomodoro timer page - core application functionality
 * @module app/page
 *
 * Key responsibilities:
 * - Render pomodoro timer UI with circular progress ring
 * - Manage timer state (running, paused, reset) via useTimer hook
 * - Handle session completion and local storage saving
 * - Sync completed sessions to Convex with offline support
 * - Display user stats, level progress, and session feed
 * - Manage browser notifications and sound alerts
 *
 * Dependencies: Convex (backend sync), Clerk (auth), Framer Motion (animations)
 * Used by: Root layout (main route "/" )
 */

"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion } from "@/components/motion";
import { SignUpButton, SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useTimer } from "@/hooks/useTimer";
import { ThemeToggle } from "@/components/theme-toggle";
import { formatTime } from "@/lib/format";
import { FOCUS_DEFAULT, BREAK_DEFAULT } from "@/lib/constants";
import { loadPreferences, savePreferences } from "@/lib/storage/preferences";
import { getLevelInfo, getLevelTitle } from "@/lib/levels";
import {
  saveCompletedSession,
  loadSessions,
  seedTestPomodoros,
  getUnsyncedSessions,
  markSessionsSynced,
} from "@/lib/storage/sessions";
import { PomodoroFeed } from "@/components/PomodoroFeed";
import type { Mode, PomodoroSession } from "@/types/pomodoro";
import Link from "next/link";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Calculate pomos completed today from sessions
const calculatePomosToday = (sessions: PomodoroSession[]) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTimestamp = today.getTime();

  return sessions.filter(
    (session) => session.mode === "focus" && session.completedAt >= todayTimestamp
  ).length;
};

function HomeContent() {
  const [focusDuration, setFocusDuration] = useState(FOCUS_DEFAULT);
  const [breakDuration, setBreakDuration] = useState(BREAK_DEFAULT);
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentTag, setCurrentTag] = useState("");
  const [previousMode, setPreviousMode] = useState<Mode>("focus");
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [showSpaceHint, setShowSpaceHint] = useState(true);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");
  const [hasAnimatedProgress, setHasAnimatedProgress] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "error" | "success">("idle");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [syncRetryCount, setSyncRetryCount] = useState(0);

  // Convex integration (optional - only when signed in)
  const { user, isSignedIn } = useUser();
  const stats = useQuery(api.stats.getStats);
  const levelConfig = useQuery(api.levels.getLevelConfig);

  // Memoize today's pomodoro count to avoid recalculating on every render
  const cyclesCompleted = useMemo(() => calculatePomosToday(sessions), [sessions]);

  // Memoize level info calculation to avoid expensive recalculation
  const levelInfo = useMemo(() => {
    if (!stats) return null;

    const pomos = stats.total.count;

    // Use lib fallback if levelConfig is still loading or empty
    if (!levelConfig || !Array.isArray(levelConfig) || levelConfig.length === 0) {
      const info = getLevelInfo(pomos);
      return { ...info, title: getLevelTitle(info.currentLevel) };
    }

    let currentLevel = levelConfig[0];
    for (const level of levelConfig) {
      if (level.threshold <= pomos) {
        currentLevel = level;
      } else {
        break;
      }
    }

    const currentIndex = levelConfig.findIndex((l) => l.level === currentLevel.level);
    const nextLevel = levelConfig[currentIndex + 1];

    if (!nextLevel) {
      return {
        currentLevel: currentLevel.level,
        pomosForCurrentLevel: currentLevel.threshold,
        pomosForNextLevel: currentLevel.threshold,
        pomosRemaining: 0,
        progress: 100,
        title: currentLevel.title,
      };
    }

    const pomosInCurrentLevel = pomos - currentLevel.threshold;
    const pomosNeededForNextLevel = nextLevel.threshold - currentLevel.threshold;
    const progress = (pomosInCurrentLevel / pomosNeededForNextLevel) * 100;

    return {
      currentLevel: currentLevel.level,
      pomosForCurrentLevel: currentLevel.threshold,
      pomosForNextLevel: nextLevel.threshold,
      pomosRemaining: nextLevel.threshold - pomos,
      progress: Math.min(100, Math.max(0, progress)),
      title: currentLevel.title,
    };
  }, [stats, levelConfig]);

  const ensureUser = useMutation(api.users.ensureUser);
  const savePrefs = useMutation(api.timers.savePreferences);
  const saveSession = useMutation(api.pomodoros.saveSession);

  // Track previous sign-in state to detect when user signs in
  const prevIsSignedIn = useRef(isSignedIn);

  // Store AudioContext in ref to prevent memory leaks
  const audioContextRef = useRef<AudioContext | null>(null);

  // Cleanup AudioContext on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  // Play completion sound using Web Audio API
  const playCompletionSound = useCallback(() => {
    try {
      // Create AudioContext only once and reuse
      if (!audioContextRef.current) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
      }

      const audioContext = audioContextRef.current;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Pleasant chime sound
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1);

      // Second tone for harmony
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(659.25, audioContext.currentTime); // E5
        gain2.gain.setValueAtTime(0.2, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 1);
      }, 150);
    } catch (error) {
      console.error("Failed to play sound:", error);
    }
  }, []);

  // Show browser notification
  const showNotification = useCallback(
    (title: string, body: string) => {
      console.log("Attempting notification. Permission:", notificationPermission);

      if (!("Notification" in window)) {
        console.error("This browser does not support notifications");
        return;
      }

      if (notificationPermission !== "granted") {
        console.warn("Notification permission not granted:", notificationPermission);
        return;
      }

      try {
        const notification = new Notification(title, {
          body,
          tag: "pomodoro-complete",
          requireInteraction: true,
          silent: false,
        });

        console.log("Notification created successfully", notification);

        // Close notification after 10 seconds
        setTimeout(() => notification.close(), 10000);

        // Focus window when notification is clicked
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch (error) {
        console.error("Failed to show notification:", error);
      }
    },
    [notificationPermission]
  );

  const { remaining, duration, mode, isRunning, start, pause, reset, setDebugTime } = useTimer({
    focusDuration,
    breakDuration,
    autoStartBreak: true,
    onModeChange: (newMode) => {
      // When mode changes, save the completed session for the previous mode
      if (previousMode === "focus") {
        // Play completion sound and show notification
        playCompletionSound();
        showNotification("Pomodoro Complete! 🎉", "Great work! Time for a break.");

        // Save locally first to get the session ID
        const localSession = saveCompletedSession("focus", focusDuration, currentTag);

        // Save to Convex if signed in, then mark as synced
        if (isSignedIn) {
          saveSession({
            mode: "focus",
            duration: focusDuration,
            tag: currentTag || undefined,
            completedAt: Date.now(),
          })
            .then(() => {
              // Mark as synced in localStorage after successful Convex save
              markSessionsSynced([localSession.id]);
              console.log("✅ Focus session synced to Convex");
            })
            .catch((err) => {
              console.error("Failed to save session to Convex:", err);
              // Session remains unsynced and will be retried later
            });
        }

        setCurrentTag(""); // Clear tag for next session

        // Refresh sessions display (cyclesCompleted auto-updates via useMemo)
        const updatedSessions = loadSessions();
        setSessions(updatedSessions);
      } else if (previousMode === "break") {
        // Save locally first to get the session ID
        const localSession = saveCompletedSession("break", breakDuration);

        // Save to Convex if signed in, then mark as synced
        if (isSignedIn) {
          saveSession({
            mode: "break",
            duration: breakDuration,
            completedAt: Date.now(),
          })
            .then(() => {
              // Mark as synced in localStorage after successful Convex save
              markSessionsSynced([localSession.id]);
              console.log("✅ Break session synced to Convex");
            })
            .catch((err) => {
              console.error("Failed to save session to Convex:", err);
              // Session remains unsynced and will be retried later
            });
        }

        // Refresh sessions display
        setSessions(loadSessions());
      }
      setPreviousMode(newMode);
    },
  });

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          setNotificationPermission(permission);
        });
      }
    }
  }, []);

  // Hydrate from localStorage on mount
  useEffect(() => {
    // Seed test pomodoros in development only (only if no sessions exist)
    if (process.env.NODE_ENV === "development") {
      seedTestPomodoros();
    }

    // Load preferences
    const prefs = loadPreferences();
    if (prefs) {
      setFocusDuration(prefs.focusDuration);
      setBreakDuration(prefs.breakDuration);
    }

    // Load sessions (cyclesCompleted auto-updates via useMemo)
    const loadedSessions = loadSessions();
    setSessions(loadedSessions);

    setIsHydrated(true);

    // Trigger progress bar animation after mount
    const timer = setTimeout(() => {
      setHasAnimatedProgress(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Persist to localStorage when preferences change
  useEffect(() => {
    if (!isHydrated) return;
    savePreferences({
      focusDuration,
      breakDuration,
      lastMode: mode,
      cyclesCompleted: 0, // Not used anymore, kept for backwards compatibility
    });
  }, [focusDuration, breakDuration, mode, isHydrated]);

  // Ensure user exists in Convex when signed in
  useEffect(() => {
    if (isSignedIn && user) {
      ensureUser({
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        avatarUrl: user.imageUrl,
      })
        .then((result) => {
          console.log(`✅ User ensured in Convex: ${result.username}`);
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
      cyclesCompleted: 0, // Not used anymore, server calculates from actual sessions
    }).catch((err) => {
      console.error("Failed to sync preferences to Convex:", err);
    });
  }, [isSignedIn, focusDuration, breakDuration, isHydrated, savePrefs]);

  // Sync local pomodoros to Convex with retry mechanism
  const syncLocalSessionsRef = useRef<((options?: { silent: boolean }) => Promise<void>) | null>(
    null
  );

  const syncLocalSessions = useCallback(
    async (options = { silent: false }) => {
      const unsyncedSessions = getUnsyncedSessions();

      if (unsyncedSessions.length === 0) {
        setSyncStatus("idle");
        return;
      }

      // Only show sync status toast if not silent
      if (!options.silent) {
        setSyncStatus("syncing");
      }
      console.log(`Syncing ${unsyncedSessions.length} local pomodoros to Convex...`);

      try {
        // Upload each unsynced session to Convex
        await Promise.all(
          unsyncedSessions.map((session) =>
            saveSession({
              mode: session.mode,
              duration: session.duration,
              tag: session.tag,
              completedAt: session.completedAt,
            })
          )
        );

        // Mark all as synced in localStorage
        markSessionsSynced(unsyncedSessions.map((s) => s.id));
        console.log("✅ Local pomodoros synced successfully!");

        if (!options.silent) {
          setSyncStatus("success");
          // Reset success status after 3 seconds
          setTimeout(() => setSyncStatus("idle"), 3000);
        }
        setSyncRetryCount(0);

        // Refresh the sessions display (cyclesCompleted auto-updates via useMemo)
        const updatedSessions = loadSessions();
        setSessions(updatedSessions);
      } catch (err) {
        console.error("Failed to sync local sessions to Convex:", err);

        if (!options.silent) {
          setSyncStatus("error");
        }

        // Auto-retry up to 3 times with exponential backoff
        setSyncRetryCount((prev) => {
          const newCount = prev + 1;
          if (newCount <= 3) {
            const retryDelay = Math.pow(2, prev) * 2000; // 2s, 4s, 8s
            console.log(`Retrying sync in ${retryDelay / 1000}s... (attempt ${newCount}/3)`);

            setTimeout(() => {
              syncLocalSessionsRef.current?.(options);
            }, retryDelay);
          }
          return newCount;
        });
      }
    },
    [saveSession]
  );

  // Store ref for retry mechanism
  syncLocalSessionsRef.current = syncLocalSessions;

  // Sync local pomodoros to Convex when user signs in OR when app loads
  useEffect(() => {
    // Sync when user transitions from signed out to signed in (show toast)
    if (isSignedIn && !prevIsSignedIn.current && isHydrated) {
      console.log("User just signed in, syncing local sessions...");
      syncLocalSessions({ silent: false }); // Show toast for sign-in
    }
    // Also sync when app loads and user is already signed in (silent)
    else if (isSignedIn && isHydrated && prevIsSignedIn.current === undefined) {
      console.log("App loaded with signed-in user, checking for unsynced sessions...");
      syncLocalSessions({ silent: true }); // Silent sync on load
    }

    // Update the ref for next render
    prevIsSignedIn.current = isSignedIn;
  }, [isSignedIn, isHydrated, syncLocalSessions]);

  // Periodic sync check - every 60 seconds, sync any unsynced sessions
  useEffect(() => {
    if (!isSignedIn || !isHydrated) return;

    const interval = setInterval(() => {
      const unsynced = getUnsyncedSessions();
      if (unsynced.length > 0) {
        console.log(`Periodic sync check: ${unsynced.length} unsynced sessions found`);
        syncLocalSessions({ silent: true }); // Silent background sync
      }
    }, 60000); // Check every 60 seconds

    return () => clearInterval(interval);
  }, [isSignedIn, isHydrated, syncLocalSessions]);

  // Sync when tab becomes visible again (user returns to app)
  useEffect(() => {
    if (!isSignedIn || !isHydrated) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const unsynced = getUnsyncedSessions();
        if (unsynced.length > 0) {
          console.log(`Tab visible: ${unsynced.length} unsynced sessions, syncing...`);
          syncLocalSessions({ silent: true }); // Silent sync on tab focus
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isSignedIn, isHydrated, syncLocalSessions]);

  // Keyboard shortcut: Space bar to start/pause
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault(); // Prevent page scroll
        if (!isRunning) {
          start();
          setShowSpaceHint(false); // Hide hint after first use
        } else {
          pause();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isRunning, start, pause]);

  // Update browser tab title with live countdown
  useEffect(() => {
    const { mm, ss } = formatTime(remaining);

    if (isRunning) {
      if (mode === "focus") {
        document.title = `${mm}:${ss} 💡 focused`;
      } else {
        document.title = `${mm}:${ss} ☕️ break`;
      }
    } else {
      // Reset to default title when not running
      document.title = "Pomodoro";
    }

    // Cleanup: reset title when component unmounts
    return () => {
      document.title = "Pomodoro";
    };
  }, [remaining, mode, isRunning]);

  const percent = (remaining / duration) * 100;
  const { mm, ss } = formatTime(remaining);

  // Determine if timer is paused (has time remaining but not running)
  const isPaused = !isRunning && remaining < duration;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-20 sm:py-24">
      {/* Sync Status Toast */}
      {syncStatus !== "idle" && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-20 right-4 z-50 bg-card border border-border rounded-lg shadow-lg p-3 max-w-xs"
        >
          {syncStatus === "syncing" && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <span>Syncing sessions...</span>
            </div>
          )}
          {syncStatus === "success" && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Sessions synced!</span>
            </div>
          )}
          {syncStatus === "error" && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-destructive">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Sync failed</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSyncRetryCount(0);
                  syncLocalSessions();
                }}
                className="text-xs"
              >
                Retry Now
              </Button>
            </div>
          )}
        </motion.div>
      )}

      {/* Top Controls - Positioned to avoid overlap */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 sm:gap-3 h-10">
        <motion.div
          className="flex items-center gap-2 sm:gap-3"
          animate={{
            opacity: isRunning ? 0.3 : 1,
          }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          style={{
            pointerEvents: isRunning ? "none" : "auto",
          }}
        >
          <SignedOut>
            <SignUpButton mode="modal">
              <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
                Signup / Signin
              </Button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link
              href="/profile"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Avatar className="w-8 h-8 cursor-pointer">
                <AvatarImage src={user?.imageUrl} alt={user?.username || "User"} />
                <AvatarFallback>{user?.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
              {(() => {
                if (!stats) {
                  return (
                    <motion.div
                      className="flex flex-col gap-1"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    >
                      <span className="text-sm font-medium">Level 1</span>
                      <div className="w-20 h-1 bg-muted/50 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-orange-400/60 to-orange-500/60"
                          initial={{ width: 0 }}
                          animate={{ width: 0 }}
                          transition={{ duration: 0.8, delay: 0.4 }}
                        />
                      </div>
                    </motion.div>
                  );
                }

                // Level info is memoized at component level for performance
                if (!levelInfo) return null;

                return (
                  <motion.div
                    className="flex flex-col gap-1"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <span className="text-sm font-medium">Level {levelInfo.currentLevel}</span>
                    <div className="w-20 h-1 bg-muted/50 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-orange-400/60 to-orange-500/60"
                        initial={{ width: 0 }}
                        animate={{ width: `${levelInfo.progress}%` }}
                        transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                      />
                    </div>
                  </motion.div>
                );
              })()}
            </Link>
          </SignedIn>
        </motion.div>
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md flex flex-col items-center gap-8">
        {/* Timer Card Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="relative w-full bg-card rounded-2xl shadow-2xl border border-border p-8 sm:p-12 flex flex-col items-center"
        >
          {/* Header */}
          <div className="text-center space-y-2 mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Pomodoro</h1>
            <p className="text-sm text-muted-foreground">
              Pomos Today: <span className="font-semibold text-foreground">{cyclesCompleted}</span>
            </p>
          </div>

          {/* Debug Button - DEV ONLY */}
          {process.env.NODE_ENV === "development" && (
            <div className="absolute top-2 left-2 flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDebugTime(2);
                }}
                className="text-xs opacity-50 hover:opacity-100"
              >
                Debug: 2s
              </Button>
              {notificationPermission !== "granted" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if ("Notification" in window) {
                      const permission = await Notification.requestPermission();
                      setNotificationPermission(permission);
                      alert(`Notification permission: ${permission}`);
                    }
                  }}
                  className="text-xs opacity-50 hover:opacity-100"
                >
                  🔔 Enable
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  showNotification(
                    "Test Notification",
                    "If you can see this, notifications are working!"
                  );
                }}
                className="text-xs opacity-50 hover:opacity-100"
              >
                Test 🔔
              </Button>
            </div>
          )}

          {/* Circular Progress Ring */}
          <div className="relative mb-8">
            <svg className="w-64 h-64 sm:w-80 sm:h-80 -rotate-90" viewBox="0 0 200 200">
              <defs>
                {/* Focus mode gradient (calm orange/coral) */}
                <linearGradient id="focusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fb923c" stopOpacity="1" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0.8" />
                </linearGradient>
                {/* Break mode gradient (green/teal) */}
                <linearGradient id="breakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="1" />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.7" />
                </linearGradient>
              </defs>

              {/* Background circle - transparent/subtle */}
              <circle
                cx="100"
                cy="100"
                r="85"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-border opacity-0"
              />

              {/* Animated progress circle */}
              <motion.circle
                cx="100"
                cy="100"
                r="85"
                fill="none"
                stroke={mode === "break" ? "url(#breakGradient)" : "url(#focusGradient)"}
                strokeWidth="8"
                strokeLinecap="round"
                initial={{ strokeDasharray: 534.07, strokeDashoffset: 534.07 }}
                animate={{
                  strokeDashoffset: 534.07 * (1 - percent / 100),
                }}
                transition={
                  hasAnimatedProgress
                    ? { duration: 0.5, ease: "easeInOut" }
                    : { duration: 1.4, delay: 0.4, ease: [0.65, 0, 0.35, 1] }
                }
              />
            </svg>

            {/* Timer in center of ring */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="text-6xl sm:text-7xl font-semibold tabular-nums tracking-tighter"
                style={{
                  fontFamily:
                    'ui-sans-serif, system-ui, -apple-system, "SF Pro Display", sans-serif',
                  fontVariantNumeric: "tabular-nums",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={
                  hasAnimatedProgress
                    ? { duration: 0 }
                    : { duration: 1.4, delay: 0.4, ease: "easeOut" }
                }
              >
                {mm}:{ss}
              </motion.div>
            </div>
          </div>

          {/* Break mode indicator */}
          {mode === "break" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center mb-6"
            >
              <p className="text-lg text-muted-foreground flex items-center justify-center gap-2">
                <span className="text-2xl">☕️</span>
                <span>Break</span>
              </p>
            </motion.div>
          )}

          {/* Tag Input - only show during focus mode */}
          {mode === "focus" && (
            <div className="w-full max-w-xs mb-6">
              <Input
                type="text"
                placeholder="Tag (e.g., coding)"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                className="h-11 text-sm text-center"
                disabled={isRunning}
              />
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-col items-center gap-3 w-full max-w-xs">
            {/* Start/Pause/Resume button - transforms based on state */}
            <motion.div className="w-full" whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.01 }}>
              <Button
                onClick={isRunning ? pause : start}
                size="lg"
                className="w-full py-6 text-lg font-semibold"
              >
                {isPaused ? "Paused: Click to Resume" : isRunning ? "Pause" : "Start"}
              </Button>
            </motion.div>

            {/* Space bar hint */}
            {showSpaceHint && !isRunning && !isPaused && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-muted-foreground flex items-center gap-1.5"
              >
                <kbd className="px-2 py-0.5 text-xs bg-muted border border-border rounded font-mono">
                  Space
                </kbd>
                <span>to start</span>
              </motion.div>
            )}

            {/* Reset button - fade in when timer is running or paused */}
            {(isRunning || isPaused) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.01 }}>
                  <Button variant="outline" onClick={reset} size="default" className="w-full">
                    Reset
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Pomodoro Feed */}
        {isHydrated && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
            className="w-full bg-card rounded-2xl shadow-lg border border-border p-6"
          >
            <PomodoroFeed sessions={sessions} />
          </motion.div>
        )}
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <ErrorBoundary
      fallbackTitle="Timer Error"
      fallbackMessage="The pomodoro timer encountered an error. Your progress has been saved."
    >
      <HomeContent />
    </ErrorBoundary>
  );
}
