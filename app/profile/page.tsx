"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { loadSessions, getUnsyncedSessions, markSessionsSynced } from "@/lib/storage/sessions";

export default function ProfilePage() {
  const { user } = useUser();
  const stats = useQuery(api.stats.getStats);
  const activity = useQuery(api.stats.getActivity);
  const saveSession = useMutation(api.pomodoros.saveSession);
  const [isSyncing, setIsSyncing] = useState(false);
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
        {/* Back button and Debug info */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Timer
            </Button>
          </Link>

          {/* Debug: Local storage info */}
          {localStats.unsynced > 0 && (
            <Button variant="outline" size="sm" onClick={handleManualSync} disabled={isSyncing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
              Sync {localStats.unsynced} Local Sessions
            </Button>
          )}
        </div>

        {/* Debug info card */}
        {localStats.total > 0 && (
          <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6 text-sm">
            <p className="font-medium mb-1">Debug Info:</p>
            <p className="text-muted-foreground">
              • Local storage: {localStats.total} focus sessions
            </p>
            <p className="text-muted-foreground">• Unsynced: {localStats.unsynced}</p>
            <p className="text-muted-foreground">• Convex: {stats?.total.count || 0}</p>
          </div>
        )}

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-card rounded-2xl shadow-lg border border-border p-8 mb-8"
        >
          <div className="flex items-center gap-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={user.imageUrl} alt={user.username || "User"} />
              <AvatarFallback className="text-2xl">
                {user.username?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold mb-1">{user.username || "User"}</h1>
              <p className="text-muted-foreground">{user.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-card rounded-2xl shadow-lg border border-border p-8"
        >
          <h2 className="text-xl font-bold mb-6">Activity</h2>
          {activity ? (
            <ActivityHeatmap data={activity} />
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="animate-pulse text-muted-foreground">Loading activity...</div>
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
