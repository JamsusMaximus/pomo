/**
 * @fileoverview Send push notifications to users using native fetch
 * @module convex/sendNotificationsSimple
 *
 * Key responsibilities:
 * - Send push notifications via native Web Push Protocol
 * - Log notification delivery status
 * - Handle subscription errors
 *
 * Dependencies: Native Node.js fetch, Convex actions
 * Used by: Admin panel for sending notifications
 */

import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

/**
 * Send a notification to all users with active subscriptions
 */
export const sendToAll = action({
  args: {
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
    url: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ total: number; sent: number; failed: number; errors: string[] }> => {
    // Verify admin access
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get admin emails
    const adminEmails = getAdminEmails();
    if (!adminEmails.includes(identity.email || "")) {
      throw new Error("Unauthorized: Admin access only");
    }

    // Get all subscriptions
    const subscriptions = await ctx.runQuery(api.pushSubscriptions.getAllSubscriptions);

    const results: { total: number; sent: number; failed: number; errors: string[] } = {
      total: subscriptions.length,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Prepare notification payload
    const payload = JSON.stringify({
      title: args.title,
      body: args.body,
      icon: args.icon || "/icon-192.png",
      badge: args.badge || "/icon-192.png",
      tag: args.tag,
      requireInteraction: args.requireInteraction,
      actions: args.actions,
      data: {
        url: args.url || "/",
      },
    });

    // Send to each subscription
    for (const sub of subscriptions) {
      try {
        // Use fetch to send push notification directly
        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            TTL: "86400", // 24 hours
          },
          body: payload,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Log success
        await ctx.runMutation(internal.sendNotificationsSimple.logNotification, {
          userId: sub.userId,
          status: "sent",
          ruleId: undefined,
        });

        results.sent++;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        results.failed++;
        results.errors.push(`User ${sub.userId}: ${errorMessage}`);

        // Log failure
        await ctx.runMutation(internal.sendNotificationsSimple.logNotification, {
          userId: sub.userId,
          status: "failed",
          errorMessage,
          ruleId: undefined,
        });

        // If subscription is expired (410), delete it
        if (errorMessage.includes("410")) {
          await ctx.runMutation(internal.sendNotificationsSimple.deleteSubscription, {
            subscriptionId: sub._id,
          });
        }
      }
    }

    return results;
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
 * Internal mutation to log notification delivery
 */
export const logNotification = internalMutation({
  args: {
    userId: v.id("users"),
    status: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("failed"),
      v.literal("expired")
    ),
    errorMessage: v.optional(v.string()),
    ruleId: v.optional(v.id("notificationRules")),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notificationLogs", {
      userId: args.userId,
      status: args.status,
      errorMessage: args.errorMessage,
      ruleId: args.ruleId,
      sentAt: Date.now(),
    });
  },
});

/**
 * Internal mutation to delete expired subscription
 */
export const deleteSubscription = internalMutation({
  args: {
    subscriptionId: v.id("pushSubscriptions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.subscriptionId);
  },
});
