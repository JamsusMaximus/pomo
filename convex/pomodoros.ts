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

    const sessionId = await ctx.db.insert("pomodoros", {
      userId: user._id,
      mode: args.mode,
      duration: args.duration,
      tag: args.tag,
      completedAt: args.completedAt,
    });

    // Update challenge progress after each focus session
    if (args.mode === "focus") {
      await ctx.scheduler.runAfter(0, internal.challenges.updateChallengeProgress, {
        userId: user._id,
      });
    }

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
