"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "@/components/motion";
import { Handshake, Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function ActiveChallengesWidget() {
  const activeChallenges = useQuery(api.accountabilityChallenges.getActiveChallengesForToday);

  if (!activeChallenges || activeChallenges.length === 0) {
    return null;
  }

  const completedCount = activeChallenges.filter((c) => c.completedToday).length;
  const totalCount = activeChallenges.length;

  // Get unique participants across all active challenges
  const allParticipants = activeChallenges.reduce(
    (acc, challenge) => {
      challenge.participants?.forEach((participant) => {
        if (!acc.some((p) => p.userId === participant.userId)) {
          acc.push(participant);
        }
      });
      return acc;
    },
    [] as Array<{ userId: string; username: string; avatarUrl?: string; role: string }>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        <Link href="/pacts">
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-2 border-orange-500/30 rounded-2xl p-4 hover:border-orange-500/50 transition-colors cursor-pointer group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                  <Handshake className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    {completedCount === totalCount
                      ? "All pacts complete today! 🎉"
                      : `${totalCount} Active Pact${totalCount !== 1 ? "s" : ""} Today`}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {completedCount} of {totalCount} completed
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>

            {/* Progress indicators */}
            <div className="flex gap-2 mt-3">
              {activeChallenges.map((challenge, idx) => {
                const isCompleted = challenge.completedToday;
                return (
                  <div
                    key={challenge._id}
                    className="flex-1 h-2 rounded-full overflow-hidden bg-muted/30"
                    title={`${challenge.name}: ${isCompleted ? "Completed" : `${challenge.pomosToday}/${challenge.requiredPomosPerDay} pomos`}`}
                  >
                    <motion.div
                      className={`h-full ${isCompleted ? "bg-green-500" : "bg-orange-500"}`}
                      initial={{ width: 0 }}
                      animate={{
                        width: isCompleted
                          ? "100%"
                          : `${(challenge.pomosToday / challenge.requiredPomosPerDay) * 100}%`,
                      }}
                      transition={{ duration: 0.5, delay: idx * 0.1 }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Pact names with participant avatars */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-2 flex-wrap flex-1">
                {activeChallenges.map((challenge) => (
                  <div
                    key={challenge._id}
                    className="flex items-center gap-1 px-2 py-0.5 bg-muted/30 rounded text-xs"
                  >
                    {challenge.completedToday && <Check className="w-3 h-3 text-green-500" />}
                    <span className="text-muted-foreground">{challenge.name}</span>
                  </div>
                ))}
              </div>

              {/* Participant Avatars */}
              {allParticipants.length > 0 && (
                <div className="flex -space-x-2 ml-3">
                  {allParticipants.slice(0, 4).map((participant, idx) => (
                    <Avatar
                      key={participant.userId}
                      className="w-8 h-8 border-2 border-background"
                      style={{ zIndex: allParticipants.length - idx }}
                    >
                      <AvatarImage src={participant.avatarUrl} alt={participant.username} />
                      <AvatarFallback className="bg-orange-500/20 text-xs">
                        {participant.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {allParticipants.length > 4 && (
                    <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs text-muted-foreground font-medium">
                      +{allParticipants.length - 4}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
}
