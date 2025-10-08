"use client";

import { motion } from "@/components/motion";
import type { PomodoroSession } from "@/types/pomodoro";

interface PomodoroFeedProps {
  sessions: PomodoroSession[];
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m`;
}

export function PomodoroFeed({ sessions }: PomodoroFeedProps) {
  // Filter to only focus sessions and sort by completion time (most recent first)
  const focusSessions = sessions.filter((s) => s.mode === "focus");
  const sortedSessions = [...focusSessions].sort((a, b) => b.completedAt - a.completedAt);

  if (focusSessions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No pomodoros completed yet.</p>
        <p className="text-xs mt-2">Complete your first focus session to see it here!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold mb-4">Recent Sessions</h3>
      <div className="space-y-2">
        {sortedSessions.map((session, index) => {
          const startTime = session.completedAt - session.duration * 1000;

          return (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                {/* Time Range */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{formatTime(startTime)}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium">{formatTime(session.completedAt)}</span>
                </div>

                {/* Duration */}
                <div className="text-sm text-muted-foreground">
                  {formatDuration(session.duration)}
                </div>

                {/* Tag */}
                {session.tag && (
                  <div className="px-2 py-1 rounded-full bg-accent text-accent-foreground text-xs">
                    {session.tag}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
