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
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useTimer } from "@/hooks/useTimer";
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
import { AmbientSoundControls } from "@/components/AmbientSoundControls";
import { TagInput } from "@/components/TagInput";
import { ChallengeToast } from "@/components/ChallengeToast";
import type { Mode, PomodoroSession } from "@/types/pomodoro";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useTimerContext } from "@/components/NavbarWrapper";
import { AnimatePresence } from "@/components/motion";

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
  const [isMobile, setIsMobile] = useState(false);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");
  const [hasAnimatedProgress, setHasAnimatedProgress] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "error" | "success">("idle");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [syncRetryCount, setSyncRetryCount] = useState(0);
  const [showStartShimmer, setShowStartShimmer] = useState(true);
  const [isFlowMode, setIsFlowMode] = useState(false);
  const [flowSessionId, setFlowSessionId] = useState<string | null>(null);
  const [showFlowCompleteToast, setShowFlowCompleteToast] = useState(false);
  const [flowToastCount, setFlowToastCount] = useState(0);
  const [showChallengeToast, setShowChallengeToast] = useState(false);
  const challengeToastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer context for navbar
  const { setIsTimerRunning } = useTimerContext();

  // Convex integration (optional - only when signed in)
  const { user, isSignedIn } = useUser();
  const nextChallenge = useQuery(api.challenges.getNextChallenge);

  // Memoize today's pomodoro count to avoid recalculating on every render
  const cyclesCompleted = useMemo(() => calculatePomosToday(sessions), [sessions]);

  const ensureUser = useMutation(api.users.ensureUser);
  const savePrefs = useMutation(api.timers.savePreferences);
  const saveSession = useMutation(api.pomodoros.saveSession);
  const startFlowSession = useMutation(api.flowSessions.startFlowSession);
  const incrementFlowPomo = useMutation(api.flowSessions.incrementFlowPomo);
  const endFlowSession = useMutation(api.flowSessions.endFlowSession);

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

  // Cleanup challenge toast timer on unmount
  useEffect(() => {
    return () => {
      if (challengeToastTimerRef.current) {
        clearTimeout(challengeToastTimerRef.current);
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

  const {
    remaining,
    duration,
    mode,
    isRunning,
    start,
    pause,
    reset,
    setDebugTime,
    flowElapsedTime,
    flowCompletedPomos,
  } = useTimer({
    focusDuration,
    breakDuration,
    autoStartBreak: !isFlowMode, // Disable auto-break in flow mode
    isFlowMode,
    onFlowPomoComplete: () => {
      // Save completed pomo immediately
      const localSession = saveCompletedSession("focus", focusDuration, currentTag);

      // Save to Convex if signed in
      if (isSignedIn) {
        saveSession({
          mode: "focus",
          duration: focusDuration,
          tag: currentTag || undefined,
          completedAt: Date.now(),
        })
          .then(() => {
            markSessionsSynced([localSession.id]);
            console.log("✅ Flow pomo synced to Convex");
          })
          .catch((err) => {
            console.error("Failed to save flow pomo to Convex:", err);
          });

        // Increment flow session pomo count
        if (flowSessionId) {
          incrementFlowPomo({
            flowId: flowSessionId as Parameters<typeof incrementFlowPomo>[0]["flowId"],
          })
            .then((count) => {
              console.log(`✅ Flow pomo count updated: ${count}`);
            })
            .catch((err) => {
              console.error("Failed to increment flow pomo:", err);
            });
        }
      }

      // Show completion toast
      setFlowToastCount((prev) => prev + 1);
      setShowFlowCompleteToast(true);
      setTimeout(() => setShowFlowCompleteToast(false), 2000);

      // Refresh sessions display
      const updatedSessions = loadSessions();
      setSessions(updatedSessions);
    },
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

          // Show challenge toast if there's a next challenge
          if (nextChallenge) {
            // Clear previous timeout if it exists
            if (challengeToastTimerRef.current) {
              clearTimeout(challengeToastTimerRef.current);
            }

            setShowChallengeToast(true);

            // Auto-dismiss after 8 seconds
            challengeToastTimerRef.current = setTimeout(() => {
              setShowChallengeToast(false);
              challengeToastTimerRef.current = null;
            }, 8000);
          }
        }

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

  // Detect if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isTouchDevice && isSmallScreen);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
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

    // Stop shimmer after 5 full cycles (5 * 7 seconds)
    const shimmerTimer = setTimeout(() => {
      setShowStartShimmer(false);
    }, 35000);

    return () => {
      clearTimeout(timer);
      clearTimeout(shimmerTimer);
    };
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

  // Update navbar when timer running state changes
  useEffect(() => {
    setIsTimerRunning(isRunning);
  }, [isRunning, setIsTimerRunning]);

  // Update browser tab title with live countdown
  useEffect(() => {
    if (isFlowMode && isRunning) {
      // Flow mode: show continuous total time
      const { mm, ss } = formatTime(flowElapsedTime);
      document.title = `${mm}:${ss} 🔥 FLOW`;
    } else if (isRunning) {
      const { mm, ss } = formatTime(remaining);
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
  }, [remaining, mode, isRunning, isFlowMode, flowElapsedTime]);

  const percent = (remaining / duration) * 100;
  const { mm, ss } = formatTime(remaining);
  const flowTime = formatTime(flowElapsedTime);

  // Determine if timer is paused (has time remaining but not running)
  const isPaused = !isRunning && remaining < duration;

  // Handle entering flow mode
  const handleEnterFlowMode = async () => {
    if (isRunning) return; // Don't allow entering flow mode while timer is running

    setIsFlowMode(true);

    // Start flow session in Convex if signed in
    if (isSignedIn) {
      try {
        const flowId = await startFlowSession();
        setFlowSessionId(flowId);
        console.log("✅ Flow session started:", flowId);
      } catch (err) {
        console.error("Failed to start flow session:", err);
      }
    }

    // Start the timer immediately
    start();
  };

  // Handle stopping flow mode
  const handleStopFlowMode = async () => {
    setIsFlowMode(false);

    // End flow session in Convex if signed in
    if (isSignedIn && flowSessionId) {
      try {
        const result = await endFlowSession({
          flowId: flowSessionId as Parameters<typeof endFlowSession>[0]["flowId"],
        });
        console.log(`✅ Flow session ended: ${result.completedPomos} pomos completed`);
      } catch (err) {
        console.error("Failed to end flow session:", err);
      }
    }

    setFlowSessionId(null);
    reset();
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 md:py-24 pb-24 md:pb-24">
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

      {/* Flow Completion Toast */}
      {showFlowCompleteToast && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-orange-500 text-white rounded-lg border border-orange-600 p-4 flex items-center gap-3"
        >
          <div>
            <p className="font-bold text-lg">Pomo Complete!</p>
            <p className="text-sm opacity-90">{flowToastCount} in this flow</p>
          </div>
        </motion.div>
      )}

      {/* Challenge Progress Toast */}
      <AnimatePresence>
        {showChallengeToast && nextChallenge && (
          <ChallengeToast
            challenge={nextChallenge}
            onDismiss={() => setShowChallengeToast(false)}
          />
        )}
      </AnimatePresence>

      <div className="w-full max-w-md flex flex-col items-center gap-8">
        {/* Timer Card Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="relative w-full bg-card rounded-2xl border border-border p-8 sm:p-12 flex flex-col items-center"
        >
          {/* Header */}
          <div className="text-center space-y-2 mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              {isFlowMode ? "Flow Mode" : "Pomodoro"}
            </h1>
            {isFlowMode ? (
              <div className="flex flex-col gap-1">
                <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                  {flowCompletedPomos} pomos completed
                </p>
                <p className="text-sm text-muted-foreground">
                  Total time: {flowTime.mm}:{flowTime.ss}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Pomos Today:{" "}
                <span className="font-semibold text-foreground">{cyclesCompleted}</span>
              </p>
            )}
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
                {/* Flow mode gradient (intense orange/red) */}
                <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="1" />
                  <stop offset="50%" stopColor="#ef4444" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity="1" />
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
                stroke={
                  isFlowMode
                    ? "url(#flowGradient)"
                    : mode === "break"
                      ? "url(#breakGradient)"
                      : "url(#focusGradient)"
                }
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
              <TagInput
                value={currentTag}
                onChange={setCurrentTag}
                disabled={isRunning}
                placeholder="Tag (e.g., coding, writing, design)"
              />
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-col items-center gap-4 w-full max-w-xs">
            {!isFlowMode ? (
              <>
                {/* Normal mode: Start/Pause/Resume button */}
                <motion.div
                  className="w-full"
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <Button
                    onClick={isRunning ? pause : start}
                    size="lg"
                    className="w-full py-8 text-lg font-semibold relative overflow-hidden flex flex-col items-center justify-center gap-0.5"
                  >
                    <span>
                      {isPaused ? "Paused: Click to Resume" : isRunning ? "Pause" : "Start"}
                    </span>
                    {/* Space bar hint inside button */}
                    {showSpaceHint && !isRunning && !isPaused && !isMobile && (
                      <motion.kbd
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="px-1.5 py-0 text-[10px] text-muted-foreground/70 bg-transparent border border-muted-foreground/30 rounded font-mono font-normal"
                      >
                        Space
                      </motion.kbd>
                    )}
                    {/* Shimmer effect - only on initial load when showing "Start" */}
                    {showStartShimmer && !isRunning && !isPaused && (
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background:
                            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 45%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.2) 55%, transparent 100%)",
                          backgroundSize: "200% 100%",
                        }}
                        animate={{
                          backgroundPosition: ["200% 0%", "-200% 0%"],
                        }}
                        transition={{
                          duration: 7,
                          ease: "linear",
                          repeat: Infinity,
                        }}
                      />
                    )}
                  </Button>
                </motion.div>

                {/* Enter FLOW button - show when not running */}
                {!isRunning && !isPaused && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full flex flex-col items-center gap-3"
                  >
                    <span className="text-xs text-muted-foreground">or</span>
                    <div className="w-full flex flex-col items-center gap-2">
                      <motion.div
                        whileTap={{ scale: 0.98 }}
                        whileHover={{ scale: 1.01 }}
                        className="w-full"
                      >
                        <Button
                          variant="outline"
                          onClick={handleEnterFlowMode}
                          size="lg"
                          className="w-full py-3 border-orange-500/30 hover:border-orange-500/50 hover:bg-orange-500/5"
                        >
                          Enter Flow Mode
                        </Button>
                      </motion.div>
                      <span className="text-xs text-muted-foreground text-center">
                        Back to back pomos, no breaks
                      </span>
                    </div>
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
              </>
            ) : (
              <>
                {/* Flow mode: Stop button */}
                <motion.div
                  className="w-full"
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <Button
                    onClick={handleStopFlowMode}
                    size="lg"
                    variant="destructive"
                    className="w-full py-6 text-lg font-semibold"
                  >
                    Stop Flow
                  </Button>
                </motion.div>
                <p className="text-xs text-muted-foreground text-center">
                  Timer continues automatically after each pomo
                </p>
              </>
            )}
          </div>
        </motion.div>

        {/* Ambient Sound Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="w-full"
        >
          <AmbientSoundControls />
        </motion.div>

        {/* Pomodoro Feed */}
        {isHydrated && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
            className="w-full bg-card rounded-2xl border border-border p-6"
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
