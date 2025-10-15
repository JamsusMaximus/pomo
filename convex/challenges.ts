/**
 * @fileoverview Challenge system (gamification)
 * @module convex/challenges
 *
 * Key responsibilities:
 * - Retrieve active challenges and user progress
 * - Update user challenge progress after session completion
 * - Admin functions for challenge CRUD operations
 * - Calculate progress for different challenge types (streak, daily, weekly, monthly, total)
 * - Mark challenges as completed when target reached
 *
 * Dependencies: Convex server runtime, pomodoros.ts (triggered by scheduler)
 * Used by: app/profile/page.tsx (challenge display), app/admin/page.tsx (management)
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { calculateUserStats, type UserStats } from "./stats_helpers";
import type { Doc } from "./_generated/dataModel";

/**
 * Calculate progress for a specific challenge based on user stats
 * Single source of truth for challenge progress calculation
 */
function calculateChallengeProgress(challenge: Doc<"challenges">, stats: UserStats): number {
  const now = new Date();

  switch (challenge.type) {
    case "total":
      return stats.total;
    case "daily":
      return stats.today;
    case "weekly":
      return stats.week;
    case "monthly":
      return stats.month;
    case "recurring_monthly": {
      const currentMonth = now.getMonth() + 1;
      return challenge.recurringMonth === currentMonth ? stats.month : 0;
    }
    case "streak":
      // Use best historical streak for challenges (doesn't reset)
      return stats.bestStreak;
    default:
      return 0;
  }
}

/**
 * Get all active challenges
 */
export const getActiveChallenges = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("challenges")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
  },
});

/**
 * Get user's challenge progress
 * Uses computed stats - always accurate, no cache sync needed
 */
export const getUserChallenges = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { active: [], completed: [] };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return { active: [], completed: [] };
    }

    // Calculate stats once from pomodoros table (single source of truth)
    const stats = await calculateUserStats(ctx, user._id);

    // Get all active challenges
    const allChallenges = await ctx.db
      .query("challenges")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();

    // Get user's completion records (only stores completion, not progress)
    const userChallenges = await ctx.db
      .query("userChallenges")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const userChallengeMap = new Map(userChallenges.map((uc) => [uc.challengeId, uc]));

    const activeChallengesData = [];
    const completedChallengesData = [];

    // Process all active challenges
    for (const challenge of allChallenges) {
      const userChallenge = userChallengeMap.get(challenge._id);

      // Always compute progress from real stats
      const progress = calculateChallengeProgress(challenge, stats);

      const data = {
        ...challenge,
        progress,
        completed: userChallenge?.completed || false,
        completedAt: userChallenge?.completedAt,
      };

      if (data.completed) {
        completedChallengesData.push(data);
      } else {
        activeChallengesData.push(data);
      }
    }

    return {
      active: activeChallengesData,
      completed: completedChallengesData,
    };
  },
});

/**
 * Manually sync user's challenge progress (useful for existing users)
 * Now much simpler - just marks completed challenges, all progress is computed on-read
 */
