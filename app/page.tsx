"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const FOCUS_DEFAULT = 25 * 60; // seconds
const BREAK_DEFAULT = 5 * 60; // seconds

type Mode = "focus" | "break";

function formatTime(seconds: number): { mm: string; ss: string } {
  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");
  return { mm, ss };
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("focus");
  const [remaining, setRemaining] = useState(FOCUS_DEFAULT);
  const [isRunning, setIsRunning] = useState(false);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const durationRef = useRef(FOCUS_DEFAULT);
  const startedAtRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);

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
          durationRef.current = BREAK_DEFAULT;
          setRemaining(BREAK_DEFAULT);
        } else {
          // Break finished → switch to focus and increment cycles
          setMode("focus");
          durationRef.current = FOCUS_DEFAULT;
          setRemaining(FOCUS_DEFAULT);
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
  }, [isRunning, mode]);

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
    durationRef.current = FOCUS_DEFAULT;
    setRemaining(FOCUS_DEFAULT);
  };

  const percent = (remaining / durationRef.current) * 100;
  const { mm, ss } = formatTime(remaining);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg">
        <div className="text-center space-y-8">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Pomodoro
            </h1>
            <div className="mt-3 text-sm text-muted-foreground">
              Cycles completed: {cyclesCompleted}
            </div>
          </div>
          
          <div>
            <div className="inline-block px-4 py-1.5 mb-4 rounded-full text-sm font-medium bg-secondary">
              {mode === "focus" ? "🎯 Focus Time" : "☕ Break Time"}
            </div>
            <div className="text-7xl sm:text-8xl md:text-9xl font-mono font-light tabular-nums tracking-tight">
              {mm}:{ss}
            </div>
          </div>
          
          <Progress value={percent} className="h-2.5 sm:h-3" />
          
          <div className="flex gap-3 justify-center pt-2">
            <Button
              onClick={start}
              size="lg"
              className="min-w-[100px]"
              disabled={isRunning}
            >
              Start
            </Button>
            <Button
              variant="secondary"
              onClick={pause}
              size="lg"
              className="min-w-[100px]"
              disabled={!isRunning}
            >
              Pause
            </Button>
            <Button
              variant="outline"
              onClick={reset}
              size="lg"
              className="min-w-[100px]"
            >
              Reset
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

