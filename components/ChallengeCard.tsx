"use client";

import { Check, X, Clock, Trophy, Users, Copy, CheckCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface Challenge {
  _id: Id<"accountabilityChallenges">;
  name: string;
  joinCode: string;
  startDate: string;
  endDate: string;
  status: "pending" | "active" | "completed" | "failed";
  requiredPomosPerDay: number;
  createdAt: number;
  completedAt?: number;
  failedOn?: string;
  failedByUserId?: Id<"users">;
}

interface ChallengeCardProps {
  challenge: Challenge;
}

export function ChallengeCard({ challenge }: ChallengeCardProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const details = useQuery(api.accountabilityChallenges.getChallengeDetails, {
    challengeId: challenge._id,
  });

  const copyJoinCode = () => {
    navigator.clipboard.writeText(challenge.joinCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Get challenge dates
  const challengeDates: string[] = [];
  const start = new Date(challenge.startDate);
  const end = new Date(challenge.endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    challengeDates.push(d.toISOString().split("T")[0]);
  }

  // Status colors and labels
  const statusConfig = {
    pending: {
      label: "Starts Soon",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      text: "text-blue-500",
      icon: Clock,
    },
    active: {
      label: "In Progress",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
      text: "text-orange-500",
      icon: Trophy,
    },
    completed: {
      label: "Completed",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
      text: "text-green-500",
      icon: CheckCheck,
    },
    failed: {
      label: "Failed",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      text: "text-red-500",
      icon: X,
    },
  };

  const config = statusConfig[challenge.status];
  const StatusIcon = config.icon;

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Get day of week abbreviation
  const getDayAbbr = (dateStr: string) => {
    const date = new Date(dateStr);
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div
      className={`bg-card rounded-xl shadow-lg border p-5 ${config.bg} ${config.border} hover:border-opacity-40 transition-colors`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold">{challenge.name}</h3>
            <div
              className={`px-2 py-0.5 rounded-md text-xs font-medium ${config.bg} ${config.text}`}
            >
              <div className="flex items-center gap-1">
                <StatusIcon className="w-3 h-3" />
                {config.label}
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDate(challenge.startDate)} - {formatDate(challenge.endDate)} (4 days)
          </p>
        </div>

        {/* Join Code */}
        <Button
          variant="outline"
          size="sm"
          onClick={copyJoinCode}
          className="min-h-[36px]"
          title="Copy join code"
        >
          {copiedCode ? (
            <>
              <Check className="w-4 h-4 mr-1" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-1" />
              {challenge.joinCode}
            </>
          )}
        </Button>
      </div>

      {/* Participants */}
      {details && details.participants && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {details.participants.length} participant
              {details.participants.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {details.participants.slice(0, 8).map((participant) => (
              <div
                key={participant.userId}
                className="flex items-center gap-1"
                title={participant.username}
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src={participant.avatarUrl} alt={participant.username} />
                  <AvatarFallback className="text-xs">
                    {participant.username[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">{participant.username}</span>
              </div>
            ))}
            {details.participants.length > 8 && (
              <span className="text-xs text-muted-foreground">
                +{details.participants.length - 8} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Progress Grid */}
      {details && details.progressByUser && challenge.status !== "pending" && (
        <div className="space-y-2">
          <p className="text-sm font-medium mb-2">Daily Progress</p>
          <div className="grid gap-2">
            {details.participants.map((participant) => {
              const userProgress = details.progressByUser[participant.userId];
              return (
                <div key={participant.userId} className="flex items-center gap-2">
                  <Avatar className="w-6 h-6 shrink-0">
                    <AvatarImage src={participant.avatarUrl} alt={participant.username} />
                    <AvatarFallback className="text-xs">
                      {participant.username[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground w-20 truncate">
                    {participant.username}
                  </span>
                  <div className="flex gap-1 flex-1">
                    {challengeDates.map((date) => {
                      const dayProgress = userProgress?.[date];
                      const isCompleted = dayProgress?.completed;
                      const isFuture = date > today;
                      const isFailed =
                        challenge.status === "failed" &&
                        challenge.failedOn === date &&
                        challenge.failedByUserId === participant.userId;

                      return (
                        <div
                          key={date}
                          className="flex-1 h-8 rounded flex items-center justify-center border"
                          style={{
                            backgroundColor: isFailed
                              ? "rgba(239, 68, 68, 0.1)"
                              : isCompleted
                                ? "rgba(34, 197, 94, 0.1)"
                                : isFuture
                                  ? "rgba(107, 114, 128, 0.05)"
                                  : "rgba(249, 115, 22, 0.05)",
                            borderColor: isFailed
                              ? "rgba(239, 68, 68, 0.3)"
                              : isCompleted
                                ? "rgba(34, 197, 94, 0.3)"
                                : isFuture
                                  ? "rgba(107, 114, 128, 0.1)"
                                  : "rgba(249, 115, 22, 0.2)",
                          }}
                          title={`${getDayAbbr(date)} ${formatDate(date)}: ${isCompleted ? `${dayProgress.pomosCompleted} pomos` : isFuture ? "Not started" : "Incomplete"}`}
                        >
                          {isFailed ? (
                            <X className="w-4 h-4 text-red-500" />
                          ) : isCompleted ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Date labels */}
          <div className="flex items-center gap-2 mt-1">
            <div className="w-6 h-6 shrink-0" />
            <div className="w-20" />
            <div className="flex gap-1 flex-1">
              {challengeDates.map((date) => (
                <div key={date} className="flex-1 text-center">
                  <p className="text-xs text-muted-foreground">{getDayAbbr(date)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pending state message */}
      {challenge.status === "pending" && (
        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            Challenge starts on {formatDate(challenge.startDate)}. Share the join code to invite
            friends!
          </p>
        </div>
      )}

      {/* Failed message */}
      {challenge.status === "failed" && challenge.failedOn && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400 text-center">
            Challenge failed on {formatDate(challenge.failedOn)}
          </p>
        </div>
      )}

      {/* Completed message */}
      {challenge.status === "completed" && (
        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-sm text-green-600 dark:text-green-400 text-center font-medium">
            🎉 Challenge completed! Everyone earned the Team Player badge!
          </p>
        </div>
      )}
    </div>
  );
}
