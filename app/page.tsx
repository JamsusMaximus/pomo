"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

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
  const [mode, setMode] = useState<Mode>("focus");
  const [remaining, setRemaining] = useState(FOCUS_DEFAULT);
  const [isRunning, setIsRunning] = useState(false);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const durationRef = useRef(FOCUS_DEFAULT);
  const startedAtRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const prefs = loadPreferences();
    if (prefs) {
      setFocusDuration(prefs.focusDuration);
      setBreakDuration(prefs.breakDuration);
      setMode(prefs.lastMode);
      setCyclesCompleted(prefs.cyclesCompleted);
      durationRef.current = prefs.lastMode === "focus" ? prefs.focusDuration : prefs.breakDuration;
      setRemaining(durationRef.current);
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

  useEffect(() => {
    if (!isRunning) return;
    const tick = () => {
      if (!startedAtRef.current) return;
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      const next = Math.max(durationRef.current - elapsed, 0);
      setRemaining(next);
      
      if (next === 0) {
        setIsRunning(false);
        // Auto-switch modes
        if (mode === "focus") {
          // Focus finished → switch to break
          setMode("break");
          durationRef.current = breakDuration;
          setRemaining(breakDuration);
        } else {
          // Break finished → switch to focus and increment cycles
          setMode("focus");
          durationRef.current = focusDuration;
          setRemaining(focusDuration);
          setCyclesCompleted((prev) => prev + 1);
        }
        // Reset timing refs for next session
        startedAtRef.current = null;
        pausedAtRef.current = null;
      }
    };
    const id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
  }, [isRunning, mode, focusDuration, breakDuration]);

  const start = () => {
    if (isRunning) return;
    const now = Date.now();
    if (pausedAtRef.current && startedAtRef.current) {
      // Resume: shift startedAt by the paused duration
      const pausedDuration = now - pausedAtRef.current;
      startedAtRef.current += pausedDuration;
      pausedAtRef.current = null;
    } else {
      startedAtRef.current = now;
      setRemaining(durationRef.current);
    }
    setIsRunning(true);
  };

  const pause = () => {
    if (!isRunning) return;
    setIsRunning(false);
    pausedAtRef.current = Date.now();
  };

  const reset = () => {
    setIsRunning(false);
    startedAtRef.current = null;
    pausedAtRef.current = null;
    setMode("focus");
    durationRef.current = focusDuration;
    setRemaining(focusDuration);
  };

  const percent = (remaining / durationRef.current) * 100;
  const { mm, ss } = formatTime(remaining);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg">
        <div className="text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Pomodoro
            </h1>
            <div className="mt-3 text-sm text-muted-foreground">
              Cycles completed: {cyclesCompleted}
            </div>
          </motion.div>
          
          <div>
            <motion.div
              className="inline-block px-4 py-1.5 mb-6 rounded-full text-sm font-medium bg-secondary"
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {mode === "focus" ? "Time to focus..." : "Take a break"}
            </motion.div>
            
            <div className="text-8xl sm:text-9xl font-semibold tabular-nums tracking-tighter flex justify-center items-center"
                 style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, "SF Pro Display", sans-serif', fontVariantNumeric: 'tabular-nums' }}>
              {/* Minutes - tens digit */}
              <div className="relative inline-block min-w-[1ch]">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={mm[0]}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, ease: "easeInOut" }}
                    className="inline-block"
                  >
                    {mm[0]}
                  </motion.span>
                </AnimatePresence>
              </div>
              {/* Minutes - ones digit */}
              <div className="relative inline-block min-w-[1ch]">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={mm[1]}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, ease: "easeInOut" }}
                    className="inline-block"
                  >
                    {mm[1]}
                  </motion.span>
                </AnimatePresence>
              </div>
              <span className="mx-1">:</span>
              {/* Seconds - tens digit */}
              <div className="relative inline-block min-w-[1ch]">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={ss[0]}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, ease: "easeInOut" }}
                    className="inline-block"
                  >
                    {ss[0]}
                  </motion.span>
                </AnimatePresence>
              </div>
              {/* Seconds - ones digit */}
              <div className="relative inline-block min-w-[1ch]">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={ss[1]}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, ease: "easeInOut" }}
                    className="inline-block"
                  >
                    {ss[1]}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
          </div>
          
          <div className="relative h-2.5 sm:h-3 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: "100%" }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
          
          <div className="flex gap-3 justify-center pt-2">
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

