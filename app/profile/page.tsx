/**
 * @fileoverview User profile page with stats, challenges, and activity visualization
 * @module app/profile/page
 *
 * Key responsibilities:
 * - Display user statistics (total, weekly, monthly, yearly pomodoros)
 * - Show daily and weekly streaks with visual indicators
 * - Render challenge progress (active and completed)
 * - Display activity heatmap and focus graph
 * - Provide sync controls for challenge progress
 * - Handle user sign-out
 *
 * Dependencies: Convex (stats/challenges), Clerk (auth), Framer Motion (animations)
 * Used by: Root layout (route "/profile")
 */

"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "@/components/motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { FocusGraph } from "@/components/FocusGraph";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  RefreshCw,
  Trash2,
  Database,
  Award,
  LogOut,
  Settings,
  Flame,
  Check,
  Star,
  Hourglass,
  type LucideIcon,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { loadSessions, getUnsyncedSessions, markSessionsSynced } from "@/lib/storage/sessions";
import { getLevelInfo, getLevelTitle } from "@/lib/levels";
import { useRouter } from "next/navigation";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ShareProfileButton } from "@/components/ShareProfileButton";
import { PrivacySettings } from "@/components/PrivacySettings";

// Helper to get week view data for Duolingo-style display
function getWeekViewData(activity: Array<{ date: string; count: number }> | undefined) {
  if (!activity) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekView = [];

  // Generate 7 days: last 5 days + today + next day
  for (let i = -5; i <= 1; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    const dayData = activity.find((a) => a.date === dateKey);
    const isToday = i === 0;
    const isFuture = i > 0;
    const hasPomodoro = dayData && dayData.count > 0;

    weekView.push({
      dayOfWeek: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][date.getDay()],
      date: dateKey,
      isToday,
      isFuture,
      completed: hasPomodoro && !isFuture,
    });
  }

  return weekView;
}

// Helper to render Lucide icon from string name
const ChallengeIcon = ({ iconName, className }: { iconName: string; className?: string }) => {
  const Icon = (LucideIcons as unknown as Record<string, LucideIcon>)[iconName];
  if (!Icon) {
    return <Award className={className} />; // Fallback icon
  }
  return <Icon className={className} />;
};

// Type for user challenge with progress
interface UserChallenge {
  _id: string;
  name: string;
  description: string;
  type: string;
  target: number;
  badge: string;
  progress: number;
  completedAt?: number;
  recurringMonth?: number;
}

