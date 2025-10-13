import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Start a new flow session
 * Returns the flow session ID
 */
export const startFlowSession = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // Check if there's already an active flow session
    const activeFlow = await ctx.db
      .query("flowSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("endedAt"), undefined))
      .first();

    if (activeFlow) {
      // Return existing flow session ID if one is active
      return activeFlow._id;
    }

    // Create new flow session
    const flowId = await ctx.db.insert("flowSessions", {
      userId: user._id,
      startedAt: Date.now(),
      completedPomos: 0,
    });

    return flowId;
  },
});

/**
 * Increment completed pomos in current flow session
 */
export const incrementFlowPomo = mutation({
  args: {
    flowId: v.id("flowSessions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const flowSession = await ctx.db.get(args.flowId);
    if (!flowSession) throw new Error("Flow session not found");

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || flowSession.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    // Increment completed pomos
    await ctx.db.patch(args.flowId, {
      completedPomos: flowSession.completedPomos + 1,
    });

    return flowSession.completedPomos + 1;
  },
});

/**
 * End the current flow session
 */
export const endFlowSession = mutation({
  args: {
    flowId: v.id("flowSessions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const flowSession = await ctx.db.get(args.flowId);
    if (!flowSession) throw new Error("Flow session not found");

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || flowSession.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    // Mark flow session as ended
    await ctx.db.patch(args.flowId, {
      endedAt: Date.now(),
    });

    return {
      completedPomos: flowSession.completedPomos,
      duration: Date.now() - flowSession.startedAt,
    };
  },
});

/**
 * Get current active flow session for user
 */
export const getActiveFlowSession = query({
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
      .query("flowSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("endedAt"), undefined))
      .first();
  },
});

/**
 * Get user's longest flow session (by completed pomos)
 */
export const getLongestFlowSession = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    // Get all completed flow sessions for this user
    const flowSessions = await ctx.db
      .query("flowSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.neq(q.field("endedAt"), undefined))
      .collect();

    if (flowSessions.length === 0) return null;

    // Find the longest one
    const longest = flowSessions.reduce((max, current) =>
      current.completedPomos > max.completedPomos ? current : max
    );

    return {
      completedPomos: longest.completedPomos,
      startedAt: longest.startedAt,
      endedAt: longest.endedAt,
      duration: longest.endedAt ? longest.endedAt - longest.startedAt : 0,
    };
  },
});
