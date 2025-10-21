/**
 * @fileoverview Pomodoro session management (queries and mutations)
 * @module convex/pomodoros
 *
 * Key responsibilities:
 * - Save completed pomodoro sessions (focus and break)
 * - Retrieve user's session history with pagination
 * - Calculate today's session count
 * - Provide tag suggestions and tag editing
 *
 * Dependencies: Convex server runtime
 * Used by: app/page.tsx (timer), app/profile/page.tsx (session history)
 *
 * Note: Stats are computed on-read from this table by stats_helpers.ts
 */

import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Save a completed pomodoro session
 * Only works for authenticated users
 */
export const saveSession = mutation({
  args: {
    mode: v.union(v.literal("focus"), v.literal("break")),
    duration: v.number(),
    tag: v.optional(v.string()),
    tagPrivate: v.optional(v.boolean()),
    completedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found - call ensureUser first");

    // Check for duplicate session (within 1 second window to handle race conditions)
    const existingSession = await ctx.db
      .query("pomodoros")
      .withIndex("by_user_and_date", (q) => q.eq("userId", user._id))
      .filter((q) =>
        q.and(
          q.gte(q.field("completedAt"), args.completedAt - 1000),
          q.lte(q.field("completedAt"), args.completedAt + 1000),
          q.eq(q.field("mode"), args.mode),
          q.eq(q.field("duration"), args.duration)
        )
      )
      .first();

    // If duplicate found, return existing session ID instead of creating new one
    if (existingSession) {
      console.log("Duplicate session detected, skipping insert and count updates");
      return existingSession._id;
    }

    // Insert new session
    const sessionId = await ctx.db.insert("pomodoros", {
      userId: user._id,
      mode: args.mode,
      duration: args.duration,
      tag: args.tag,
      tagPrivate: args.tagPrivate,
      completedAt: args.completedAt,
    });

    // Auto-sync challenges after saving a focus session
    // This ensures completed challenges are recorded immediately
    if (args.mode === "focus") {
      await ctx.scheduler.runAfter(0, internal.pomodoros.syncChallengesAfterSession, {
        userId: user._id,
      });

      // Check and update accountability challenge status
      await ctx.scheduler.runAfter(
        0,
        internal.accountabilityChallenges.checkAndUpdateChallengeStatus,
        {
          userId: user._id,
          completedAt: args.completedAt,
        }
      );
    }

    // Stats are computed on-read, Convex reactivity updates all queries
    return sessionId;
  },
});

/**
 * Get user's pomodoro history
 */
export const getMyPomodoros = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return [];

    const limit = args.limit ?? 50;

    return await ctx.db
      .query("pomodoros")
      .withIndex("by_user_and_date", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);
  },
});

/**
 * Get today's pomodoro count
 */
export const getTodayCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return 0;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const pomodoros = await ctx.db
      .query("pomodoros")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", user._id).gte("completedAt", startOfDay.getTime())
      )
      .filter((q) => q.eq(q.field("mode"), "focus"))
      .collect();

    return pomodoros.length;
  },
});

/**
 * Get tag suggestions sorted by most recently used first, then by usage frequency
 * Returns array of tags with their usage counts
 */
export const getTagSuggestions = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return [];

    // Get all user's pomodoros with tags (ordered by most recent first)
    const pomodoros = await ctx.db
      .query("pomodoros")
      .withIndex("by_user_and_date", (q) => q.eq("userId", user._id))
      .order("desc")
      .filter((q) => q.neq(q.field("tag"), undefined))
      .collect();

    // Track tag info: count and most recent timestamp
    const tagInfo = new Map<string, { count: number; lastUsed: number }>();
    for (const pomo of pomodoros) {
      if (pomo.tag) {
        const existing = tagInfo.get(pomo.tag);
        if (existing) {
          existing.count++;
          existing.lastUsed = Math.max(existing.lastUsed, pomo.completedAt);
        } else {
          tagInfo.set(pomo.tag, { count: 1, lastUsed: pomo.completedAt });
        }
      }
    }

    // Convert to array
    const tags = Array.from(tagInfo.entries()).map(([tag, info]) => ({
      tag,
      count: info.count,
      lastUsed: info.lastUsed,
    }));

    // Sort: most recent first, then by count descending
    tags.sort((a, b) => {
      // Get the most recent tag's timestamp
      const mostRecentTimestamp = Math.max(...tags.map((t) => t.lastUsed));

      // If 'a' is the most recent tag, it goes first
      if (a.lastUsed === mostRecentTimestamp && b.lastUsed !== mostRecentTimestamp) {
        return -1;
      }
      // If 'b' is the most recent tag, it goes first
      if (b.lastUsed === mostRecentTimestamp && a.lastUsed !== mostRecentTimestamp) {
        return 1;
      }

      // For all other tags, sort by count descending
      return b.count - a.count;
    });

    return tags;
  },
});

/**
 * Update tag on an existing pomodoro session
 */
export const updateSessionTag = mutation({
  args: {
    sessionId: v.id("pomodoros"),
    tag: v.optional(v.string()),
    tagPrivate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // Verify the session belongs to the user
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    if (session.userId !== user._id) throw new Error("Unauthorized");

    // Update the tag and/or privacy
    await ctx.db.patch(args.sessionId, {
      tag: args.tag || undefined,
      tagPrivate: args.tagPrivate,
    });

    return { success: true };
  },
});

/**
 * Internal mutation to sync challenges after a session is saved
 * Called automatically by saveSession via scheduler
 */
export const syncChallengesAfterSession = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { calculateUserStats } = await import("./stats_helpers");

    // Calculate current stats
    const stats = await calculateUserStats(ctx, args.userId);

    // Get all active challenges
    const allChallenges = await ctx.db
      .query("challenges")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();

    // Auto-seed default challenges if none exist
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

      await Promise.all(
        defaultChallenges.map((challenge) => ctx.db.insert("challenges", challenge))
      );

      // Re-fetch challenges after seeding
      allChallenges.push(
        ...(await ctx.db
          .query("challenges")
          .withIndex("by_active", (q) => q.eq("active", true))
          .collect())
      );
    }

    // Process each challenge
    for (const challenge of allChallenges) {
      // Calculate progress from stats
      const progress = (() => {
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
            return stats.bestStreak;
          default:
            return 0;
        }
      })();

      const isCompleted = progress >= challenge.target;

      // Check if userChallenge record exists
      const existing = await ctx.db
        .query("userChallenges")
        .withIndex("by_user_and_challenge", (q) =>
          q.eq("userId", args.userId).eq("challengeId", challenge._id)
        )
        .first();

      if (existing) {
        // If not yet marked complete but now is, update it
        if (!existing.completed && isCompleted) {
          await ctx.db.patch(existing._id, {
            completed: true,
            completedAt: Date.now(),
          });
        }
      } else if (isCompleted) {
        // Create new record for completed challenge
        await ctx.db.insert("userChallenges", {
          userId: args.userId,
          challengeId: challenge._id,
          progress: 0, // Deprecated, kept for schema compatibility
          completed: true,
          completedAt: Date.now(),
        });
      }
    }
  },
});
