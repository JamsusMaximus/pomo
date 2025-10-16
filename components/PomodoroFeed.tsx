"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "@/components/motion";
import type { PomodoroSession } from "@/types/pomodoro";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { TagInput } from "@/components/TagInput";
import { TagSuggestions } from "@/components/TagSuggestions";
import type { Id } from "@/convex/_generated/dataModel";

interface PomodoroFeedProps {
  sessions: PomodoroSession[]; // Fallback for non-signed in users
  initialLimit?: number; // Initial number of sessions to show
  showMoreButton?: boolean; // Whether to show a "show more" button
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

export function PomodoroFeed({
  sessions,
  initialLimit,
  showMoreButton = false,
}: PomodoroFeedProps) {
  const { isSignedIn } = useUser();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTag, setEditingTag] = useState<string>("");
  const [showSuggestionsFor, setShowSuggestionsFor] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState<number | null>(initialLimit || null);

  // Fetch from Convex if signed in, otherwise use localStorage sessions
  const convexSessions = useQuery(api.pomodoros.getMyPomodoros, { limit: 20 });
  const updateSessionTag = useMutation(api.pomodoros.updateSessionTag);

  // Use Convex sessions if available and user is signed in, otherwise fallback to localStorage
  const displaySessions = isSignedIn && convexSessions ? convexSessions : sessions;

  // Filter to only focus sessions and sort by completion time (most recent first)
  const focusSessions = displaySessions.filter((s) => s.mode === "focus");
  const allSortedSessions = [...focusSessions].sort((a, b) => b.completedAt - a.completedAt);

  // Apply limit if specified
  const sortedSessions = displayLimit
    ? allSortedSessions.slice(0, displayLimit)
    : allSortedSessions;
  const hasMore = displayLimit && allSortedSessions.length > displayLimit;

  const handleStartEdit = (sessionId: string, currentTag?: string) => {
    setEditingId(sessionId);
    setEditingTag(currentTag || "");
  };

  const handleShowSuggestions = (sessionId: string) => {
    setShowSuggestionsFor(sessionId);
  };

  const handleSelectTag = async (sessionId: string, tag: string) => {
    if (!isSignedIn) return;

    try {
      await updateSessionTag({
        sessionId: sessionId as Id<"pomodoros">,
        tag: tag,
      });
      setShowSuggestionsFor(null);
      setEditingId(null);
      setEditingTag("");
    } catch (error) {
      console.error("Failed to update tag:", error);
    }
  };

  const handleSaveTag = async (sessionId: string) => {
    if (!isSignedIn) return; // Only allow editing for signed-in users with Convex sessions

    try {
      await updateSessionTag({
        sessionId: sessionId as Id<"pomodoros">,
        tag: editingTag || undefined,
      });
      setEditingId(null);
      setEditingTag("");
      setShowSuggestionsFor(null);
    } catch (error) {
      console.error("Failed to update tag:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTag("");
    setShowSuggestionsFor(null);
  };

  if (focusSessions.length === 0) {
    // Don't show anything for logged-out users with no sessions
    if (!isSignedIn) {
      return null;
    }

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
          // Handle both Convex sessions (_id) and localStorage sessions (id)
          const sessionId = "_id" in session ? session._id : session.id;
          const isEditing = editingId === sessionId;
          const canEdit = isSignedIn && convexSessions; // Only allow editing Convex sessions

          return (
            <motion.div
              key={sessionId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Time Range */}
                  <div className="flex items-center gap-2 text-sm shrink-0">
                    <span className="text-muted-foreground">{formatTime(startTime)}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium">{formatTime(session.completedAt)}</span>
                  </div>

                  {/* Duration */}
                  <div className="text-sm text-muted-foreground shrink-0">
                    {formatDuration(session.duration)}
                  </div>

                  {/* Tag or Edit Input */}
                  <div className="flex-1 min-w-0 relative">
                    <AnimatePresence mode="wait">
                      {isEditing ? (
                        <motion.div
                          key="editing"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="flex items-center gap-2"
                        >
                          <div className="flex-1 min-w-0">
                            <TagInput
                              value={editingTag}
                              onChange={setEditingTag}
                              placeholder="Add tag..."
                            />
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => handleSaveTag(sessionId)}
                              className="p-1.5 rounded-md bg-orange-500/20 hover:bg-orange-500/30 text-orange-600 transition-colors"
                              title="Save"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1.5 rounded-md hover:bg-muted-foreground/10 text-muted-foreground transition-colors"
                              title="Cancel"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="display"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2"
                        >
                          {session.tag ? (
                            <div className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 text-xs font-medium border border-orange-500/20">
                              {session.tag}
                            </div>
                          ) : canEdit ? (
                            <button
                              onClick={() => handleShowSuggestions(sessionId)}
                              className="px-3 py-1 rounded-full text-xs text-muted-foreground hover:text-orange-600 hover:bg-orange-500/10 border border-dashed border-muted-foreground/30 hover:border-orange-500/30 transition-all"
                            >
                              + Add tag
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">No tag</span>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {/* Tag Suggestions Dropdown */}
                    {showSuggestionsFor === sessionId && (
                      <TagSuggestions
                        show={true}
                        onSelect={(tag) => handleSelectTag(sessionId, tag)}
                        onClose={() => setShowSuggestionsFor(null)}
                      />
                    )}
                  </div>
                </div>

                {/* Edit Button */}
                {canEdit && !isEditing && (
                  <button
                    onClick={() => handleStartEdit(sessionId, session.tag)}
                    className="shrink-0 p-1.5 rounded-md hover:bg-muted-foreground/10 text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit tag"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
      {showMoreButton && hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setDisplayLimit(null)}
            className="px-4 py-2 text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-500/10 rounded-lg transition-colors"
          >
            Show More ({allSortedSessions.length - sortedSessions.length} more)
          </button>
        </div>
      )}
    </div>
  );
}
