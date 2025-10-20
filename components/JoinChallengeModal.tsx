"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { X, Users, Calendar, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface JoinChallengeModalProps {
  onClose: () => void;
}

export function JoinChallengeModal({ onClose }: JoinChallengeModalProps) {
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  const challenge = useQuery(
    api.accountabilityChallenges.getChallengeByJoinCode,
    joinCode.length === 6 ? { joinCode: joinCode.toUpperCase() } : "skip"
  );

  const joinChallenge = useMutation(api.accountabilityChallenges.joinAccountabilityChallenge);

  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const handleJoin = async () => {
    if (!joinCode || joinCode.length !== 6) {
      alert("Please enter a valid 6-character code");
      return;
    }

    setIsJoining(true);
    try {
      await joinChallenge({ joinCode: joinCode.toUpperCase() });
      setJoined(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      alert(`Failed to join challenge: ${message}`);
      setIsJoining(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Refresh page to show new challenge
    if (joined) {
      window.location.reload();
    }
  };

  const handleCodeChange = (value: string) => {
    // Only allow alphanumeric characters, max 6
    const cleaned = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
    setJoinCode(cleaned);
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full relative"
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {!joined ? (
            <>
              <h2 className="text-2xl font-bold mb-2">Join Challenge</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Enter a 6-character join code to join an accountability challenge
              </p>

              {/* Join Code Input */}
              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block">Join Code</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder="ABC123"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none transition-colors text-center text-2xl font-bold tracking-wider uppercase"
                  maxLength={6}
                  autoFocus
                />
                {joinCode.length > 0 && joinCode.length < 6 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    {6 - joinCode.length} more characters
                  </p>
                )}
              </div>

              {/* Challenge Preview */}
              {challenge && joinCode.length === 6 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <h3 className="font-bold mb-2">{challenge.name}</h3>

                  {/* Dates */}
                  <div className="flex items-center gap-2 mb-3 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {formatDateDisplay(challenge.startDate)} -{" "}
                      {formatDateDisplay(challenge.endDate)}
                    </span>
                  </div>

                  {/* Participants */}
                  {challenge.participants && challenge.participants.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium">
                          {challenge.participants.length} participant
                          {challenge.participants.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {challenge.participants.slice(0, 5).map((participant, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={participant.avatarUrl} alt={participant.username} />
                              <AvatarFallback className="text-xs">
                                {participant.username[0]?.toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {participant.username}
                            </span>
                          </div>
                        ))}
                        {challenge.participants.length > 5 && (
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            +{challenge.participants.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Challenge rules reminder */}
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      📌 Complete 1 pomodoro each day for 4 days. If anyone misses a day, everyone
                      fails.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Error state */}
              {joinCode.length === 6 && !challenge && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
                >
                  <p className="text-sm text-red-600 dark:text-red-400 text-center">
                    Challenge not found. Check the code and try again.
                  </p>
                </motion.div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleJoin}
                  disabled={!challenge || isJoining || joinCode.length !== 6}
                  className="flex-1"
                >
                  {isJoining ? "Joining..." : "Join Challenge"}
                </Button>
              </div>
            </>
          ) : (
            // Success state
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Joined Successfully!</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You've joined the challenge. Good luck! 🎯
                </p>
              </div>

              <Button onClick={handleClose} className="w-full">
                View Challenge
              </Button>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
