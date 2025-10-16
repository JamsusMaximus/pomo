"use client";

import { motion } from "@/components/motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Flame, Award } from "lucide-react";
import * as LucideIcons from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { LucideIcon } from "lucide-react";

interface FriendSession {
  tag?: string;
  duration: number;
  completedAt: number;
}

interface FriendChallenge {
  name: string;
  description: string;
  badge: string;
  completedAt?: number;
}

interface FriendData {
  _id: string;
  username: string;
  avatarUrl?: string;
  totalPomos: number;
  todayPomos: number;
  currentStreak: number;
  level: number;
  levelTitle: string;
  recentSessions: FriendSession[];
  latestChallenge: FriendChallenge | null;
}

interface FriendCardProps {
  friend: FriendData;
  index: number;
}

// Helper to render Lucide icon from string name
const ChallengeIcon = ({ iconName, className }: { iconName: string; className?: string }) => {
  const Icon = (LucideIcons as unknown as Record<string, LucideIcon>)[iconName];
  if (!Icon) {
    return <Award className={className} />; // Fallback icon
  }
  return <Icon className={className} />;
};

export function FriendCard({ friend, index }: FriendCardProps) {
  const isActiveToday = friend.todayPomos > 0;

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  };

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;

    // If timestamp is in the future (shouldn't happen but handle it), show "just now"
    if (diff < 0) {
      return "just now";
    }

    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link href={`/profile/${friend.username}`}>
        <div
          className={`group p-4 rounded-xl border transition-all hover:shadow-lg cursor-pointer ${
            isActiveToday
              ? "bg-card border-l-4 border-l-orange-500 border-t-border border-r-border border-b-border hover:border-orange-500/30"
              : "bg-card border-border hover:border-orange-500/20"
          }`}
        >
          {/* Top Row: Avatar, Name, Level, Stats */}
          <div className="flex items-start gap-4 mb-3">
            {/* Avatar */}
            <Avatar className="w-12 h-12 shrink-0">
              <AvatarImage src={friend.avatarUrl} alt={friend.username} />
              <AvatarFallback className="text-lg">
                {friend.username[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>

            {/* Name & Level */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold truncate group-hover:text-orange-500 transition-colors">
                  {friend.username}
                </h3>
                {isActiveToday && (
                  <>
                    <span className="flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-orange-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                    </span>
                    <span className="text-xs text-orange-500 font-medium">active today</span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Lv {friend.level} · {friend.levelTitle}
              </p>
            </div>

            {/* Stats Grid */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Today */}
              <div className="text-center">
                <p
                  className={`text-lg font-bold ${isActiveToday ? "text-orange-500" : "text-foreground"}`}
                >
                  {friend.todayPomos}
                </p>
                <p className="text-[10px] text-muted-foreground">today</p>
              </div>

              {/* Total */}
              <div className="text-center">
                <p className="text-lg font-bold">{friend.totalPomos}</p>
                <p className="text-[10px] text-muted-foreground">total</p>
              </div>

              {/* Streak */}
              {friend.currentStreak > 0 && (
                <div className="text-center flex flex-col items-center">
                  <div className="flex items-center gap-0.5">
                    <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                    <p className="text-lg font-bold text-orange-500">{friend.currentStreak}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">streak</p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section: Recent Sessions on Top, Latest Challenge on Bottom (mobile) / Side by Side (desktop) */}
          <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-4">
            {/* Recent Sessions */}
            <div className="flex-1 min-w-0">
              {friend.recentSessions.length > 0 ? (
                <div className="space-y-1.5">
                  {friend.recentSessions.map((session, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <span className="px-2 py-0.5 rounded-full bg-muted/50 w-30 break-words whitespace-normal">
                        {session.tag || "Untitled"}
                      </span>
                      <span>·</span>
                      <span className="shrink-0">{formatDuration(session.duration)}</span>
                      <span>·</span>
                      <span className="shrink-0 text-[10px]">
                        {formatRelativeTime(session.completedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No recent sessions</p>
              )}
            </div>

            {/* Latest Challenge */}
            <div className="w-full md:w-64 md:shrink-0">
              {friend.latestChallenge ? (
                <div className="flex items-start gap-3 px-3 py-2 bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-lg border border-orange-500/20">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/20 shrink-0">
                    <ChallengeIcon
                      iconName={friend.latestChallenge.badge}
                      className="w-4 h-4 text-orange-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <p className="text-xs font-medium text-orange-600 dark:text-orange-400">
                      {friend.latestChallenge.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {friend.latestChallenge.description}
                    </p>
                    {friend.latestChallenge.completedAt && (
                      <p className="text-[10px] text-muted-foreground">
                        {formatRelativeTime(friend.latestChallenge.completedAt)}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No challenges completed</p>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
