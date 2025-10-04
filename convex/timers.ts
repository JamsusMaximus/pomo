import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get current user's timer state
 * Returns null if user not authenticated or no timer exists
 */
export const getMyTimer = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    return await ctx.db
      .query("timers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
  },
});

/**
 * Save timer preferences (durations, cycles)
 */
export const savePreferences = mutation({
  args: {
    focusDuration: v.number(),
    breakDuration: v.number(),
    cyclesCompleted: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const existing = await ctx.db
      .query("timers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        focusDuration: args.focusDuration,
        breakDuration: args.breakDuration,
        cyclesCompleted: args.cyclesCompleted,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("timers", {
        userId: user._id,
        mode: "focus",
        focusDuration: args.focusDuration,
        breakDuration: args.breakDuration,
        cyclesCompleted: args.cyclesCompleted,
        updatedAt: now,
      });
    }
  },
});

/**
 * Start timer - records server timestamp
 */
export const startTimer = mutation({
  args: {
    mode: v.union(v.literal("focus"), v.literal("break")),
    currentTag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const existing = await ctx.db
      .query("timers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!existing) throw new Error("Timer preferences not found");

    await ctx.db.patch(existing._id, {
      mode: args.mode,
      startedAt: Date.now(),
      remainingAtPause: undefined,
      currentTag: args.currentTag,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Pause timer - saves remaining time
 */
export const pauseTimer = mutation({
  args: {
    remainingAtPause: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const existing = await ctx.db
      .query("timers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!existing) throw new Error("Timer not found");

    await ctx.db.patch(existing._id, {
      startedAt: undefined,
      remainingAtPause: args.remainingAtPause,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Reset timer
 */
export const resetTimer = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const existing = await ctx.db
      .query("timers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!existing) throw new Error("Timer not found");

    await ctx.db.patch(existing._id, {
      startedAt: undefined,
      remainingAtPause: undefined,
      currentTag: undefined,
      updatedAt: Date.now(),
    });
  },
});
