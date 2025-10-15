"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "@/components/motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock, Award } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { FollowButton } from "@/components/FollowButton";
import { use } from "react";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { FocusGraph } from "@/components/FocusGraph";

interface PublicProfilePageProps {
  params: Promise<{ username: string }>;
}

// Helper to render Lucide icon from string name
const ChallengeIcon = ({ iconName, className }: { iconName: string; className?: string }) => {
  const Icon = (LucideIcons as unknown as Record<string, LucideIcon>)[iconName];
  if (!Icon) {
    return <Award className={className} />; // Fallback icon
  }
  return <Icon className={className} />;
};

export default function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = use(params);
  const profileData = useQuery(api.publicProfile.getPublicProfile, { username });
  const followCounts = useQuery(api.follows.getFollowCounts, { username });

  if (profileData === null) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">User not found</h1>
          <p className="text-muted-foreground mb-4">The user @{username} doesn&apos;t exist.</p>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Timer
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  if (!profileData) {
    return null; // Loading
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  return (
    <main className="min-h-screen px-4 pt-20 pb-8 sm:pt-24 sm:pb-12">
      <div className="max-w-4xl mx-auto">
        {/* Top navigation */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Timer
            </Button>
          </Link>

          {!profileData.isOwnProfile && <FollowButton username={username} />}
        </div>

        {/* Content based on access */}
        {!profileData.hasAccess ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-card rounded-2xl shadow-lg border border-border p-12 text-center"
          >
            <Lock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">This profile is private</h2>
            <p className="text-muted-foreground mb-4">
              {profileData.privacy === "private"
                ? `@${username} has a private profile.`
                : `Follow @${username} to see their activity.`}
            </p>
            {!profileData.isFollowing && profileData.privacy === "followers_only" && (
              <FollowButton username={username} />
            )}
          </motion.div>
        ) : (
          <>
            {/* Hero Section - Profile & Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-card rounded-2xl shadow-lg border border-border p-6 sm:p-8 mb-6"
            >
              {/* Profile Header with Total */}
              <div className="flex items-start gap-3 sm:gap-6">
                <Avatar className="w-12 h-12 sm:w-20 sm:h-20 shrink-0">
                  <AvatarImage src={profileData.avatarUrl} alt={profileData.username} />
                  <AvatarFallback className="text-lg sm:text-xl">
                    {profileData.username[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl sm:text-3xl font-bold mb-1 truncate">
                    {profileData.username}
                  </h1>
                  {profileData.bio && (
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2 truncate">
                      {profileData.bio}
                    </p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    {profileData.levelInfo && (
                      <div className="px-2 py-1 bg-orange-500/10 rounded-lg border border-orange-500/20">
                        <p className="text-xs sm:text-sm font-medium">
                          Level {profileData.levelInfo.currentLevel} · {profileData.levelInfo.title}
                        </p>
                      </div>
                    )}
                    {followCounts && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div>
                          <span className="font-bold text-foreground">
                            {followCounts.followers}
                          </span>{" "}
                          followers
                        </div>
                        <div>
                          <span className="font-bold text-foreground">
                            {followCounts.following}
                          </span>{" "}
                          following
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-3xl sm:text-5xl font-bold text-orange-600 dark:text-orange-400">
                    {profileData.stats?.total.count ?? 0}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                    Total Pomodoros
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                    {formatTime(profileData.stats?.total.minutes ?? 0)}
                  </p>
                </div>
              </div>

              {/* Level Progress */}
              {profileData.levelInfo && (
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-orange-500 rounded-lg">
                        <Award className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-sm font-medium">
                        {profileData.levelInfo.pomosForNextLevel -
                          (profileData.stats?.total.count ?? 0)}{" "}
                        pomos to Level {profileData.levelInfo.currentLevel + 1}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {profileData.stats?.total.count ?? 0} →{" "}
                      {profileData.levelInfo.pomosForNextLevel}
                    </p>
                  </div>
                  <div className="relative">
                    <div className="h-3 w-full overflow-visible rounded-full bg-muted/30">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background:
                            "linear-gradient(90deg, #fb923c 0%, rgba(249, 115, 22, 0.8) 100%)",
                          minWidth:
                            profileData.levelInfo.progress > 0 && profileData.levelInfo.progress < 5
                              ? "5%"
                              : "0%",
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${profileData.levelInfo.progress}%` }}
                        transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                      />
                    </div>
                    <motion.div
                      className="absolute -top-1 transform -translate-x-1/2"
                      initial={{ left: "0%", opacity: 0 }}
                      animate={{
                        left: `${Math.max(profileData.levelInfo.progress, 5)}%`,
                        opacity: 1,
                      }}
                      transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                    >
                      <div className="w-5 h-5 rounded-full bg-orange-600 border-2 border-background shadow-lg" />
                    </motion.div>
                  </div>
                </div>
              )}

              {/* Stats row - below level progress */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-border">
                <div className="flex flex-col items-center justify-center p-3 sm:p-4 bg-muted/30 rounded-xl border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">This Week</p>
                  <p className="text-2xl sm:text-3xl font-bold mb-0.5">
                    {profileData.stats?.week.count ?? 0}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {formatTime(profileData.stats?.week.minutes ?? 0)}
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center p-3 sm:p-4 bg-muted/30 rounded-xl border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">This Month</p>
                  <p className="text-2xl sm:text-3xl font-bold mb-0.5">
                    {profileData.stats?.month.count ?? 0}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {formatTime(profileData.stats?.month.minutes ?? 0)}
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center p-3 sm:p-4 bg-muted/30 rounded-xl border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">This Year</p>
                  <p className="text-2xl sm:text-3xl font-bold mb-0.5">
                    {profileData.stats?.year?.count ?? 0}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {formatTime(profileData.stats?.year?.minutes ?? 0)}
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center p-3 sm:p-4 bg-muted/30 rounded-xl border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Best Streak</p>
                  <p className="text-2xl sm:text-3xl font-bold mb-0.5">
                    {profileData.stats?.bestDailyStreak ?? 0}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {(profileData.stats?.bestDailyStreak ?? 0) === 1 ? "day" : "days"}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Focus Fitness */}
            {profileData.hasAccess &&
              "focusFitness" in profileData &&
              profileData.focusFitness &&
              profileData.focusFitness.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="bg-card rounded-2xl shadow-lg border border-border p-6 mb-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h2 className="text-lg font-bold mb-2">Focus Fitness</h2>
                      <p className="text-sm text-muted-foreground">
                        Focused days increase fitness. Days off cause it to drop.
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-4xl sm:text-5xl font-black text-orange-600 dark:text-orange-400">
                        {(() => {
                          const filteredData = (() => {
                            let lastMeaningfulIndex = profileData.focusFitness!.length - 1;
                            for (let i = profileData.focusFitness!.length - 1; i >= 0; i--) {
                              if (profileData.focusFitness![i].score >= 5) {
                                lastMeaningfulIndex = i;
                                break;
                              }
                            }
                            return profileData.focusFitness!.slice(0, lastMeaningfulIndex + 1);
                          })();
                          return filteredData[filteredData.length - 1]?.score || 0;
                        })()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Current</p>
                    </div>
                  </div>
                  <FocusGraph
                    data={(() => {
                      let lastMeaningfulIndex = profileData.focusFitness!.length - 1;
                      for (let i = profileData.focusFitness!.length - 1; i >= 0; i--) {
                        if (profileData.focusFitness![i].score >= 5) {
                          lastMeaningfulIndex = i;
                          break;
                        }
                      }
                      const minDataPoints = Math.min(30, profileData.focusFitness!.length);
                      const cutoffIndex = Math.max(lastMeaningfulIndex + 1, minDataPoints);
                      return profileData.focusFitness!.slice(0, cutoffIndex);
                    })()}
                  />
                </motion.div>
              )}

            {/* Activity Heatmap */}
            {profileData.activity && profileData.activity.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="bg-card rounded-2xl shadow-lg border border-border p-6 mb-6"
              >
                <h2 className="text-lg font-bold mb-4">Activity</h2>
                <ActivityHeatmap data={profileData.activity} />
              </motion.div>
            )}

            {/* Completed Challenges */}
            {profileData.hasAccess &&
              "completedChallengesDetails" in profileData &&
              profileData.completedChallengesDetails &&
              profileData.completedChallengesDetails.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="bg-card rounded-2xl shadow-lg border border-border p-6 mb-6"
                >
                  <div className="mb-4">
                    <h2 className="text-lg font-bold">Completed Challenges</h2>
                    <p className="text-sm text-muted-foreground">
                      {profileData.completedChallengesDetails.length} badge
                      {profileData.completedChallengesDetails.length !== 1 ? "s" : ""} earned
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {profileData.completedChallengesDetails.map((challenge, index) => (
                      <motion.div
                        key={challenge._id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{
                          duration: 0.4,
                          delay: index * 0.03,
                          ease: "easeOut",
                        }}
                        className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-xl border border-orange-500/20 hover:border-orange-500/40 transition-colors"
                      >
                        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-orange-500/20">
                          <ChallengeIcon
                            iconName={challenge.badge}
                            className="w-8 h-8 text-orange-500"
                          />
                        </div>
                        <h3 className="font-bold text-center text-sm">{challenge.name}</h3>
                        <p className="text-xs text-muted-foreground text-center">
                          {challenge.description}
                        </p>
                        {challenge.completedAt && (
                          <p className="text-xs text-orange-500">
                            {new Date(challenge.completedAt).toLocaleDateString()}
                          </p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

            {/* Recent Sessions */}
            {profileData.recentSessions && profileData.recentSessions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
                className="bg-card rounded-2xl shadow-lg border border-border p-6"
              >
                <h2 className="text-lg font-bold mb-4">Recent Sessions</h2>
                <div className="space-y-2">
                  {profileData.recentSessions
                    .filter((session) => session.mode === "focus")
                    .map((session) => {
                      const date = new Date(session.completedAt);
                      const isToday = date.toDateString() === new Date().toDateString();
                      const timeAgo = isToday
                        ? `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`
                        : date.toLocaleDateString();

                      return (
                        <div
                          key={session._id}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                            <div>
                              <p className="text-sm font-medium">
                                Focus Session
                                {session.tag && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    #{session.tag}
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">{timeAgo}</p>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{session.duration / 60}m</p>
                        </div>
                      );
                    })}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
