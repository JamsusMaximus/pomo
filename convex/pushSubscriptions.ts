/**
 * @fileoverview Push subscription management for PWA notifications
 * @module convex/pushSubscriptions
 *
 * Key responsibilities:
 * - Store and manage user push subscriptions
 * - Handle subscription creation, updates, and removal
 * - Track subscription usage and validity
 *
 * Dependencies: Convex server runtime
 * Used by: Frontend PWA notification setup
 */

import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Subscribe to push notifications
 * Stores the push subscription for a user
 */
export const subscribe = mutation({
  args: {
    endpoint: v.string(),
    keys: v.object({
      p256dh: v.string(),
      auth: v.string(),
    }),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // Check if subscription already exists for this endpoint
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();

    if (existing) {
      // Update existing subscription (keys might have changed)
      await ctx.db.patch(existing._id, {
        userId: user._id,
        keys: args.keys,
        userAgent: args.userAgent,
        lastUsed: Date.now(),
      });
      return { subscriptionId: existing._id, message: "Subscription updated" };
    }

    // Create new subscription
    const subscriptionId = await ctx.db.insert("pushSubscriptions", {
      userId: user._id,
      endpoint: args.endpoint,
      keys: args.keys,
      userAgent: args.userAgent,
      createdAt: Date.now(),
      lastUsed: Date.now(),
    });

    return { subscriptionId, message: "Subscription created" };
  },
});

/**
 * Unsubscribe from push notifications
 * Removes the push subscription for current device
 */
export const unsubscribe = mutation({
  args: {
    endpoint: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const subscription = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();

    if (!subscription) {
      return { message: "Subscription not found" };
    }

    await ctx.db.delete(subscription._id);
    return { message: "Subscription removed" };
  },
});

/**
 * Get all push subscriptions for current user
 */
export const getMySubscriptions = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return [];

    const subscriptions = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return subscriptions.map((sub) => ({
      _id: sub._id,
      endpoint: sub.endpoint,
      userAgent: sub.userAgent,
      createdAt: sub.createdAt,
      lastUsed: sub.lastUsed,
    }));
  },
});

/**
 * Get subscription count (for admin stats)
 */
export const getSubscriptionStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check if user is admin (you might want to add an isAdmin field to users)
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const allSubscriptions = await ctx.db.query("pushSubscriptions").collect();
    const uniqueUsers = new Set(allSubscriptions.map((s) => s.userId));

    // Get subscriptions by last used (active vs inactive)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const activeSubscriptions = allSubscriptions.filter(
      (s) => s.lastUsed && s.lastUsed > thirtyDaysAgo
    );

    return {
      total: allSubscriptions.length,
      uniqueUsers: uniqueUsers.size,
      active: activeSubscriptions.length,
      inactive: allSubscriptions.length - activeSubscriptions.length,
    };
  },
});

/**
 * Get all subscriptions (for sending notifications)
 * Admin only
 */
export const getAllSubscriptions = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Admin check
    const adminEmails = getAdminEmails();
    if (!adminEmails.includes(identity.email || "")) {
      throw new Error("Unauthorized: Admin access only");
    }

    const subscriptions = await ctx.db.query("pushSubscriptions").collect();
    return subscriptions;
  },
});

/**
 * Helper to get admin emails from environment
 */
function getAdminEmails(): string[] {
  const adminEmailsEnv = process.env.ADMIN_EMAILS;
  if (!adminEmailsEnv) return [];
  return adminEmailsEnv.split(",").map((email) => email.trim());
}

/**
 * Internal query to get all subscriptions (no auth required)
 * Used by Next.js API routes for sending notifications
 */
export const getAllSubscriptionsInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const subscriptions = await ctx.db.query("pushSubscriptions").collect();
    return subscriptions;
  },
});
