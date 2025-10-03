"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const FOCUS_DEFAULT = 25 * 60; // seconds

export default function Home() {
  const [duration, setDuration] = useState(FOCUS_DEFAULT);
  const [remaining, setRemaining] = useState(FOCUS_DEFAULT);
  const [isRunning, setIsRunning] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRunning) return;
    const tick = () => {
      if (!startedAtRef.current) return;
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      const next = Math.max(duration - elapsed, 0);
      setRemaining(next);
      if (next === 0) setIsRunning(false);
    };
    const id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
  }, [isRunning, duration]);

  const start = () => {
    if (isRunning) return;
    const now = Date.now();
    if (pausedAtRef.current) {
      // Resume: shift startedAt by the paused duration
      const pausedDuration = now - pausedAtRef.current;
      if (startedAtRef.current) startedAtRef.current += pausedDuration;
      pausedAtRef.current = null;
    } else {
      startedAtRef.current = now;
      setRemaining(duration);
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
    setRemaining(duration);
  };

  const percent = (remaining / duration) * 100;
  const mm = Math.floor(remaining / 60)
    .toString()
    .padStart(2, "0");
  const ss = (remaining % 60).toString().padStart(2, "0");

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6">Pomodoro</h1>
        <div className="text-6xl font-mono tabular-nums mb-4">
          {mm}:{ss}
        </div>
        <Progress value={percent} className="h-2 mb-6" />
        <div className="flex gap-2">
          <Button onClick={start}>Start</Button>
          <Button variant="secondary" onClick={pause}>
            Pause
          </Button>
          <Button variant="outline" onClick={reset}>
            Reset
          </Button>
        </div>
      </div>
    </main>
  );
}