function ProfilePageContent() {
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const router = useRouter();

  // Fitness period state (7 or 90 days) - only for UI filtering, not query parameter
  const [fitnessPeriod, setFitnessPeriod] = useState<7 | 90>(90);
  const [hasSetDefaultPeriod, setHasSetDefaultPeriod] = useState(false);

  // Single optimized query - always fetch 90 days, filter client-side
  const profileData = useQuery(api.profile.getProfileData, { fitnessPeriod: 90 });
  const syncProgress = useMutation(api.challenges.syncMyProgress);
  const saveSession = useMutation(api.pomodoros.saveSession);
  const longestFlow = useQuery(api.flowSessions.getLongestFlowSession);
  const currentUserData = useQuery(api.users.me);
  const followCounts = useQuery(api.follows.getFollowCounts, {
    username: user?.username || "",
  });

  // Debug: Log profile data
  useEffect(() => {
    if (profileData) {
      console.log("Profile data:", profileData);
      console.log("Streak breakdown:", {
        currentDailyStreak: profileData.stats.dailyStreak,
        bestDailyStreak: profileData.stats.bestDailyStreak,
        currentWeekPomos: profileData.stats.week.count,
      });
    }
  }, [profileData]);

  const seedTestData = useMutation(api.seed.seedTestData);
  const clearAllData = useMutation(api.seed.clearAllData);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isSyncingChallenges, setIsSyncingChallenges] = useState(false);
  const [localStats, setLocalStats] = useState({ total: 0, unsynced: 0 });
  const [hasAutoSynced, setHasAutoSynced] = useState(false);

  // Challenges expansion state
  const [showAllChallenges, setShowAllChallenges] = useState(false);

  // Determine default fitness period based on user age (only once)
  useEffect(() => {
    if (profileData?.stats.userCreatedAt && !hasSetDefaultPeriod) {
      const daysSinceCreation =
        (Date.now() - profileData.stats.userCreatedAt) / (1000 * 60 * 60 * 24);
      const defaultPeriod = daysSinceCreation <= 7 ? 7 : 90;
      setFitnessPeriod(defaultPeriod);
      setHasSetDefaultPeriod(true);
    }
  }, [profileData?.stats.userCreatedAt, hasSetDefaultPeriod]);

  // Auto-sync challenges on page load
  useEffect(() => {
    if (user && profileData && !hasAutoSynced) {
      console.log("Auto-syncing challenge progress...");
      setHasAutoSynced(true);
      syncProgress().catch((err) => {
        console.error("Auto-sync failed:", err);
      });
    }
  }, [user, profileData, hasAutoSynced, syncProgress]);

  // Check localStorage stats
  useEffect(() => {
    const allSessions = loadSessions();
    const unsyncedSessions = getUnsyncedSessions();
    const focusSessions = allSessions.filter((s) => s.mode === "focus");
    const unsyncedFocus = unsyncedSessions.filter((s) => s.mode === "focus");
    setLocalStats({ total: focusSessions.length, unsynced: unsyncedFocus.length });
  }, [isSyncing]);

  const handleManualSync = async () => {
    const unsyncedSessions = getUnsyncedSessions();
    if (unsyncedSessions.length === 0) {
      alert("No unsynced sessions to sync!");
      return;
    }

    setIsSyncing(true);
    console.log(`Manually syncing ${unsyncedSessions.length} sessions...`);

    try {
      await Promise.all(
        unsyncedSessions.map((session) =>
          saveSession({
            mode: session.mode,
            duration: session.duration,
            tag: session.tag,
            completedAt: session.completedAt,
          })
        )
      );

      markSessionsSynced(unsyncedSessions.map((s) => s.id));
      console.log("✅ Manual sync successful!");
      alert(`Successfully synced ${unsyncedSessions.length} sessions!`);
    } catch (error) {
      console.error("Failed to sync:", error);
      alert(`Sync failed: ${error}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSeedData = async () => {
    if (!confirm("Generate test pomodoros for the past 50 days with a 6-week streak?")) return;

    setIsSeeding(true);
    try {
      const result = await seedTestData();
      alert(`✅ ${result.message}\nGenerated ${result.count} pomodoros over ${result.days} days!`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      alert(`❌ Failed: ${message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearData = async () => {
    if (
      !confirm(
        "⚠️ This will delete ALL your pomodoro data from Convex. This cannot be undone. Are you sure?"
      )
    ) {
      return;
    }

    setIsClearing(true);
    try {
      const result = await clearAllData();
      alert(`✅ Deleted ${result.deleted} pomodoros`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      alert(`❌ Failed: ${message}`);
    } finally {
      setIsClearing(false);
    }
  };

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Please sign in</h1>
          <p className="text-muted-foreground">You need to be signed in to view your profile.</p>
        </div>
      </main>
    );
  }

  // Show nothing while profile data is loading (immediate render for speed)
  if (!profileData) {
    return null; // Render nothing - fast load
  }

  // Extract data from profile
  const { stats, activity, focusGraph, userChallenges, levelConfig } = profileData;

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  return (
    <main className="min-h-screen px-4 pt-6 md:pt-24 pb-20 md:pb-12">
      <div className="max-w-4xl mx-auto">
        {/* Top navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="min-h-[44px]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Timer
            </Button>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {/* Debug: Local storage info */}
            {localStats.unsynced > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="min-h-[44px]"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Sync {localStats.unsynced} Local Sessions</span>
                <span className="sm:hidden">Sync ({localStats.unsynced})</span>
              </Button>
            )}
            {user?.username && <ShareProfileButton username={user.username} />}
            {currentUserData && <PrivacySettings currentPrivacy={currentUserData.privacy} />}
            <Button
              variant="outline"
              size="sm"
              onClick={() => openUserProfile()}
              className="min-h-[44px]"
            >
              <Settings className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Manage Account</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut(() => router.push("/"))}
              className="min-h-[44px]"
            >
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>

        {/* Debug info card - Development only */}
        {process.env.NODE_ENV === "development" && (
          <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="font-medium text-sm">Debug & Test Data</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSeedData} disabled={isSeeding}>
                  <Database className={`w-4 h-4 mr-2 ${isSeeding ? "animate-pulse" : ""}`} />
                  {isSeeding ? "Seeding..." : "Seed 6-Week Streak"}
                </Button>
                {stats && stats.total.count > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleClearData}
                    disabled={isClearing}
                  >
                    <Trash2 className={`w-4 h-4 mr-2 ${isClearing ? "animate-pulse" : ""}`} />
                    Clear All
                  </Button>
                )}
              </div>
            </div>
            <div className="text-sm space-y-1">
              <p className="text-muted-foreground">
                • Local storage: {localStats.total} focus sessions
              </p>
              <p className="text-muted-foreground">• Unsynced: {localStats.unsynced}</p>
              <p className="text-muted-foreground">• Convex: {stats?.total.count || 0}</p>
            </div>
          </div>
        )}

        {/* Main Content - Two Column Layout */}
        {stats &&
          (() => {
            // Use database level config if available, otherwise fallback to lib
            const getLevelInfoFromDb = (pomos: number) => {
              if (!levelConfig || levelConfig.length === 0) {
                const info = getLevelInfo(pomos);
                return {
                  ...info,
                  title: getLevelTitle(info.currentLevel),
                };
              }

              let currentLevel = levelConfig[0];
              for (const level of levelConfig) {
                if (level.threshold <= pomos) {
                  currentLevel = level;
                } else {
                  break;
                }
              }

              const currentIndex = levelConfig.findIndex((l) => l.level === currentLevel.level);
              const nextLevel = levelConfig[currentIndex + 1];

              if (!nextLevel) {
                // Max level reached
                return {
                  currentLevel: currentLevel.level,
                  pomosForCurrentLevel: currentLevel.threshold,
                  pomosForNextLevel: currentLevel.threshold,
                  pomosRemaining: 0,
                  progress: 100,
                  title: currentLevel.title,
                };
              }

              const pomosInCurrentLevel = pomos - currentLevel.threshold;
              const pomosNeededForNextLevel = nextLevel.threshold - currentLevel.threshold;
              const progress = (pomosInCurrentLevel / pomosNeededForNextLevel) * 100;

              return {
                currentLevel: currentLevel.level,
                pomosForCurrentLevel: currentLevel.threshold,
                pomosForNextLevel: nextLevel.threshold,
                pomosRemaining: nextLevel.threshold - pomos,
                progress: Math.min(100, Math.max(0, progress)),
                title: currentLevel.title,
              };
            };

            const levelInfo = getLevelInfoFromDb(stats.total.count);
            const currentPomos = stats.total.count;
            const rangeStart = levelInfo.pomosForCurrentLevel;
            const rangeEnd = levelInfo.pomosForNextLevel;

            return (
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
                      <AvatarImage src={user.imageUrl} alt={user.username || "User"} />
                      <AvatarFallback className="text-lg sm:text-xl">
                        {user.username?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h1 className="text-xl sm:text-3xl font-bold mb-1 truncate">
                        {user.username || "User"}
                      </h1>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-2 truncate">
                        {user.primaryEmailAddress?.emailAddress}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="px-2 py-1 bg-orange-500/10 rounded-lg border border-orange-500/20">
                          <p className="text-xs sm:text-sm font-medium">
                            Level {levelInfo.currentLevel} · {levelInfo.title}
                          </p>
                        </div>
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
                        {currentPomos}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                        Total Pomodoros
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                        {formatTime(stats.total.minutes)}
                      </p>
                    </div>
                  </div>

                  {/* Level Progress */}
                  <div className="mt-6 pt-6 border-t border-border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-orange-500 rounded-lg">
                          <Award className="w-4 h-4 text-white" />
                        </div>
                        <p className="text-sm font-medium">
                          {levelInfo.pomosRemaining} pomos to Level {levelInfo.currentLevel + 1}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {rangeStart} → {rangeEnd}
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
                              levelInfo.progress > 0 && levelInfo.progress < 5 ? "5%" : "0%",
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${levelInfo.progress}%` }}
                          transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                        />
                      </div>
                      <motion.div
                        className="absolute -top-1 transform -translate-x-1/2"
                        initial={{ left: "0%", opacity: 0 }}
                        animate={{
                          left: `${Math.max(levelInfo.progress, 5)}%`,
                          opacity: 1,
                        }}
                        transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                      >
                        <div className="w-5 h-5 rounded-full bg-orange-600 border-2 border-background shadow-lg" />
                      </motion.div>
                    </div>
                  </div>
                </motion.div>

                {/* Duolingo-Style Daily Streak */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.05 }}
                  className="mb-6"
                >
                  <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-2xl shadow-lg border border-orange-500/20 p-6 relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      {/* Week view - LEFT SIDE */}
                      <div className="flex-1 w-full">
                        <div className="flex justify-around items-start gap-2 sm:gap-3">
                          {getWeekViewData(activity).map((day, index) => (
                            <motion.div
                              key={day.date}
                              className="flex flex-col items-center gap-2"
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{
                                delay: 0.05 + index * 0.2,
                                duration: 0.3,
                                ease: "easeOut",
                              }}
                            >
                              <span
                                className={`text-xs font-medium ${day.isToday ? "text-orange-500" : "text-muted-foreground"}`}
                              >
                                {day.dayOfWeek}
                              </span>
                              {day.isToday && day.completed ? (
                                <motion.div
                                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-500 flex items-center justify-center shadow-lg"
                                  initial={{ scale: 0 }}
                                  animate={{
                                    scale: [0, 1.2, 1],
                                    boxShadow: [
                                      "0 0 0 0 rgba(249, 115, 22, 0.4)",
                                      "0 0 0 10px rgba(249, 115, 22, 0)",
                                      "0 0 0 0 rgba(249, 115, 22, 0)",
                                    ],
                                  }}
                                  transition={{
                                    scale: {
                                      delay: 0.05 + index * 0.2,
                                      duration: 0.3,
                                      ease: "easeOut",
                                    },
                                    boxShadow: {
                                      delay: 0.05 + index * 0.2 + 0.3,
                                      duration: 2,
                                      ease: "easeOut",
                                      repeat: Infinity,
                                      repeatDelay: 2,
                                    },
                                  }}
                                >
                                  <Star className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-white" />
                                </motion.div>
                              ) : day.isToday ? (
                                <motion.div
                                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-muted/30 flex items-center justify-center border-2 border-dashed border-muted-foreground/40"
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{
                                    scale: [0, 1.1, 1],
                                    opacity: [0, 0.5, 0.7, 0.5],
                                  }}
                                  transition={{
                                    scale: {
                                      delay: 0.05 + index * 0.2,
                                      duration: 0.3,
                                      ease: "easeOut",
                                    },
                                    opacity: {
                                      delay: 0.05 + index * 0.2 + 0.3,
                                      duration: 2,
                                      ease: "easeInOut",
                                      repeat: Infinity,
                                      repeatType: "reverse",
                                    },
                                  }}
                                >
                                  <Hourglass className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground/60" />
                                </motion.div>
                              ) : day.completed ? (
                                <motion.div
                                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-500 flex items-center justify-center shadow-lg"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: [0, 1.2, 1] }}
                                  transition={{
                                    delay: 0.05 + index * 0.2,
                                    duration: 0.3,
                                    ease: "easeOut",
                                  }}
                                >
                                  <Check className="w-5 h-5 sm:w-6 sm:h-6 text-white stroke-[3]" />
                                </motion.div>
                              ) : (
                                <motion.div
                                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-muted/50 border-2 border-border"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: [0, 1.1, 1] }}
                                  transition={{
                                    delay: 0.05 + index * 0.2,
                                    duration: 0.3,
                                    ease: "easeOut",
                                  }}
                                />
                              )}
                            </motion.div>
                          ))}
                        </div>
                        {/* Encouragement text */}
                        <p className="text-center mt-4 text-xs sm:text-sm text-muted-foreground">
                          {stats.dailyStreak === 1 ? (
                            <>
                              A journey of a thousand miles begins with a{" "}
                              <span className="text-orange-500 font-semibold">single pomodoro</span>
                            </>
                          ) : stats.dailyStreak && stats.dailyStreak > 1 ? (
                            <>
                              Keep your{" "}
                              <span className="text-orange-500 font-semibold">perfect streak</span>{" "}
                              going!
                            </>
                          ) : (
                            <>
                              Complete a pomodoro to{" "}
                              <span className="text-orange-500 font-semibold">
                                start your streak
                              </span>
                            </>
                          )}
                        </p>
                      </div>

                      {/* Streak number and label - Centered on mobile, right-aligned on desktop */}
                      <div className="flex flex-col items-center sm:items-end shrink-0">
                        <motion.div
                          animate={{
                            scaleX: [1, 1.03, 0.97, 1.02, 0.98, 1.01, 1],
                            rotate: [0, -1, 0.5, -0.8, 1, -0.5, 0],
                            opacity: [1, 0.95, 0.97, 0.94, 0.96, 0.95, 1],
                          }}
                          transition={{
                            duration: 6,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        >
                          <Flame className="w-16 h-16 sm:w-20 sm:h-20 text-orange-500 fill-orange-500 mb-2" />
                        </motion.div>
                        <span
                          className={`font-black text-orange-600 dark:text-orange-400 ${
                            (stats.dailyStreak ?? 0) >= 100
                              ? "text-4xl sm:text-5xl"
                              : (stats.dailyStreak ?? 0) >= 10
                                ? "text-5xl sm:text-6xl"
                                : "text-6xl sm:text-7xl"
                          }`}
                        >
                          {stats.dailyStreak ?? 0}
                        </span>
                        <h2 className="text-lg sm:text-xl font-bold text-orange-500 mt-1">
                          day streak!
                        </h2>
                        {stats.bestDailyStreak !== undefined && stats.bestDailyStreak > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Best:{" "}
                            <span className="font-semibold text-orange-600 dark:text-orange-400">
                              {stats.bestDailyStreak}
                            </span>{" "}
                            {stats.bestDailyStreak === 1 ? "day" : "days"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Weekly Streak - Hidden for now (keeping backend logic) */}
                {false && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.08 }}
                    className="mb-6"
                  >
                    <div className="bg-gradient-to-br from-orange-500/5 to-orange-500/10 rounded-2xl shadow-lg border border-orange-500/20 p-5 relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex gap-1">
                            {Array.from({ length: Math.min(stats?.weeklyStreak ?? 0, 8) }).map(
                              (_, i) => (
                                <motion.div
                                  key={i}
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  transition={{
                                    delay: 0.1 + i * 0.1,
                                    duration: 0.5,
                                    type: "spring",
                                    stiffness: 200,
                                  }}
                                >
                                  <Flame className="w-6 h-6 sm:w-7 sm:h-7 text-orange-500 fill-orange-500" />
                                </motion.div>
                              )
                            )}
                            {(stats?.weeklyStreak ?? 0) > 8 && (
                              <span className="text-xl font-bold text-orange-500 ml-1">
                                +{(stats?.weeklyStreak ?? 0) - 8}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-4xl sm:text-5xl font-black text-orange-600 dark:text-orange-400">
                            {stats?.weeklyStreak ?? 0}
                          </p>
                          <p className="text-sm font-medium text-muted-foreground mt-1">
                            {(stats?.weeklyStreak ?? 0) === 1 ? "week in a row" : "weeks in a row"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {(stats?.weeklyStreak ?? 0) > 0 ? (
                              <>
                                <span className="font-semibold text-orange-600 dark:text-orange-400">
                                  {Math.min(stats?.week.count ?? 0, 5)}/5 pomos
                                </span>{" "}
                                this week
                                {(stats?.week.count ?? 0) < 5 && " - Keep it going! 🔥"}
                                {(stats?.week.count ?? 0) >= 5 && " - Streak secured! 🎉"}
                              </>
                            ) : (
                              <>
                                <span className="font-semibold">
                                  {stats?.week.count ?? 0}/5 pomos
                                </span>{" "}
                                this week
                                {(stats?.week.count ?? 0) === 0 && " - Start your streak today!"}
                                {(stats?.week.count ?? 0) > 0 &&
                                  (stats?.week.count ?? 0) < 5 &&
                                  " - Keep going!"}
                                {(stats?.week.count ?? 0) >= 5 &&
                                  " - Streak will start next week! 🚀"}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Focus Fitness */}
                {focusGraph && focusGraph.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="bg-card rounded-2xl shadow-lg border border-border p-6 mb-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-lg font-bold">Focus Fitness</h2>
                          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                            <button
                              type="button"
                              onClick={() => setFitnessPeriod(7)}
                              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                fitnessPeriod === 7
                                  ? "bg-orange-500 text-white"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              7 days
                            </button>
                            <button
                              type="button"
                              onClick={() => setFitnessPeriod(90)}
                              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                fitnessPeriod === 90
                                  ? "bg-orange-500 text-white"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              90 days
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Focused days increase your Focus Fitness. Days off, or unfocused days,
                          cause it to drop.
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-4xl sm:text-5xl font-black text-orange-600 dark:text-orange-400">
                          {(() => {
                            // Filter data based on selected period
                            const periodData =
                              fitnessPeriod === 7 ? focusGraph.slice(-7) : focusGraph;

                            const filteredData = (() => {
                              let lastMeaningfulIndex = periodData.length - 1;
                              for (let i = periodData.length - 1; i >= 0; i--) {
                                if (periodData[i].score >= 5) {
                                  lastMeaningfulIndex = i;
                                  break;
                                }
                              }
                              return periodData.slice(0, lastMeaningfulIndex + 1);
                            })();
                            return filteredData[filteredData.length - 1]?.score || 0;
                          })()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Current</p>
                      </div>
                    </div>
                    <FocusGraph
                      data={(() => {
                        // Filter data based on selected period
                        const periodData = fitnessPeriod === 7 ? focusGraph.slice(-7) : focusGraph;

                        // Find the last data point with meaningful score (> 5)
                        // This prevents showing the natural decay to near-zero at the end
                        let lastMeaningfulIndex = periodData.length - 1;
                        for (let i = periodData.length - 1; i >= 0; i--) {
                          if (periodData[i].score >= 5) {
                            lastMeaningfulIndex = i;
                            break;
                          }
                        }

                        // For 7-day view, show all data. For 90-day, show at least 30 days
                        const minDataPoints =
                          fitnessPeriod === 7 ? periodData.length : Math.min(30, periodData.length);
                        const cutoffIndex = Math.max(lastMeaningfulIndex + 1, minDataPoints);
                        return periodData.slice(0, cutoffIndex);
                      })()}
                    />
                  </motion.div>
                )}

                {/* Activity Heatmap with Stats */}
                {activity && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.15 }}
                    className="bg-card rounded-2xl shadow-lg border border-border p-6 mb-6"
                  >
                    <div className="space-y-4">
                      {/* Heatmap */}
                      <div>
                        <h2 className="text-lg font-bold mb-2">Activity Heatmap</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                          Your productivity patterns at a glance
                        </p>
                        <ActivityHeatmap data={activity} />
                      </div>

                      {/* Stats Row - 4 columns */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {/* This Week */}
                        <div className="flex flex-col items-center justify-center p-3 sm:p-4 bg-muted/30 rounded-xl border border-border">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            This Week
                          </p>
                          <p className="text-2xl sm:text-3xl font-bold mb-0.5">
                            {stats?.week.count ?? 0}
                          </p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {formatTime(stats?.week.minutes ?? 0)}
                          </p>
                        </div>

                        {/* This Month */}
                        <div className="flex flex-col items-center justify-center p-3 sm:p-4 bg-muted/30 rounded-xl border border-border">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            This Month
                          </p>
                          <p className="text-2xl sm:text-3xl font-bold mb-0.5">
                            {stats.month.count}
                          </p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {formatTime(stats.month.minutes)}
                          </p>
                        </div>

                        {/* This Year */}
                        <div className="flex flex-col items-center justify-center p-3 sm:p-4 bg-muted/30 rounded-xl border border-border">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            This Year
                          </p>
                          <p className="text-2xl sm:text-3xl font-bold mb-0.5">
                            {stats.year.count}
                          </p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {formatTime(stats.year.minutes)}
                          </p>
                        </div>

                        {/* Longest Flow */}
                        <div className="flex flex-col items-center justify-center p-3 sm:p-4 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl border border-orange-500/30">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Longest Flow
                          </p>
                          <p className="text-2xl sm:text-3xl font-bold mb-0.5 text-orange-600 dark:text-orange-400">
                            {longestFlow?.completedPomos ?? 0}
                          </p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            pomos in a row
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Challenges Section */}
                {userChallenges && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.25 }}
                    className="space-y-6"
                  >
                    {/* Active Challenges */}
                    {userChallenges.active.length > 0 && (
                      <div className="bg-card rounded-2xl shadow-lg border border-border p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h2 className="text-lg font-bold">Active Challenges</h2>
                            <p className="text-sm text-muted-foreground">
                              {userChallenges.active.length} challenge
                              {userChallenges.active.length !== 1 ? "s" : ""} in progress
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              setIsSyncingChallenges(true);
                              await syncProgress();
                              setIsSyncingChallenges(false);
                            }}
                            disabled={isSyncingChallenges}
                          >
                            <RefreshCw
                              className={`w-4 h-4 mr-2 ${isSyncingChallenges ? "animate-spin" : ""}`}
                            />
                            Sync Progress
                          </Button>
                        </div>
                        <div className="space-y-3 relative">
                          {userChallenges.active
                            .sort((a: UserChallenge, b: UserChallenge) => {
                              // Sort by progress percentage (highest first)
                              const aPercent = (a.progress / a.target) * 100;
                              const bPercent = (b.progress / b.target) * 100;
                              return bPercent - aPercent;
                            })
                            .slice(0, showAllChallenges ? undefined : 4)
                            .map((challenge: UserChallenge, index: number) => {
                              const percentage = Math.round(
                                (challenge.progress / challenge.target) * 100
                              );
                              const isBlurred = !showAllChallenges && index === 3;
                              return (
                                <motion.div
                                  key={challenge._id}
                                  initial={{ opacity: 0, x: -20 }}
                                  whileInView={{ opacity: 1, x: 0 }}
                                  viewport={{ once: true, margin: "-50px" }}
                                  transition={{ duration: 0.4, delay: index * 0.05 }}
                                  className={`flex items-center gap-4 p-4 bg-muted/30 rounded-xl border border-border hover:border-orange-500/30 transition-colors relative ${
                                    isBlurred ? "blur-[3px]" : ""
                                  }`}
                                >
                                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-500/10">
                                    <ChallengeIcon
                                      iconName={challenge.badge}
                                      className="w-6 h-6 text-orange-500"
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <h3 className="font-bold">{challenge.name}</h3>
                                      <span className="text-sm font-bold text-orange-500">
                                        {percentage}%
                                      </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      {challenge.description}
                                    </p>
                                    <div className="mt-2">
                                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                        <span>
                                          {challenge.progress} / {challenge.target}{" "}
                                          {challenge.type === "streak" ? "days" : "pomodoros"}
                                        </span>
                                        <span>
                                          {challenge.target - challenge.progress} remaining
                                        </span>
                                      </div>
                                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <motion.div
                                          className="h-full"
                                          style={{
                                            background:
                                              "linear-gradient(90deg, #fb923c 0%, rgba(249, 115, 22, 0.8) 100%)",
                                          }}
                                          initial={{ width: 0 }}
                                          whileInView={{ width: `${Math.min(percentage, 100)}%` }}
                                          viewport={{ once: true, margin: "-50px" }}
                                          transition={{
                                            duration: 1,
                                            delay: index * 0.05 + 0.2,
                                            ease: "easeOut",
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}

                          {/* See all challenges button - centered over 4th challenge */}
                          {!showAllChallenges && userChallenges.active.length > 3 && (
                            <div className="absolute bottom-0 left-0 right-0 h-[110px] flex items-center justify-center pointer-events-none">
                              <Button
                                variant="outline"
                                className="border-orange-500/30 hover:bg-orange-500/10 hover:border-orange-500 bg-card/95 backdrop-blur-sm pointer-events-auto shadow-lg"
                                onClick={() => setShowAllChallenges(true)}
                              >
                                See all {userChallenges.active.length} challenges
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Completed Challenges */}
                    {userChallenges.completed.length > 0 && (
                      <div className="bg-card rounded-2xl shadow-lg border border-border p-6">
                        <div className="mb-4">
                          <h2 className="text-lg font-bold">Completed Challenges</h2>
                          <p className="text-sm text-muted-foreground">
                            {userChallenges.completed.length} badge
                            {userChallenges.completed.length !== 1 ? "s" : ""} earned
                          </p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {userChallenges.completed.map(
                            (challenge: UserChallenge, index: number) => (
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
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* Empty State */}
                    {userChallenges.active.length === 0 &&
                      userChallenges.completed.length === 0 && (
                        <div className="bg-card rounded-2xl shadow-lg border border-border p-12 text-center">
                          <Award className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-bold mb-2">No Challenges Yet</h3>
                          <p className="text-sm text-muted-foreground">
                            Complete your first pomodoro to start earning badges!
                          </p>
                        </div>
                      )}
                  </motion.div>
                )}
              </>
            );
          })()}
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <ErrorBoundary
      fallbackTitle="Profile Error"
      fallbackMessage="An error occurred while loading your profile. Please refresh the page."
    >
      <ProfilePageContent />
    </ErrorBoundary>
  );
}
