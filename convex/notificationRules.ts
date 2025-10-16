/**
 * @fileoverview Notification rules management system
 * @module convex/notificationRules
 *
 * Key responsibilities:
 * - Create, update, and delete notification rules
 * - Query rules for admin interface
 * - Validate rule configurations
 *
 * Dependencies: Convex server runtime
 * Used by: Admin panel for notification management
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a new notification rule
 */
export const createRule = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    enabled: v.boolean(),
    trigger: v.union(
      v.literal("inactivity"),
      v.literal("streak_risk"),
      v.literal("challenge_available"),
      v.literal("friend_activity"),
      v.literal("daily_goal"),
      v.literal("manual")
    ),
    config: v.object({
      inactivityHours: v.optional(v.number()),
      hoursBeforeExpiry: v.optional(v.number()),
      targetAudience: v.optional(
        v.union(
          v.literal("all"),
          v.literal("active"),
          v.literal("inactive"),
          v.literal("streak_holders")
        )
      ),
    }),
    notification: v.object({
      title: v.string(),
      body: v.string(),
      icon: v.optional(v.string()),
      badge: v.optional(v.string()),
      tag: v.optional(v.string()),
      requireInteraction: v.optional(v.boolean()),
      actions: v.optional(
        v.array(
          v.object({
            action: v.string(),
            title: v.string(),
          })
        )
      ),
      data: v.optional(
        v.object({
          url: v.optional(v.string()),
        })
      ),
    }),
    schedule: v.optional(
      v.object({
        type: v.union(v.literal("immediate"), v.literal("daily"), v.literal("interval")),
        hourUTC: v.optional(v.number()),
        minuteUTC: v.optional(v.number()),
        intervalHours: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // TODO: Add admin check here
    // if (!user.isAdmin) throw new Error("Not authorized");

    const ruleId = await ctx.db.insert("notificationRules", {
      name: args.name,
      description: args.description,
      enabled: args.enabled,
      trigger: args.trigger,
      config: args.config,
      notification: args.notification,
      schedule: args.schedule,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: user._id,
    });

    return { ruleId, message: "Rule created successfully" };
  },
});

/**
 * Update an existing notification rule
 */
export const updateRule = mutation({
  args: {
    ruleId: v.id("notificationRules"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
    trigger: v.optional(
      v.union(
        v.literal("inactivity"),
        v.literal("streak_risk"),
        v.literal("challenge_available"),
        v.literal("friend_activity"),
        v.literal("daily_goal"),
        v.literal("manual")
      )
    ),
    config: v.optional(
      v.object({
        inactivityHours: v.optional(v.number()),
        hoursBeforeExpiry: v.optional(v.number()),
        targetAudience: v.optional(
          v.union(
            v.literal("all"),
            v.literal("active"),
            v.literal("inactive"),
            v.literal("streak_holders")
          )
        ),
      })
    ),
    notification: v.optional(
      v.object({
        title: v.string(),
        body: v.string(),
        icon: v.optional(v.string()),
        badge: v.optional(v.string()),
        tag: v.optional(v.string()),
        requireInteraction: v.optional(v.boolean()),
        actions: v.optional(
          v.array(
            v.object({
              action: v.string(),
              title: v.string(),
            })
          )
        ),
        data: v.optional(
          v.object({
            url: v.optional(v.string()),
          })
        ),
      })
    ),
    schedule: v.optional(
      v.object({
        type: v.union(v.literal("immediate"), v.literal("daily"), v.literal("interval")),
        hourUTC: v.optional(v.number()),
        minuteUTC: v.optional(v.number()),
        intervalHours: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // TODO: Add admin check here

    const rule = await ctx.db.get(args.ruleId);
    if (!rule) throw new Error("Rule not found");

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.enabled !== undefined) updates.enabled = args.enabled;
    if (args.trigger !== undefined) updates.trigger = args.trigger;
    if (args.config !== undefined) updates.config = args.config;
    if (args.notification !== undefined) updates.notification = args.notification;
    if (args.schedule !== undefined) updates.schedule = args.schedule;

    await ctx.db.patch(args.ruleId, updates);

    return { message: "Rule updated successfully" };
  },
});

/**
 * Delete a notification rule
 */
export const deleteRule = mutation({
  args: {
    ruleId: v.id("notificationRules"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // TODO: Add admin check here

    await ctx.db.delete(args.ruleId);

    return { message: "Rule deleted successfully" };
  },
});

/**
 * Get all notification rules
 */
export const getAllRules = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // TODO: Add admin check here

    const rules = await ctx.db.query("notificationRules").collect();

    return rules;
  },
});

/**
 * Get a single notification rule
 */
export const getRule = query({
  args: {
    ruleId: v.id("notificationRules"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // TODO: Add admin check here

    const rule = await ctx.db.get(args.ruleId);
    return rule;
  },
});

/**
 * Get notification logs for a rule
 */
export const getRuleLogs = query({
  args: {
    ruleId: v.id("notificationRules"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // TODO: Add admin check here

    const limit = args.limit || 50;

    const logs = await ctx.db
      .query("notificationLogs")
      .withIndex("by_rule", (q) => q.eq("ruleId", args.ruleId))
      .order("desc")
      .take(limit);

    return logs;
  },
});

/**
 * Get notification statistics
 */
export const getNotificationStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // TODO: Add admin check here

    const allLogs = await ctx.db.query("notificationLogs").collect();

    const stats = {
      total: allLogs.length,
      sent: allLogs.filter((l) => l.status === "sent").length,
      delivered: allLogs.filter((l) => l.status === "delivered").length,
      failed: allLogs.filter((l) => l.status === "failed").length,
      expired: allLogs.filter((l) => l.status === "expired").length,
    };

    const deliveryRate = stats.sent > 0 ? ((stats.delivered / stats.sent) * 100).toFixed(1) : "0.0";

    return {
      ...stats,
      deliveryRate: `${deliveryRate}%`,
    };
  },
});