export const syncMyProgress = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // Calculate stats from pomodoros table
    const stats = await calculateUserStats(ctx, user._id);

    // Get all active challenges - auto-seed if none exist
    let challenges = await ctx.db
      .query("challenges")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();

    // If no challenges exist at all, seed default challenges
    if (challenges.length === 0) {
      const allChallenges = await ctx.db.query("challenges").collect();
      if (allChallenges.length === 0) {
        const defaultChallenges = [
          {
            name: "First Steps",
            description: "Complete your first pomodoro",
            type: "total" as const,
            target: 1,
            badge: "Target",
            recurring: false,
            active: true,
            createdAt: Date.now(),
          },
          {
            name: "Getting Started",
            description: "Complete 10 pomodoros",
            type: "total" as const,
            target: 10,
            badge: "Sprout",
            recurring: false,
            active: true,
            createdAt: Date.now(),
          },
          {
            name: "Half Century",
            description: "Complete 50 total pomodoros",
            type: "total" as const,
            target: 50,
            badge: "Flame",
            recurring: false,
            active: true,
            createdAt: Date.now(),
          },
          {
            name: "Century Club",
            description: "Complete 100 total pomodoros",
            type: "total" as const,
            target: 100,
            badge: "Award",
            recurring: false,
            active: true,
            createdAt: Date.now(),
          },
          {
            name: "Dedication",
            description: "Complete 250 total pomodoros",
            type: "total" as const,
            target: 250,
            badge: "Star",
            recurring: false,
            active: true,
            createdAt: Date.now(),
          },
          {
            name: "Master",
            description: "Complete 500 total pomodoros",
            type: "total" as const,
            target: 500,
            badge: "Trophy",
            recurring: false,
            active: true,
            createdAt: Date.now(),
          },
          {
            name: "Streak Starter",
            description: "Maintain a 3-day streak",
            type: "streak" as const,
            target: 3,
            badge: "Flame",
            recurring: false,
            active: true,
            createdAt: Date.now(),
          },
          {
            name: "Week Warrior",
            description: "Maintain a 7-day streak",
            type: "streak" as const,
            target: 7,
            badge: "Swords",
            recurring: false,
            active: true,
            createdAt: Date.now(),
          },
          {
            name: "Consistency King",
            description: "Maintain a 30-day streak",
            type: "streak" as const,
            target: 30,
            badge: "Crown",
            recurring: false,
            active: true,
            createdAt: Date.now(),
          },
          {
            name: "Daily Dozen",
            description: "Complete 12 pomodoros in one day",
            type: "daily" as const,
            target: 12,
            badge: "Sparkles",
            recurring: false,
            active: true,
            createdAt: Date.now(),
          },
          {
            name: "Weekend Warrior",
            description: "Complete 20 pomodoros in one week",
            type: "weekly" as const,
            target: 20,
            badge: "Zap",
            recurring: false,
            active: true,
            createdAt: Date.now(),
          },
          {
            name: "Monthly Marathon",
            description: "Complete 100 pomodoros in one month",
            type: "monthly" as const,
            target: 100,
            badge: "Medal",
            recurring: false,
            active: true,
            createdAt: Date.now(),
          },
        ];

        // Insert all challenges
        await Promise.all(
          defaultChallenges.map((challenge) => ctx.db.insert("challenges", challenge))
        );

        // Re-fetch challenges after seeding
        challenges = await ctx.db
          .query("challenges")
          .withIndex("by_active", (q) => q.eq("active", true))
          .collect();
      }
    }

    // Process each challenge - compute progress from stats
    let syncedCount = 0;

    for (const challenge of challenges) {
      // Always compute progress from real stats (single source of truth)
      const progress = calculateChallengeProgress(challenge, stats);
      const completed = progress >= challenge.target;

      // Check if user challenge exists
      const existing = await ctx.db
        .query("userChallenges")
        .withIndex("by_user_and_challenge", (q) =>
          q.eq("userId", user._id).eq("challengeId", challenge._id)
        )
        .first();

      if (existing) {
        // Once completed, always stay completed (preserve completion date)
        if (!existing.completed && completed) {
          await ctx.db.patch(existing._id, {
            completed: true,
            completedAt: Date.now(),
          });
        }
        // If already completed, nothing to update
      } else if (completed) {
        // Only create record if challenge is completed
        // Progress is computed on-read, no need to store it
        await ctx.db.insert("userChallenges", {
          userId: user._id,
          challengeId: challenge._id,
          progress: 0, // Deprecated field, kept for schema compatibility
          completed: true,
          completedAt: Date.now(),
        });
      }
      // If not completed and no existing record, no action needed

      syncedCount++;
    }

    return { message: "Progress synced", challenges: syncedCount };
  },
});

/**
 * @deprecated This function is no longer used after the computed-on-read refactor.
 * Challenge progress is now calculated dynamically from the pomodoros table.
 * Scheduled for removal in future cleanup.
 *
 * Old behavior: Was called after each pomodoro to update cached progress.
 * New behavior: All queries compute progress on-read using calculateUserStats().
 */
