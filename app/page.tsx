"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const FOCUS_DEFAULT = 25 * 60; // seconds

function formatTime(seconds: number): { mm: string; ss: string } {
  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");
  return { mm, ss };
}

export default function Home() {
  const [remaining, setRemaining] = useState(FOCUS_DEFAULT);
  const [isRunning, setIsRunning] = useState(false);
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
      if (next === 0) setIsRunning(false);
    };
    const id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
  }, [isRunning]);

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
    setRemaining(durationRef.current);
  };

  const percent = (remaining / durationRef.current) * 100;
  const { mm, ss } = formatTime(remaining);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg">
        <div className="text-center space-y-8">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Pomodoro
          </h1>
          
          <div className="text-7xl sm:text-8xl md:text-9xl font-mono font-light tabular-nums tracking-tight">
            {mm}:{ss}
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

