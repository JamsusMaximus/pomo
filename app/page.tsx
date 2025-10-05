"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
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
import { Download } from "lucide-react";

export default function Home() {
  const [focusDuration, setFocusDuration] = useState(FOCUS_DEFAULT);
  const [breakDuration, setBreakDuration] = useState(BREAK_DEFAULT);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentTag, setCurrentTag] = useState("");
  const [previousMode, setPreviousMode] = useState<Mode>("focus");
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [showSpaceHint, setShowSpaceHint] = useState(true);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");
  const [hasAnimatedProgress, setHasAnimatedProgress] = useState(false);

  // Convex integration (optional - only when signed in)
  const { user, isSignedIn } = useUser();
  const stats = useQuery(api.stats.getStats);
  const levelConfig = useQuery(api.levels.getLevelConfig);
  const ensureUser = useMutation(api.users.ensureUser);
  const savePrefs = useMutation(api.timers.savePreferences);
  const saveSession = useMutation(api.pomodoros.saveSession);

  // Track previous sign-in state to detect when user signs in
  const prevIsSignedIn = useRef(isSignedIn);

  // Play completion sound using Web Audio API
  const playCompletionSound = useCallback(() => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextClass();
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

        // Increment pomos count
        setCyclesCompleted((prev) => prev + 1);

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

        // Refresh sessions display
        setSessions(loadSessions());
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
      setCyclesCompleted(prefs.cyclesCompleted);
    }

    // Load sessions
    setSessions(loadSessions());

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
      cyclesCompleted,
    });
  }, [focusDuration, breakDuration, mode, cyclesCompleted, isHydrated]);

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

  const percent = (remaining / duration) * 100;
  const { mm, ss } = formatTime(remaining);

  // Determine if timer is paused (has time remaining but not running)
  const isPaused = !isRunning && remaining < duration;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-20 sm:py-24">
      {/* Top Controls - Positioned to avoid overlap */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 sm:gap-3 h-10">
        <Link href="/download">
          <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
            <Download className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Download App</span>
          </Button>
        </Link>
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

              // Get level info from database config or fallback to lib
              const getLevelInfoFromDb = (pomos: number) => {
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

                const currentIndex = levelConfig.findIndex(l => l.level === currentLevel.level);
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
              };

              const levelInfo = getLevelInfoFromDb(stats.total.count);

              return (
                <motion.div 
                  className="flex flex-col gap-1"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <span className="text-sm font-medium">
                    Level {levelInfo.currentLevel}
                  </span>
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