export const updateChallengeProgress = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    // Get user with cached counts
    const user = await ctx.db.get(userId);
    if (!user) return;

    // Get all active challenges - auto-seed if none exist
    let challenges = await ctx.db
      .query("challenges")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();

    // If no challenges exist at all, seed default challenges
    if (challenges.length === 0) {
      const allChallenges = await ctx.db.query("challenges").collect();
      if (allChallenges.length === 0) {
        const defaultChallenges = [
          {
            name: "First Steps",
            description: "Complete your first pomodoro",
            type: "total" as const,
            target: 1,
            badge: "Target",
            recurring: false,
            active: true,
            createdAt: Date.now(),
          },
          {
            name: "Getting Started",
            description: "Complete 10 pomodoros",
            type: "total" as const,
            target: 10,
            badge: "Sprout",
            recurring: false,
            active: true,
            createdAt: Date.now(),
          },
          {
            name: "Half Century",
            description: "Complete 50 total pomodoros",
            type: "total" as const,
            target: 50,
            badge: "Flame",
            recurring: false,
            active: true,
            createdAt: Date.now(),
          },
          {
            name: "Century Club",
            description: "Complete 100 total pomodoros",
            type: "total" as const,
            target: 100,
            badge: "Award",
            recurring: false,
            active: true,
            createdAt: Date.now(),
          },
          {
            name: "Dedication",
            description: "Complete 250 total pomodoros",
            type: "total" as const,
            target: 250,
            badge: "Star",
            recurring: false,
            active: true,
            createdAt: Date.now(),
          },
          {
            name: "Master",
            description: "Complete 500 total pomodoros",
            type: "total" as const,
            target: 500,
            badge: "Trophy",
            recurring: false,
            active: true,
            createdAt: Date.now(),
          },
          {
            name: "Streak Starter",
            description: "Maintain a 3-day streak",
            type: "streak" as const,
            target: 3,
            badge: "Flame",
            recurring: false,
            active: true,
            createdAt: Date.now(),
          },
          {
            name: "Week Warrior",
            description: "Maintain a 7-day streak",
            type: "streak" as const,
            target: 7,
            badge: "Swords",
            recurring: false,
            active: true,
            createdAt: Date.now(),
          },
          {
            name: "Consistency King",
            description: "Maintain a 30-day streak",
            type: "streak" as const,
            target: 30,
            badge: "Crown",
            recurring: false,
            active: true,
            createdAt: Date.now(),
          },
          {
            name: "Daily Dozen",
            description: "Complete 12 pomodoros in one day",
            type: "daily" as const,
            target: 12,
            badge: "Sparkles",
            recurring: false,
            active: true,
            createdAt: Date.now(),
          },
          {
            name: "Weekend Warrior",
            description: "Complete 20 pomodoros in one week",
            type: "weekly" as const,
            target: 20,
            badge: "Zap",
            recurring: false,
            active: true,
            createdAt: Date.now(),
          },
          {
            name: "Monthly Marathon",
            description: "Complete 100 pomodoros in one month",
            type: "monthly" as const,
            target: 100,
            badge: "Medal",
            recurring: false,
            active: true,
            createdAt: Date.now(),
          },
        ];

        // Insert all challenges
        await Promise.all(
          defaultChallenges.map((challenge) => ctx.db.insert("challenges", challenge))
        );

        // Re-fetch challenges after seeding
        challenges = await ctx.db
          .query("challenges")
          .withIndex("by_active", (q) => q.eq("active", true))
          .collect();
      }
    }

    // Get current date info
    const now = new Date();

    for (const challenge of challenges) {
      let progress = 0;

      // Calculate progress using cached counts (O(1) instead of O(N))
      switch (challenge.type) {
        case "total":
          progress = user.totalPomos ?? 0;
          break;

        case "daily":
          progress = user.todayPomos ?? 0;
          break;

        case "weekly":
          progress = user.weekPomos ?? 0;
          break;

        case "monthly":
          progress = user.monthPomos ?? 0;
          break;

        case "recurring_monthly": {
          // Only count if it's the correct month
          const currentMonth = now.getMonth() + 1;
          if (challenge.recurringMonth === currentMonth) {
            progress = user.monthPomos ?? 0;
          }
          break;
        }

        case "streak": {
          // Use best historical streak instead of current streak
          progress = user.bestDailyStreak ?? 0;
          break;
        }
      }

      // Check if user challenge exists
      const existing = await ctx.db
        .query("userChallenges")
        .withIndex("by_user_and_challenge", (q) =>
          q.eq("userId", userId).eq("challengeId", challenge._id)
        )
        .first();

      const completed = progress >= challenge.target;

      if (existing) {
        // Once completed, always stay completed (preserve completion date)
        const shouldStayCompleted = existing.completed || completed;
        const finalCompletedAt =
          existing.completedAt || (completed && !existing.completed ? Date.now() : undefined);

        await ctx.db.patch(existing._id, {
          progress: Math.max(existing.progress, progress), // Only increase progress
          completed: shouldStayCompleted,
          completedAt: finalCompletedAt,
        });
      } else {
        // Create new
        await ctx.db.insert("userChallenges", {
          userId,
          challengeId: challenge._id,
          progress,
          completed,
          completedAt: completed ? Date.now() : undefined,
        });
      }
    }
  },
});

