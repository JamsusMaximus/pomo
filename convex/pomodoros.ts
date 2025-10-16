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

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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

    // Insert new session (that's it! No cache to update)
    const sessionId = await ctx.db.insert("pomodoros", {
      userId: user._id,
      mode: args.mode,
      duration: args.duration,
      tag: args.tag,
      completedAt: args.completedAt,
    });

    // Stats are computed on-read, so we're done!
    // Convex reactivity will automatically update all queries
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
 * Get tag suggestions sorted by usage frequency
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

    // Get all user's pomodoros with tags
    const pomodoros = await ctx.db
      .query("pomodoros")
      .withIndex("by_user_and_date", (q) => q.eq("userId", user._id))
      .filter((q) => q.neq(q.field("tag"), undefined))
      .collect();

    // Count tag occurrences
    const tagCounts = new Map<string, number>();
    for (const pomo of pomodoros) {
      if (pomo.tag) {
        tagCounts.set(pomo.tag, (tagCounts.get(pomo.tag) || 0) + 1);
      }
    }

    // Convert to array and sort by count (descending)
    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  },
});

/**
 * Update tag on an existing pomodoro session
 */
export const updateSessionTag = mutation({
  args: {
    sessionId: v.id("pomodoros"),
    tag: v.optional(v.string()),
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

    // Update the tag
    await ctx.db.patch(args.sessionId, {
      tag: args.tag || undefined,
    });

    return { success: true };
  },
});
