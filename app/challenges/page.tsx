/**
 * @fileoverview Accountability Challenges page for group challenges
 * @module app/challenges/page
 *
 * Key responsibilities:
 * - Display user's accountability challenges (pending, active, past)
 * - Create new challenges with join codes
 * - Join existing challenges via join code
 * - Navigate to challenge details
 *
 * Dependencies: Convex (accountabilityChallenges), Clerk (auth), Framer Motion (animations)
 * Used by: Root layout (route "/challenges")
 */

"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Users, Trophy, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Import components (we'll create these next)
import { ChallengeCard } from "@/components/ChallengeCard";
import { CreateChallengeModal } from "@/components/CreateChallengeModal";
import { JoinChallengeModal } from "@/components/JoinChallengeModal";

function ChallengesPageContent() {
  const { user } = useUser();
  const challenges = useQuery(api.accountabilityChallenges.getMyAccountabilityChallenges);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Please sign in</h1>
          <p className="text-muted-foreground">
            You need to be signed in to view accountability challenges.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 pt-6 md:pt-24 pb-20 md:pb-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <Link href="/">
              <Button variant="ghost" size="sm" className="min-h-[44px] mb-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Timer
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Accountability Challenges</h1>
            <p className="text-muted-foreground mt-1">
              Team up with friends for 4-day focus challenges
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setShowJoinModal(true)}
              variant="outline"
              className="min-h-[44px]"
            >
              <Users className="w-4 h-4 mr-2" />
              Join Challenge
            </Button>
            <Button onClick={() => setShowCreateModal(true)} className="min-h-[44px]">
              <Plus className="w-4 h-4 mr-2" />
              Create Challenge
            </Button>
          </div>
        </div>

        {/* Active Challenges */}
        {challenges && challenges.active.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-orange-500" />
              <h2 className="text-xl font-bold">Active Challenges</h2>
              <span className="text-sm text-muted-foreground">({challenges.active.length})</span>
            </div>
            <div className="space-y-4">
              {challenges.active.map((challenge, index) => (
                <motion.div
                  key={challenge._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <ChallengeCard challenge={challenge} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Pending Challenges */}
        {challenges && challenges.pending.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-blue-500" />
              <h2 className="text-xl font-bold">Upcoming Challenges</h2>
              <span className="text-sm text-muted-foreground">({challenges.pending.length})</span>
            </div>
            <div className="space-y-4">
              {challenges.pending.map((challenge, index) => (
                <motion.div
                  key={challenge._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <ChallengeCard challenge={challenge} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Past Challenges */}
        {challenges && challenges.past.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <XCircle className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-xl font-bold">Past Challenges</h2>
              <span className="text-sm text-muted-foreground">({challenges.past.length})</span>
            </div>
            <div className="space-y-4">
              {challenges.past.map((challenge, index) => (
                <motion.div
                  key={challenge._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <ChallengeCard challenge={challenge} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {challenges &&
          challenges.active.length === 0 &&
          challenges.pending.length === 0 &&
          challenges.past.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="bg-card rounded-2xl shadow-lg border border-border p-12 text-center"
            >
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-bold mb-2">No Challenges Yet</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Create a challenge or join one with a code to get started!
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => setShowJoinModal(true)} variant="outline">
                  <Users className="w-4 h-4 mr-2" />
                  Join Challenge
                </Button>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Challenge
                </Button>
              </div>
            </motion.div>
          )}
      </div>

      {/* Modals */}
      {showCreateModal && <CreateChallengeModal onClose={() => setShowCreateModal(false)} />}
      {showJoinModal && <JoinChallengeModal onClose={() => setShowJoinModal(false)} />}
    </main>
  );
}

export default function ChallengesPage() {
  return (
    <ErrorBoundary
      fallbackTitle="Challenges Error"
      fallbackMessage="An error occurred while loading challenges. Please refresh the page."
    >
      <ChallengesPageContent />
    </ErrorBoundary>
  );
}