/**
 * Admin: Create new challenge
 */
export const createChallenge = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    type: v.union(
      v.literal("streak"),
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("recurring_monthly"),
      v.literal("total")
    ),
    target: v.number(),
    badge: v.string(),
    recurring: v.boolean(),
    recurringMonth: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // TODO: Add admin check here
    return await ctx.db.insert("challenges", {
      ...args,
      active: true,
      createdAt: Date.now(),
    });
  },
});

/**
 * Admin: Get all challenges
 */
export const getAllChallenges = query({
  args: {},
  handler: async (ctx) => {
    // TODO: Add admin check here
    return await ctx.db.query("challenges").collect();
  },
});

/**
 * Admin: Toggle challenge active status
 */
export const toggleChallengeActive = mutation({
  args: {
    challengeId: v.id("challenges"),
  },
  handler: async (ctx, { challengeId }) => {
    // TODO: Add admin check here
    const challenge = await ctx.db.get(challengeId);
    if (!challenge) throw new Error("Challenge not found");

    await ctx.db.patch(challengeId, {
      active: !challenge.active,
    });
  },
});

/**
 * Get next challenge with highest completion percentage for toast notification
 * Returns the incomplete challenge closest to completion
 * Uses computed stats - always accurate, no cache dependencies
 */
export const getNextChallenge = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    // Calculate stats once from pomodoros table (single source of truth)
    const stats = await calculateUserStats(ctx, user._id);

    // Get all active challenges
    const allChallenges = await ctx.db
      .query("challenges")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();

    if (allChallenges.length === 0) return null;

    // Get user's completion records
    const userChallenges = await ctx.db
      .query("userChallenges")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const userChallengeMap = new Map(userChallenges.map((uc) => [uc.challengeId, uc]));

    // Calculate percentage for each incomplete challenge
    const incompleteChallenges = allChallenges
      .map((challenge) => {
        const userChallenge = userChallengeMap.get(challenge._id);
        const completed = userChallenge?.completed || false;

        // Skip completed challenges
        if (completed) return null;

        // Always compute progress from real stats (no cache!)
        const progress = calculateChallengeProgress(challenge, stats);
        const percentage = (progress / challenge.target) * 100;

        return {
          name: challenge.name,
          description: challenge.description,
          badge: challenge.badge,
          progress,
          target: challenge.target,
          percentage: Math.min(100, Math.round(percentage)),
        };
      })
      .filter((c) => c !== null);

    if (incompleteChallenges.length === 0) return null;

    // Sort by highest percentage and return the top one
    incompleteChallenges.sort((a, b) => b!.percentage - a!.percentage);

    return incompleteChallenges[0];
  },
});
