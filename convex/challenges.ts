import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

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

    // Get all active challenges
    const challenges = await ctx.db
      .query("challenges")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();

    // Get user's pomodoros
    const pomodoros = await ctx.db
      .query("pomodoros")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("mode"), "focus"))
      .collect();

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
          let streak = 0;
          const checkDate = new Date(today);

          while (true) {
            const dayStart = checkDate.getTime();
            const dayEnd = dayStart + 24 * 60 * 60 * 1000;
            const dayPomos = pomodoros.filter(
              (p) => p.completedAt >= dayStart && p.completedAt < dayEnd
            );

            if (dayPomos.length > 0) {
              streak++;
              checkDate.setDate(checkDate.getDate() - 1);
            } else {
              break;
            }
          }
          progress = streak;
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
        await ctx.db.patch(existing._id, {
          progress,
          completed,
          completedAt: completed && !existing.completed ? Date.now() : existing.completedAt,
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
    // Get all active challenges
    const challenges = await ctx.db
      .query("challenges")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();

    // Get user's pomodoros
    const pomodoros = await ctx.db
      .query("pomodoros")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("mode"), "focus"))
      .collect();

    // Get current date info
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayTimestamp = today.getTime();

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
          // Only count if it's the correct month
          if (challenge.recurringMonth === now.getMonth() + 1) {
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
            const monthPomos = pomodoros.filter((p) => p.completedAt >= monthStart);
            progress = monthPomos.length;
          }
          break;
        }

        case "streak": {
          // Calculate current streak
          let streak = 0;
          const checkDate = new Date(today);

          while (true) {
            const dayStart = checkDate.getTime();
            const dayEnd = dayStart + 24 * 60 * 60 * 1000;
            const dayPomos = pomodoros.filter(
              (p) => p.completedAt >= dayStart && p.completedAt < dayEnd
            );

            if (dayPomos.length > 0) {
              streak++;
              checkDate.setDate(checkDate.getDate() - 1);
            } else {
              break;
            }
          }
          progress = streak;
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
        // Update existing
        await ctx.db.patch(existing._id, {
          progress,
          completed,
          completedAt: completed && !existing.completed ? Date.now() : existing.completedAt,
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
