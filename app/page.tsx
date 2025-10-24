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

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
import { motion } from "@/components/motion";
import { useUser, SignUpButton } from "@clerk/nextjs";
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
import { AmbientSoundControls } from "@/components/AmbientSoundControls";
import { useAmbientSoundContext } from "@/components/AmbientSoundProvider";
import { TagInput } from "@/components/TagInput";
import { ChallengeToast } from "@/components/ChallengeToast";
import { ActiveChallengesWidget } from "@/components/ActiveChallengesWidget";
import type { Mode, PomodoroSession } from "@/types/pomodoro";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useTimerContext } from "@/components/NavbarWrapper";
import { AnimatePresence } from "@/components/motion";
import { useSearchParams } from "next/navigation";
import { Play, Pause, BookOpen, Sun, Crown, Trophy, Zap, Flame } from "lucide-react";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";

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
  const searchParams = useSearchParams();
  const autostart = searchParams.get("autostart") === "true";

  const [focusDuration, setFocusDuration] = useState(FOCUS_DEFAULT);
  const [breakDuration, setBreakDuration] = useState(BREAK_DEFAULT);
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentTag, setCurrentTag] = useState("");
  const [currentTagPrivate, setCurrentTagPrivate] = useState(false);
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
  const hasAutostartedRef = useRef(false);
  const hasFadedForCompletionRef = useRef(false);
  const savedVolumesRef = useRef<Record<string, number>>({});

  // Timer context for navbar
  const { setIsTimerRunning } = useTimerContext();

  // Ambient sound context for fading before notifications
  const { fadeAllToVolume, restoreVolumes, volumes } = useAmbientSoundContext();

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
      // Save current volumes for restoration
      savedVolumesRef.current = { ...volumes };

      // Fade down to 30% quickly (500ms)
      fadeAllToVolume(0.3, 500);

      // Play notification sound after brief delay
      setTimeout(() => {
        playCompletionSound();
        showNotification("Pomo Complete! 🔥", "Keep flowing!");

        // Restore volumes after sound plays
        setTimeout(() => {
          restoreVolumes(savedVolumesRef.current as Parameters<typeof restoreVolumes>[0], 500);
        }, 600);
      }, 600);

      // Save completed pomo immediately
      const localSession = saveCompletedSession(
        "focus",
        focusDuration,
        currentTag,
        currentTagPrivate
      );

      // Save to Convex if signed in
      if (isSignedIn) {
        saveSession({
          mode: "focus",
          duration: focusDuration,
          tag: currentTag || undefined,
          tagPrivate: currentTagPrivate || undefined,
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
        const localSession = saveCompletedSession(
          "focus",
          focusDuration,
          currentTag,
          currentTagPrivate
        );

        // Save to Convex if signed in, then mark as synced
        if (isSignedIn) {
          saveSession({
            mode: "focus",
            duration: focusDuration,
            tag: currentTag || undefined,
            tagPrivate: currentTagPrivate || undefined,
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

  // Handle starting timer from landing page CTA
  const handleStartTimer = useCallback(() => {
    start();
    setShowSpaceHint(false);
  }, [start]);

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
              tagPrivate: session.tagPrivate,
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

  // Warn before closing tab if timer is running
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRunning && !isFlowMode) {
        e.preventDefault();
        e.returnValue = ""; // Required for Chrome
        return ""; // Required for some older browsers
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isRunning, isFlowMode]);

  // Autostart timer if ?autostart=true parameter is present
  useEffect(() => {
    if (autostart && isHydrated && !hasAutostartedRef.current && !isRunning) {
      hasAutostartedRef.current = true;
      // Small delay to ensure UI is ready
      setTimeout(() => {
        start();
        setShowSpaceHint(false);
      }, 500);
    }
  }, [autostart, isHydrated, isRunning, start]);

  // Fade ambient sounds before timer completes (normal mode only)
  useEffect(() => {
    if (
      isRunning &&
      !isFlowMode &&
      mode === "focus" &&
      remaining === 3 &&
      !hasFadedForCompletionRef.current
    ) {
      console.log("Fading ambient sounds for completion (3s remaining)");
      hasFadedForCompletionRef.current = true;
      // Fade all sounds to 0% over 2 seconds and update state
      fadeAllToVolume(0, 2000, true);
    }

    // Reset fade flag when timer resets or starts a new session
    if (!isRunning || remaining === duration) {
      hasFadedForCompletionRef.current = false;
    }
  }, [isRunning, isFlowMode, mode, remaining, duration, fadeAllToVolume]);

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
      document.title = "Lock.in";
    }

    // Cleanup: reset title when component unmounts
    return () => {
      document.title = "Lock.in";
    };
  }, [remaining, mode, isRunning, isFlowMode, flowElapsedTime]);

  const percent = (remaining / duration) * 100;
  const { mm, ss } = formatTime(remaining);
  const flowTime = formatTime(flowElapsedTime);

  // Determine if timer is paused (has time remaining but not running)
  const isPaused = !isRunning && remaining < duration;

  // Handle entering flow mode
  const handleEnterFlowMode = async () => {
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

    // If timer is not running yet, start it immediately
    // If already running, it will continue seamlessly
    if (!isRunning) {
      start();
    }
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
                  setDebugTime(4);
                }}
                className="text-xs opacity-50 hover:opacity-100"
              >
                Debug: 4s
              </Button>
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
                isPrivate={currentTagPrivate}
                onPrivacyChange={setCurrentTagPrivate}
                isSignedIn={isSignedIn}
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
                    className="w-full py-8 text-lg font-semibold relative overflow-hidden flex flex-col items-center justify-center gap-0.5 border-2 border-orange-500/40 dark:border-orange-500/60"
                  >
                    <div className="flex items-center gap-2">
                      {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      <span>
                        {isPaused ? "Paused: Click to Resume" : isRunning ? "Pause" : "Start"}
                      </span>
                    </div>
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
                        className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/30 dark:via-white/20 to-transparent"
                        style={{
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

                {/* Enter FLOW button - show when not in flow mode */}
                {(isRunning || !isPaused) && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full flex flex-col items-center gap-3"
                  >
                    {!isRunning && !isPaused && (
                      <span className="text-xs text-muted-foreground">or</span>
                    )}
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
                          className="w-full py-3 min-h-[44px] border-orange-500/60 dark:border-orange-500/80 hover:border-orange-500 hover:bg-orange-500/10 text-foreground flex items-center justify-center gap-2"
                        >
                          <span className="text-lg">∞</span>
                          <span>Enter Flow Mode</span>
                        </Button>
                      </motion.div>
                      <span className="text-xs text-muted-foreground text-center">
                        {isRunning
                          ? "Continue this pomo then keep going"
                          : "Back to back pomos, no breaks"}
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

        {/* Active Challenges Widget */}
        {isSignedIn && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
            className="w-full"
          >
            <ActiveChallengesWidget />
          </motion.div>
        )}

        {/* Ambient Sound Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="w-full"
        >
          <AmbientSoundControls />
        </motion.div>

        {/* Sign In CTA - Only show when signed out */}
        {!isSignedIn && isHydrated && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
            className="w-full"
          >
            <div className="bg-gradient-to-br from-orange-500/5 to-orange-500/10 rounded-2xl border border-orange-500/20 p-6 text-center">
              <h3 className="text-lg font-semibold mb-2">Track Your Progress</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Sign in to save your pomodoros, earn badges, and compete with friends
              </p>
              <SignUpButton mode="modal">
                <Button size="lg" className="w-full sm:w-auto min-h-[44px]">
                  Sign In / Sign Up
                </Button>
              </SignUpButton>
            </div>
          </motion.div>
        )}
      </div>

      {/* Landing Page Sections - Only show when signed out, hydrated, and timer not running */}
      {!isSignedIn && isHydrated && !isRunning && (
        <>
          {/* Hero Section */}
          <section className="flex flex-col items-center justify-center px-6 py-32 bg-gradient-to-b from-orange-50 to-white">
            <div className="max-w-5xl w-full text-center">
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-7xl md:text-8xl font-bold mb-6 tracking-tight"
              >
                <span className="bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">
                  Strava
                </span>{" "}
                for Focus
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-2xl md:text-3xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed"
              >
                Drop into flow, spend your time on the activities that matter to you
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Button
                  onClick={handleStartTimer}
                  size="lg"
                  className="relative overflow-hidden bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xl font-semibold px-12 py-6 rounded-lg hover:scale-105 transition-transform shadow-lg hover:shadow-xl"
                >
                  <motion.div
                    className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    style={{ backgroundSize: "200% 100%" }}
                    animate={{ backgroundPosition: ["200% 0%", "-200% 0%"] }}
                    transition={{ duration: 7, ease: "linear", repeat: Infinity }}
                  />
                  Start the timer and lock in
                </Button>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mt-6 text-gray-500"
              >
                For work, hobbies, or life admin
              </motion.p>
            </div>
          </section>

          {/* Pacts Section */}
          <section className="pt-16 pb-32 px-6 bg-white">
            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-2 gap-16 items-center">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6 }}
                  className="order-2 md:order-1"
                >
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 border border-gray-200">
                    <div className="bg-white rounded-xl p-6 shadow-sm mb-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold">Study Sprint 2025</h3>
                          <BookOpen className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-sm text-gray-500">3/4 on track</span>
                      </div>
                      <div className="flex gap-2 mb-3">
                        <img
                          src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop&crop=faces"
                          alt="Participant"
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <img
                          src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces"
                          alt="Sarah"
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <img
                          src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces"
                          alt="Marcus"
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <img
                          src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=faces"
                          alt="Participant"
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      </div>
                      <p className="text-gray-600">5 pomos per day for a week</p>
                    </div>
                    <div className="bg-white rounded-xl p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold">Indie Hackers</h3>
                          <Sun className="w-5 h-5 text-yellow-500" />
                        </div>
                        <span className="text-sm text-orange-600 font-semibold">
                          All crushing it!
                        </span>
                      </div>
                      <div className="flex gap-2 mb-3">
                        <img
                          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces"
                          alt="Participant"
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <img
                          src="https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=100&h=100&fit=crop&crop=faces"
                          alt="Participant"
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <img
                          src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces"
                          alt="Alex"
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      </div>
                      <p className="text-gray-600">25mins per day on your project</p>
                    </div>
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="order-1 md:order-2"
                >
                  <h2 className="text-6xl font-bold mb-6 leading-tight">Make pacts with friends</h2>
                  <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                    Turn focus into a team sport and see who&apos;s following through on their
                    intentions.
                  </p>
                  <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                    When you know your friends are watching, you show up.
                  </p>
                  <SignUpButton mode="modal">
                    <Button
                      variant="outline"
                      size="lg"
                      className="border-2 border-orange-500 text-orange-600 text-lg font-semibold px-10 py-4 rounded-lg hover:bg-orange-50 transition-colors"
                    >
                      Sign up to save your progress
                    </Button>
                  </SignUpButton>
                </motion.div>
              </div>
            </div>
          </section>

          {/* Progress Tracking Section - Light theme only */}
          <section className="py-32 px-6 bg-white">
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-5xl md:text-6xl font-bold text-center mb-6 text-gray-900">
                  Track your focus like an athlete
                </h2>
                <p className="text-xl text-gray-600 text-center mb-20 max-w-3xl mx-auto">
                  See your progress with beautiful charts and heatmaps. It&apos;s Strava for your
                  brain.
                </p>

                {/* Activity Heatmap Demo */}
                <div className="mb-20">
                  <h3 className="text-2xl font-bold mb-6 text-gray-900">Activity Heatmap</h3>
                  <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                    <div className="heatmap-container">
                      <ActivityHeatmap
                        data={(() => {
                          // Generate mock data for past year
                          const data = [];
                          const today = new Date();
                          for (let i = 364; i >= 0; i--) {
                            const date = new Date(today);
                            date.setDate(date.getDate() - i);
                            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                            // More activity in recent weeks
                            const recencyBoost = i < 60 ? 2 : 1;
                            const count = Math.floor(Math.random() * 5 * recencyBoost);
                            if (count > 0) {
                              data.push({
                                date: dateStr,
                                count: count,
                                minutes: count * 25,
                              });
                            }
                          }
                          return data;
                        })()}
                      />
                    </div>
                  </div>
                </div>

                {/* Focus Graph Demo */}
                <div className="mb-12">
                  <h3 className="text-2xl font-bold mb-6 text-gray-900">Focus Score Over Time</h3>
                  <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 graph-container">
                    <svg viewBox="0 0 800 200" className="w-full h-auto">
                      <defs>
                        <linearGradient id="graphGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" style={{ stopColor: "#fb923c" }} />
                          <stop offset="50%" style={{ stopColor: "#f97316" }} />
                          <stop offset="100%" style={{ stopColor: "#ea580c" }} />
                        </linearGradient>
                      </defs>
                      {/* Grid lines */}
                      <line x1="20" y1="20" x2="780" y2="20" stroke="#d1d5db" strokeWidth="1" />
                      <line x1="20" y1="60" x2="780" y2="60" stroke="#d1d5db" strokeWidth="1" />
                      <line x1="20" y1="100" x2="780" y2="100" stroke="#d1d5db" strokeWidth="1" />
                      <line x1="20" y1="140" x2="780" y2="140" stroke="#d1d5db" strokeWidth="1" />
                      <line x1="20" y1="180" x2="780" y2="180" stroke="#d1d5db" strokeWidth="1" />

                      {/* Area fill */}
                      <path
                        className="graph-fill"
                        d="M 20,160 L 100,140 L 180,120 L 260,130 L 340,100 L 420,90 L 500,70 L 580,60 L 660,50 L 740,40 L 780,180 L 20,180 Z"
                        fill="url(#graphGradient)"
                      />

                      {/* Line */}
                      <path
                        className="graph-line"
                        d="M 20,160 L 100,140 L 180,120 L 260,130 L 340,100 L 420,90 L 500,70 L 580,60 L 660,50 L 740,40"
                        fill="none"
                        stroke="url(#graphGradient)"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="flex justify-between text-sm text-gray-600 mt-2 px-2">
                      <span>30 days ago</span>
                      <span>Today</span>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <Button
                    onClick={handleStartTimer}
                    size="lg"
                    className="bg-orange-500 text-white text-lg font-semibold px-10 py-4 rounded-lg hover:bg-orange-600 transition-colors shadow-lg"
                  >
                    Start the timer and lock in
                  </Button>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Friends Section */}
          <section className="py-32 px-6 bg-gray-50">
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-bold">Friends</h2>
                </div>

                <div className="space-y-4">
                  {/* Friend Card 1 - Active Today */}
                  <div className="p-4 rounded-xl border border-l-4 border-l-orange-500 border-t-gray-200 border-r-gray-200 border-b-gray-200 bg-white hover:shadow-lg transition-all cursor-pointer">
                    <div className="flex items-start gap-4 mb-3">
                      <img
                        src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces"
                        alt="Sarah"
                        className="w-12 h-12 rounded-full object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold">sarah_chen</h3>
                          <span className="flex h-2 w-2 shrink-0">
                            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-orange-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                          </span>
                          <span className="text-xs text-orange-500 font-medium">active today</span>
                        </div>
                        <p className="text-xs text-gray-500">Lv 12 · Focus Master</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-center">
                          <p className="text-lg font-bold text-orange-500">3</p>
                          <p className="text-[10px] text-gray-500">today</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold">847</p>
                          <p className="text-[10px] text-gray-500">total</p>
                        </div>
                        <div className="text-center flex flex-col items-center">
                          <div className="flex items-center gap-0.5">
                            <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                            <p className="text-lg font-bold text-orange-500">32</p>
                          </div>
                          <p className="text-[10px] text-gray-500">streak</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-start gap-3">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="px-2 py-0.5 rounded-full bg-gray-100">
                            thesis-writing
                          </span>
                          <span>·</span>
                          <span className="shrink-0">25m</span>
                          <span>·</span>
                          <span className="shrink-0 text-[10px]">2 hours ago</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="px-2 py-0.5 rounded-full bg-gray-100">deep-work</span>
                          <span>·</span>
                          <span className="shrink-0">50m</span>
                          <span>·</span>
                          <span className="shrink-0 text-[10px]">5 hours ago</span>
                        </div>
                      </div>
                      <div className="w-full md:w-64 md:shrink-0">
                        <div className="flex items-start gap-3 px-3 py-2 bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-lg border border-orange-500/20">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/20 shrink-0">
                            <Crown className="w-4 h-4 text-orange-500" />
                          </div>
                          <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <p className="text-xs font-medium text-orange-600">Elite Performer</p>
                            <p className="text-[11px] text-gray-600 leading-snug">
                              Complete 500 total pomodoros
                            </p>
                            <p className="text-[10px] text-gray-500">1 week ago</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Friend Card 2 */}
                  <div className="p-4 rounded-xl border border-gray-200 bg-white hover:shadow-lg transition-all cursor-pointer hover:border-orange-500/20">
                    <div className="flex items-start gap-4 mb-3">
                      <img
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces"
                        alt="Marcus"
                        className="w-12 h-12 rounded-full object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold">marcus_codes</h3>
                        </div>
                        <p className="text-xs text-gray-500">Lv 9 · Productivity Enthusiast</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-center">
                          <p className="text-lg font-bold">0</p>
                          <p className="text-[10px] text-gray-500">today</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold">523</p>
                          <p className="text-[10px] text-gray-500">total</p>
                        </div>
                        <div className="text-center flex flex-col items-center">
                          <div className="flex items-center gap-0.5">
                            <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                            <p className="text-lg font-bold text-orange-500">18</p>
                          </div>
                          <p className="text-[10px] text-gray-500">streak</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-start gap-3">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="px-2 py-0.5 rounded-full bg-gray-100">code-review</span>
                          <span>·</span>
                          <span className="shrink-0">25m</span>
                          <span>·</span>
                          <span className="shrink-0 text-[10px]">yesterday</span>
                        </div>
                      </div>
                      <div className="w-full md:w-64 md:shrink-0">
                        <div className="flex items-start gap-3 px-3 py-2 bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-lg border border-orange-500/20">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/20 shrink-0">
                            <Trophy className="w-4 h-4 text-orange-500" />
                          </div>
                          <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <p className="text-xs font-medium text-orange-600">Century Club</p>
                            <p className="text-[11px] text-gray-600 leading-snug">
                              Complete 100 total pomodoros
                            </p>
                            <p className="text-[10px] text-gray-500">2 months ago</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Friend Card 3 */}
                  <div className="p-4 rounded-xl border border-gray-200 bg-white hover:shadow-lg transition-all cursor-pointer hover:border-orange-500/20">
                    <div className="flex items-start gap-4 mb-3">
                      <img
                        src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces"
                        alt="Alex"
                        className="w-12 h-12 rounded-full object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold">alex_kim</h3>
                        </div>
                        <p className="text-xs text-gray-500">Lv 15 · Zen Master</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-center">
                          <p className="text-lg font-bold">0</p>
                          <p className="text-[10px] text-gray-500">today</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold">1205</p>
                          <p className="text-[10px] text-gray-500">total</p>
                        </div>
                        <div className="text-center flex flex-col items-center">
                          <div className="flex items-center gap-0.5">
                            <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                            <p className="text-lg font-bold text-orange-500">47</p>
                          </div>
                          <p className="text-[10px] text-gray-500">streak</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-start gap-3">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="px-2 py-0.5 rounded-full bg-gray-100">
                            guitar-practice
                          </span>
                          <span>·</span>
                          <span className="shrink-0">30m</span>
                          <span>·</span>
                          <span className="shrink-0 text-[10px]">yesterday</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="px-2 py-0.5 rounded-full bg-gray-100">meditation</span>
                          <span>·</span>
                          <span className="shrink-0">15m</span>
                          <span>·</span>
                          <span className="shrink-0 text-[10px]">2 days ago</span>
                        </div>
                      </div>
                      <div className="w-full md:w-64 md:shrink-0">
                        <div className="flex items-start gap-3 px-3 py-2 bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-lg border border-orange-500/20">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/20 shrink-0">
                            <Zap className="w-4 h-4 text-orange-500" />
                          </div>
                          <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <p className="text-xs font-medium text-orange-600">Streak Warrior</p>
                            <p className="text-[11px] text-gray-600 leading-snug">
                              Maintain a 30-day streak
                            </p>
                            <p className="text-[10px] text-gray-500">17 days ago</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center mt-12">
                  <SignUpButton mode="modal">
                    <Button
                      variant="outline"
                      size="lg"
                      className="border-2 border-orange-500 text-orange-600 text-lg font-semibold px-10 py-4 rounded-lg hover:bg-orange-50 transition-colors"
                    >
                      Sign up to follow friends
                    </Button>
                  </SignUpButton>
                </div>
              </motion.div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

export default function Home() {
  return (
    <ErrorBoundary
      fallbackTitle="Timer Error"
      fallbackMessage="The pomodoro timer encountered an error. Your progress has been saved."
    >
      <Suspense
        fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}
      >
        <HomeContent />
      </Suspense>
    </ErrorBoundary>
  );
}
