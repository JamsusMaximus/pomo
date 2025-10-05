"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Trash2, Database, Award, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { loadSessions, getUnsyncedSessions, markSessionsSynced } from "@/lib/storage/sessions";
import { getLevelInfo, getLevelTitle } from "@/lib/levels";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const router = useRouter();
  const stats = useQuery(api.stats.getStats);
  const activity = useQuery(api.stats.getActivity);
  const saveSession = useMutation(api.pomodoros.saveSession);
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

        {/* Combined Profile & Level Card */}
        {stats &&
          (() => {
            const levelInfo = getLevelInfo(stats.total.count);
            const currentPomos = stats.total.count;
            const rangeStart = levelInfo.pomosForCurrentLevel;
            const rangeEnd = levelInfo.pomosForNextLevel;

            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-card rounded-2xl shadow-lg border border-border p-8 mb-8"
              >
                {/* Profile Section */}
                <div className="flex items-center gap-6 pb-6 mb-6 border-b border-border">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={user.imageUrl} alt={user.username || "User"} />
                    <AvatarFallback className="text-xl">
                      {user.username?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold mb-1">{user.username || "User"}</h1>
                    <p className="text-sm text-muted-foreground">
                      {user.primaryEmailAddress?.emailAddress}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                      {currentPomos}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Pomodoros</p>
                  </div>
                </div>

                {/* Level Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-orange-500 rounded-xl">
                      <Award className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">
                        Level {levelInfo.currentLevel} · {getLevelTitle(levelInfo.currentLevel)}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {levelInfo.pomosRemaining} pomodoros to Level {levelInfo.currentLevel + 1}
                      </p>
                    </div>
                  </div>

                  {/* Linear range progress bar with position marker */}
                  <div className="relative pt-6">
                    {/* Current position marker */}
                    <div
                      className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center z-10"
                      style={{ left: `${levelInfo.progress}%` }}
                    >
                      <div className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-1">
                        {currentPomos}
                      </div>
                      <div className="w-0.5 h-4 bg-orange-600 dark:bg-orange-400"></div>
                    </div>

                    {/* XP progress bar */}
                    <div className="relative h-5 w-full overflow-hidden rounded-full bg-muted/30 border border-border">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-500 ease-out"
                        style={{ width: `${levelInfo.progress}%` }}
                      />
                    </div>

                    {/* Range labels */}
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span className="font-medium">{rangeStart}</span>
                      <span className="font-medium">{rangeEnd}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })()}

        {/* Streaks */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid grid-cols-2 gap-4 mb-8"
          >
            {/* Daily Streak */}
            <div className="bg-card rounded-2xl shadow-lg border border-border p-6 relative overflow-hidden">
              <div className="absolute top-4 right-4 text-6xl opacity-10">🔥</div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Daily Streak</h3>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold">{stats.dailyStreak}</p>
                <span className="text-2xl">🔥</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {stats.dailyStreak === 1 ? "day" : "days"} in a row
              </p>
            </div>

            {/* Weekly Streak */}
            <div className="bg-card rounded-2xl shadow-lg border border-border p-6 relative overflow-hidden">
              <div className="absolute top-4 right-4 text-6xl opacity-10">🔥</div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Weekly Streak</h3>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold">{stats.weeklyStreak}</p>
                <span className="text-2xl">🔥</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {stats.weeklyStreak === 1 ? "week" : "weeks"} with 5+ pomos
              </p>
            </div>
          </motion.div>
        )}

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {/* All Time */}
          <div className="bg-card rounded-2xl shadow-lg border border-border p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">All Time</h3>
            <p className="text-3xl font-bold mb-1">{stats?.total.count || 0}</p>
            <p className="text-sm text-muted-foreground">{formatTime(stats?.total.minutes || 0)}</p>
          </div>

          {/* This Week */}
          <div className="bg-card rounded-2xl shadow-lg border border-border p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">This Week</h3>
            <p className="text-3xl font-bold mb-1">{stats?.week.count || 0}</p>
            <p className="text-sm text-muted-foreground">{formatTime(stats?.week.minutes || 0)}</p>
          </div>

          {/* This Month */}
          <div className="bg-card rounded-2xl shadow-lg border border-border p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">This Month</h3>
            <p className="text-3xl font-bold mb-1">{stats?.month.count || 0}</p>
            <p className="text-sm text-muted-foreground">{formatTime(stats?.month.minutes || 0)}</p>
          </div>

          {/* This Year */}
          <div className="bg-card rounded-2xl shadow-lg border border-border p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">This Year</h3>
            <p className="text-3xl font-bold mb-1">{stats?.year.count || 0}</p>
            <p className="text-sm text-muted-foreground">{formatTime(stats?.year.minutes || 0)}</p>
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
            <h2 className="text-xl font-bold mb-4">Activity Heatmap</h2>
            <ActivityHeatmap data={activity} />
          </motion.div>
        )}
      </div>
    </main>
  );
}
