"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { FocusGraph } from "@/components/FocusGraph";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Trash2, Database, Award, LogOut, Settings, Flame, Check, Star } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { loadSessions, getUnsyncedSessions, markSessionsSynced } from "@/lib/storage/sessions";
import { getLevelInfo, getLevelTitle } from "@/lib/levels";
import { useRouter } from "next/navigation";

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

export default function ProfilePage() {
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const router = useRouter();
  const stats = useQuery(api.stats.getStats);
  const activity = useQuery(api.stats.getActivity);
  const focusGraph = useQuery(api.stats.getFocusGraph);
  const saveSession = useMutation(api.pomodoros.saveSession);

  // Debug: Log stats to see what we're getting
  useEffect(() => {
    if (stats) {
      console.log("Stats data:", stats);
    }
  }, [stats]);
  const seedTestData = useMutation(api.seed.seedTestData);
  const clearAllData = useMutation(api.seed.clearAllData);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [localStats, setLocalStats] = useState({ total: 0, unsynced: 0 });

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
    if (!confirm("Generate test pomodoros for the past 40 days?")) return;

    setIsSeeding(true);
    try {
      const result = await seedTestData();
      alert(`✅ Generated ${result.count} pomodoros over ${result.days} days!`);
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

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
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

          <div className="flex items-center gap-2">
            {/* Debug: Local storage info */}
            {localStats.unsynced > 0 && (
              <Button variant="outline" size="sm" onClick={handleManualSync} disabled={isSyncing}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                Sync {localStats.unsynced} Local Sessions
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => openUserProfile()}>
              <Settings className="w-4 h-4 mr-2" />
              Manage Account
            </Button>
            <Button variant="outline" size="sm" onClick={() => signOut(() => router.push("/"))}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
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
                  {isSeeding ? "Seeding..." : "Seed 40 Days"}
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
            const levelInfo = getLevelInfo(stats.total.count);
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
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                    <Avatar className="w-16 h-16 sm:w-20 sm:h-20">
                      <AvatarImage src={user.imageUrl} alt={user.username || "User"} />
                      <AvatarFallback className="text-xl">
                        {user.username?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h1 className="text-2xl sm:text-3xl font-bold mb-1">{user.username || "User"}</h1>
                      <p className="text-sm text-muted-foreground mb-2">
                        {user.primaryEmailAddress?.emailAddress}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="px-2 py-1 bg-orange-500/10 rounded-lg border border-orange-500/20">
                          <p className="text-sm font-medium">
                            Level {levelInfo.currentLevel} · {getLevelTitle(levelInfo.currentLevel)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-4xl sm:text-5xl font-bold text-orange-600 dark:text-orange-400">
                        {currentPomos}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Pomodoros</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatTime(stats.total.minutes)}</p>
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
                      <div className="h-3 w-full overflow-hidden rounded-full bg-muted/30">
                        <div
                          className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-500"
                          style={{ width: `${levelInfo.progress}%` }}
                        />
                      </div>
                      <div
                        className="absolute -top-1 transform -translate-x-1/2"
                        style={{ left: `${levelInfo.progress}%` }}
                      >
                        <div className="w-5 h-5 rounded-full bg-orange-600 border-2 border-background shadow-lg" />
                      </div>
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
                  <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-2xl shadow-xl border border-orange-500/20 p-6 sm:p-8 relative overflow-hidden">
                    <div className="absolute -top-8 -right-8 opacity-5">
                      <Flame className="w-64 h-64" />
                    </div>
                    <div className="relative z-10">
                      {/* Flame icon with number inside */}
                      <div className="flex flex-col items-center mb-5">
                        <div className="relative mb-3">
                          <Flame className="w-32 h-32 sm:w-36 sm:h-36 text-orange-500 fill-orange-500" />
                          <div className="absolute inset-0 flex items-center justify-center" style={{ paddingTop: "0.15em" }}>
                            <span className={`font-black text-white ${
                              (stats.dailyStreak ?? 0) >= 100 ? "text-3xl sm:text-4xl" : 
                              (stats.dailyStreak ?? 0) >= 10 ? "text-4xl sm:text-5xl" : 
                              "text-5xl sm:text-6xl"
                            }`}>
                              {stats.dailyStreak ?? 0}
                            </span>
                          </div>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-orange-500">day streak!</h2>
                      </div>

                      {/* Week view */}
                      <div className="bg-background/50 rounded-xl p-4 backdrop-blur-sm">
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
                              <span className={`text-xs font-medium ${day.isToday ? "text-orange-500" : "text-muted-foreground"}`}>
                                {day.dayOfWeek}
                              </span>
                              {day.isToday && day.completed ? (
                                <motion.div
                                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-500 flex items-center justify-center shadow-lg"
                                  initial={{ scale: 0 }}
                                  animate={{
                                    scale: [0, 1.2, 1],
                                    boxShadow: [
                                      "0 0 0 0 rgba(249, 115, 22, 0.6)",
                                      "0 0 0 12px rgba(249, 115, 22, 0)",
                                      "0 0 0 0 rgba(249, 115, 22, 0.4)",
                                      "0 0 0 8px rgba(249, 115, 22, 0)",
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
                                      delay: 0.05 + index * 0.2,
                                      duration: 0.6,
                                      ease: "easeOut",
                                      repeat: Infinity,
                                      repeatDelay: 1.4,
                                    },
                                  }}
                                >
                                  <Star className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-white" />
                                </motion.div>
                              ) : day.isToday ? (
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
                                  <Star className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-white" />
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
                      </div>

                      {/* Encouragement text */}
                      <p className="text-center mt-5 text-sm text-muted-foreground">
                        {stats.dailyStreak && stats.dailyStreak > 0 ? (
                          <>
                            Great start! Keep your{" "}
                            <span className="text-orange-500 font-semibold">perfect streak</span> going tomorrow.
                          </>
                        ) : (
                          <>
                            Start your streak today! Complete a pomodoro to{" "}
                            <span className="text-orange-500 font-semibold">begin your journey</span>.
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Weekly Streak - Smaller */}
                  <div className="mt-4 bg-card rounded-xl shadow-md border border-border p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-500/10 rounded-lg">
                        <Flame className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Weekly Streak</p>
                        <p className="text-xs text-muted-foreground">
                          {(stats.weeklyStreak ?? 0) === 1 ? "1 week" : `${stats.weeklyStreak ?? 0} weeks`} with 5+ pomos
                        </p>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                      {stats.weeklyStreak ?? 0}
                    </p>
                  </div>
                </motion.div>

                {/* Focus Fitness */}
                {focusGraph && focusGraph.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="bg-card rounded-2xl shadow-lg border border-border p-6 mb-6"
                  >
                    <h2 className="text-lg font-bold mb-2">Focus Fitness</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      90-day productivity trend using Strava's fitness algorithm
                    </p>
                    <FocusGraph data={focusGraph} />
                  </motion.div>
                )}

                {/* Stats Grid */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
                >
                  {/* This Week */}
                  <div className="bg-card rounded-2xl shadow-lg border border-border p-6">
                    <p className="text-sm font-medium text-muted-foreground mb-2">This Week</p>
                    <p className="text-3xl font-bold mb-1">{stats.week.count}</p>
                    <p className="text-sm text-muted-foreground">{formatTime(stats.week.minutes)}</p>
                  </div>

                  {/* This Month */}
                  <div className="bg-card rounded-2xl shadow-lg border border-border p-6">
                    <p className="text-sm font-medium text-muted-foreground mb-2">This Month</p>
                    <p className="text-3xl font-bold mb-1">{stats.month.count}</p>
                    <p className="text-sm text-muted-foreground">{formatTime(stats.month.minutes)}</p>
                  </div>

                  {/* This Year */}
                  <div className="bg-card rounded-2xl shadow-lg border border-border p-6">
                    <p className="text-sm font-medium text-muted-foreground mb-2">This Year</p>
                    <p className="text-3xl font-bold mb-1">{stats.year.count}</p>
                    <p className="text-sm text-muted-foreground">{formatTime(stats.year.minutes)}</p>
                  </div>
                </motion.div>

                {/* Activity Heatmap */}
                {activity && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    className="bg-card rounded-2xl shadow-lg border border-border p-6"
                  >
                    <h2 className="text-lg font-bold mb-2">Activity Heatmap</h2>
                    <p className="text-sm text-muted-foreground mb-4">Your productivity patterns at a glance</p>
                    <ActivityHeatmap data={activity} />
                  </motion.div>
                )}
              </>
            );
          })()}
      </div>
    </main>
  );
}
