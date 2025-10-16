"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft, User, Trash2, Database, RefreshCw, Award, Power, PowerOff } from "lucide-react";
import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

export default function AdminPage() {
  const { user } = useUser();
  const { signOut, openSignIn } = useClerk();
  const stats = useQuery(api.stats.getStats);
  const allChallenges = useQuery(api.challenges.getAllChallenges);

  const seedTestData = useMutation(api.seed.seedTestData);
  const seedMinimalData = useMutation(api.seed.seedMinimalData);
  const clearAllData = useMutation(api.seed.clearAllData);
  const syncProgress = useMutation(api.challenges.syncMyProgress);
  const toggleChallengeActive = useMutation(api.challenges.toggleChallengeActive);

  const [isSeeding, setIsSeeding] = useState(false);
  const [isSeedingMinimal, setIsSeedingMinimal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [togglingChallengeId, setTogglingChallengeId] = useState<Id<"challenges"> | null>(null);

  const handleSignOut = async () => {
    await signOut();
    // Optionally redirect or show sign in modal
    setTimeout(() => openSignIn(), 100);
  };

  const handleSeedFull = async () => {
    if (!confirm("This will add test data (50 days of pomodoros). Continue?")) return;
    setIsSeeding(true);
    try {
      const result = await seedTestData();
      alert(`✅ Seeded ${result.count} pomodoros over ${result.days} days\n${result.message}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      alert(`❌ Failed: ${message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSeedMinimal = async () => {
    if (!confirm("This will add 1 test pomodoro from today. Continue?")) return;
    setIsSeedingMinimal(true);
    try {
      const result = await seedMinimalData();
      alert(`✅ ${result.message}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      alert(`❌ Failed: ${message}`);
    } finally {
      setIsSeedingMinimal(false);
    }
  };

  const handleClear = async () => {
    if (!confirm("⚠️ This will DELETE ALL your pomodoro data and challenges. Are you sure?"))
      return;
    setIsClearing(true);
    try {
      const result = await clearAllData();
      alert(`✅ Deleted ${result.deleted} pomodoros and ${result.challengesDeleted} challenges`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      alert(`❌ Failed: ${message}`);
    } finally {
      setIsClearing(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncProgress();
      alert(`✅ ${result.message}: ${result.challenges} challenges synced`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      alert(`❌ Failed: ${message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleChallenge = async (challengeId: Id<"challenges">) => {
    setTogglingChallengeId(challengeId);
    try {
      await toggleChallengeActive({ challengeId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      alert(`❌ Failed to toggle challenge: ${message}`);
    } finally {
      setTogglingChallengeId(null);
    }
  };

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Please sign in</h1>
          <p className="text-muted-foreground mb-4">
            You need to be signed in to access the admin panel.
          </p>
          <Button onClick={() => openSignIn()}>Sign In</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 pt-20 pb-8 sm:pt-24 sm:pb-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/">
              <Button variant="ghost" size="sm" className="min-h-[44px]">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Timer
              </Button>
            </Link>
            <h1 className="text-3xl font-bold mt-4">Admin Panel</h1>
            <p className="text-muted-foreground">
              Development tools for account and data management
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Current User Card */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Current Account
            </h2>
            <div className="space-y-2 mb-4">
              <p className="text-sm">
                <span className="text-muted-foreground">Email:</span>{" "}
                <span className="font-mono font-semibold">
                  {user.primaryEmailAddress?.emailAddress}
                </span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Username:</span>{" "}
                <span className="font-semibold">{user.username || "Not set"}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Clerk ID:</span>{" "}
                <span className="font-mono text-xs">{user.id}</span>
              </p>
              {stats && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Total Pomodoros:</span>{" "}
                  <span className="font-semibold">{stats.total.count}</span>
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSignOut} variant="outline">
                Sign Out & Switch Account
              </Button>
              <Link href="/profile">
                <Button variant="outline">View Profile</Button>
              </Link>
            </div>
          </Card>

          {/* Test Accounts Card */}
          <Card className="p-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <h2 className="text-xl font-bold mb-3">Test Accounts</h2>
            <div className="space-y-3 mb-4">
              <div className="p-3 bg-white dark:bg-slate-900 rounded border">
                <p className="font-semibold text-sm mb-1">Main Account</p>
                <p className="font-mono text-xs text-muted-foreground">jddmcaulay@gmail.com</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your primary development account
                </p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded border">
                <p className="font-semibold text-sm mb-1">Test Account (Fresh User)</p>
                <p className="font-mono text-xs text-muted-foreground">
                  Create a second Clerk account
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create a test email in Clerk dashboard, then use &quot;Seed Minimal Data&quot;
                  below
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded p-3 text-sm">
              <p className="font-semibold mb-2">How to Switch Accounts:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground">
                <li>Click &quot;Sign Out & Switch Account&quot; above</li>
                <li>Sign in with the account you want to test</li>
                <li>Use the data management tools below to set up test data</li>
                <li>Return to this page to switch back</li>
              </ol>
            </div>
          </Card>

          {/* Data Management Card */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Database className="w-5 h-5" />
              Data Management
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2 text-sm">Seed Minimal Data</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Adds 1 pomodoro from today. Perfect for testing fresh user experience.
                </p>
                <Button
                  onClick={handleSeedMinimal}
                  disabled={isSeedingMinimal}
                  size="sm"
                  className="w-full"
                >
                  {isSeedingMinimal ? "Seeding..." : "Seed 1 Pomodoro"}
                </Button>
              </div>

              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2 text-sm">Seed Full Test Data</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Adds 50 days of data with a 6-week streak. Great for testing stats & graphs.
                </p>
                <Button
                  onClick={handleSeedFull}
                  disabled={isSeeding}
                  size="sm"
                  className="w-full"
                  variant="secondary"
                >
                  {isSeeding ? "Seeding..." : "Seed Full Data"}
                </Button>
              </div>

              <div className="p-4 border rounded-lg border-orange-200 dark:border-orange-900">
                <h3 className="font-semibold mb-2 text-sm">Sync Challenge Progress</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Recalculates and syncs all challenge progress based on current data.
                </p>
                <Button
                  onClick={handleSync}
                  disabled={isSyncing}
                  size="sm"
                  className="w-full"
                  variant="outline"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                  {isSyncing ? "Syncing..." : "Sync Challenges"}
                </Button>
              </div>

              <div className="p-4 border rounded-lg border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950">
                <h3 className="font-semibold mb-2 text-sm text-red-700 dark:text-red-400">
                  Clear All Data
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  ⚠️ Permanently deletes ALL pomodoros and challenges for current user.
                </p>
                <Button
                  onClick={handleClear}
                  disabled={isClearing}
                  size="sm"
                  className="w-full"
                  variant="destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isClearing ? "Clearing..." : "Delete All Data"}
                </Button>
              </div>
            </div>
          </Card>

          {/* Challenge Management */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Award className="w-5 h-5" />
              Challenge Management
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Manage global challenges visible to all users. Toggle active status to show/hide
              challenges.
            </p>
            {allChallenges && allChallenges.length > 0 ? (
              <div className="space-y-2">
                {allChallenges.map((challenge) => (
                  <div
                    key={challenge._id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">{challenge.name}</h3>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            challenge.active
                              ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {challenge.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {challenge.description} • {challenge.type} • Target: {challenge.target}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleChallenge(challenge._id)}
                      disabled={togglingChallengeId === challenge._id}
                      className="ml-4"
                    >
                      {togglingChallengeId === challenge._id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : challenge.active ? (
                        <>
                          <PowerOff className="w-4 h-4 mr-2" />
                          Disable
                        </>
                      ) : (
                        <>
                          <Power className="w-4 h-4 mr-2" />
                          Enable
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed rounded-lg">
                <Award className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No challenges found. They will be created automatically when users first visit
                  their profile.
                </p>
              </div>
            )}
          </Card>

          {/* Quick Links */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Quick Links</h2>
            <div className="grid gap-2 sm:grid-cols-3">
              <Link href="/">
                <Button variant="outline" className="w-full">
                  Timer
                </Button>
              </Link>
              <Link href="/profile">
                <Button variant="outline" className="w-full">
                  Profile
                </Button>
              </Link>
              <Link href="/changelog">
                <Button variant="outline" className="w-full">
                  Changelog
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
