"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "@/components/motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock, Users, Globe } from "lucide-react";
import Link from "next/link";
import { FollowButton } from "@/components/FollowButton";
import { use } from "react";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { FocusGraph } from "@/components/FocusGraph";

interface PublicProfilePageProps {
  params: Promise<{ username: string }>;
}

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

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case "public":
        return <Globe className="w-4 h-4" />;
      case "followers_only":
        return <Users className="w-4 h-4" />;
      case "private":
        return <Lock className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const getPrivacyLabel = (privacy: string) => {
    switch (privacy) {
      case "public":
        return "Public";
      case "followers_only":
        return "Followers Only";
      case "private":
        return "Private";
      default:
        return "Followers Only";
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 sm:py-12">
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

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-card rounded-2xl shadow-lg border border-border p-6 sm:p-8 mb-6"
        >
          <div className="flex items-start gap-4 sm:gap-6">
            <Avatar className="w-16 h-16 sm:w-24 sm:h-24 shrink-0">
              <AvatarImage src={profileData.avatarUrl} alt={profileData.username} />
              <AvatarFallback className="text-2xl sm:text-3xl">
                {profileData.username[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold mb-1 truncate">
                @{profileData.username}
              </h1>
              {profileData.bio && (
                <p className="text-sm text-muted-foreground mb-3">{profileData.bio}</p>
              )}
              <div className="flex items-center gap-4 flex-wrap mb-3">
                <div className="flex items-center gap-2 text-sm">
                  {getPrivacyIcon(profileData.privacy)}
                  <span className="text-muted-foreground">
                    {getPrivacyLabel(profileData.privacy)}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="font-bold">{followCounts?.followers ?? 0}</span>{" "}
                    <span className="text-muted-foreground">followers</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-bold">{followCounts?.following ?? 0}</span>{" "}
                    <span className="text-muted-foreground">following</span>
                  </div>
                </div>
              </div>
              {profileData.hasAccess && profileData.levelInfo && (
                <div className="flex items-center gap-3 flex-wrap text-sm">
                  <div className="px-3 py-1 bg-orange-500/10 rounded-lg border border-orange-500/20">
                    <span className="font-medium">
                      Level {profileData.levelInfo.currentLevel} · {profileData.levelInfo.title}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    <span className="font-bold text-foreground">
                      {profileData.challengesCompleted ?? 0}
                    </span>{" "}
                    challenges completed
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

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
            {/* Stats Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
            >
              <div className="bg-card rounded-xl shadow-lg border border-border p-4 text-center">
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {profileData.stats?.total.count ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Total Pomodoros</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatTime(profileData.stats?.total.minutes ?? 0)}
                </p>
              </div>

              <div className="bg-card rounded-xl shadow-lg border border-border p-4 text-center">
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {profileData.stats?.dailyStreak ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Day Streak</p>
                {profileData.stats?.bestDailyStreak !== undefined && (
                  <p className="text-[10px] text-muted-foreground">
                    Best: {profileData.stats.bestDailyStreak}
                  </p>
                )}
              </div>

              <div className="bg-card rounded-xl shadow-lg border border-border p-4 text-center">
                <p className="text-3xl font-bold">{profileData.stats?.week.count ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">This Week</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatTime(profileData.stats?.week.minutes ?? 0)}
                </p>
              </div>

              <div className="bg-card rounded-xl shadow-lg border border-border p-4 text-center">
                <p className="text-3xl font-bold">{profileData.stats?.month.count ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">This Month</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatTime(profileData.stats?.month.minutes ?? 0)}
                </p>
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
                  transition={{ duration: 0.4, delay: 0.15 }}
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

            {/* Recent Sessions */}
            {profileData.recentSessions && profileData.recentSessions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
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
