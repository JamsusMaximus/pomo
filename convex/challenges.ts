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

/**
 * Calculate the best historical streak from all sessions
 * Finds the longest consecutive daily streak in the entire history
 */
function calculateBestHistoricalStreak(sessions: Array<{ completedAt: number }>): number {
  if (sessions.length === 0) {
    return 0;
  }

  // Group sessions by date
  const sessionsByDate: Record<string, number> = {};
  sessions.forEach((session) => {
    const date = new Date(session.completedAt);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    sessionsByDate[dateKey] = (sessionsByDate[dateKey] || 0) + 1;
  });

  // Get all dates sorted chronologically
  const sortedDates = Object.keys(sessionsByDate).sort();

  if (sortedDates.length === 0) {
    return 0;
  }

  let maxStreak = 0;
  let currentStreak = 1;

  // Iterate through sorted dates to find longest consecutive streak
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1]);
    const currDate = new Date(sortedDates[i]);

    // Calculate difference in days
    const diffTime = currDate.getTime() - prevDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Consecutive day
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      // Gap in streak, reset
      currentStreak = 1;
    }
  }

  // Don't forget the last streak
  maxStreak = Math.max(maxStreak, currentStreak);

  return maxStreak;
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

    // Get all active challenges
    const allChallenges = await ctx.db
      .query("challenges")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();

    // Get user's challenge records
    const userChallenges = await ctx.db
      .query("userChallenges")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Create a map for quick lookup
    const userChallengeMap = new Map(userChallenges.map((uc) => [uc.challengeId, uc]));

    const activeChallengesData = [];
    const completedChallengesData = [];

    // Process all active challenges
    for (const challenge of allChallenges) {
      const userChallenge = userChallengeMap.get(challenge._id);

      const data = {
        ...challenge,
        progress: userChallenge?.progress || 0,
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

    // Get user's pomodoros to calculate best streak
    const pomodoros = await ctx.db
      .query("pomodoros")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("mode"), "focus"))
      .collect();

    // Calculate best historical streak
    const historicalBest = calculateBestHistoricalStreak(pomodoros);
    const currentBest = user.bestDailyStreak ?? 0;
    const actualBest = Math.max(historicalBest, currentBest);

    // Update user's best streak if needed
    if (actualBest > currentBest) {
      await ctx.db.patch(user._id, { bestDailyStreak: actualBest });
    }

    // Get all active challenges
    const challenges = await ctx.db
      .query("challenges")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();

    // Reuse pomodoros already fetched above (no need to query again)

    // Get current date info
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayTimestamp = today.getTime();

    let syncedCount = 0;

    for (const challenge of challenges) {
      let progress = 0;

      // Calculate progress based on challenge type
      switch (challenge.type) {
        case "total":
          progress = pomodoros.length;
          break;

        case "daily": {
          const todayPomos = pomodoros.filter((p) => p.completedAt >= todayTimestamp);
          progress = todayPomos.length;
          break;
        }

        case "weekly": {
          const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          const weekPomos = pomodoros.filter((p) => p.completedAt >= weekAgo);
          progress = weekPomos.length;
          break;
        }

        case "monthly": {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
          const monthPomos = pomodoros.filter((p) => p.completedAt >= monthStart);
          progress = monthPomos.length;
          break;
        }

        case "recurring_monthly": {
          if (challenge.recurringMonth === now.getMonth() + 1) {
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
            const monthPomos = pomodoros.filter((p) => p.completedAt >= monthStart);
            progress = monthPomos.length;
          }
          break;
        }

        case "streak": {
          // Use best historical streak instead of current streak
          // This way challenges don't reset when you lose your streak
          progress = user.bestDailyStreak ?? 0;
          break;
        }
      }

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
        const shouldStayCompleted = existing.completed || completed;
        const finalCompletedAt =
          existing.completedAt || (completed && !existing.completed ? Date.now() : undefined);

        await ctx.db.patch(existing._id, {
          progress: Math.max(existing.progress, progress), // Only increase progress
          completed: shouldStayCompleted,
          completedAt: finalCompletedAt,
        });
      } else {
        await ctx.db.insert("userChallenges", {
          userId: user._id,
          challengeId: challenge._id,
          progress,
          completed,
          completedAt: completed ? Date.now() : undefined,
        });
      }

      syncedCount++;
    }

    return { message: "Progress synced", challenges: syncedCount };
  },
});

/**
 * Update challenge progress (called after each pomodoro)
 */
export const updateChallengeProgress = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    // Get user with cached counts
    const user = await ctx.db.get(userId);
    if (!user) return;

    // Get all active challenges
    const challenges = await ctx.db
      .query("challenges")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();

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
