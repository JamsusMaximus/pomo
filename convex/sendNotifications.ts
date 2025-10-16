/**
 * @fileoverview Send push notifications to users via Next.js API
 * @module convex/sendNotifications
 *
 * Key responsibilities:
 * - Send push notifications via Next.js API route
 * - Log notification delivery status
 * - Handle subscription errors
 *
 * Dependencies: Next.js API route, Convex actions
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
    const subscriptions: any[] = await ctx.runQuery(api.pushSubscriptions.getAllSubscriptions);

    const results: { total: number; sent: number; failed: number; errors: string[] } = {
      total: subscriptions.length,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Prepare notification payload
    const payload = {
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
    };

    // Get API URL and secret
    const apiUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const apiSecret = process.env.PUSH_API_SECRET;

    console.log("[Convex] API URL:", apiUrl);
    console.log("[Convex] API Secret:", apiSecret ? apiSecret.substring(0, 20) + "..." : "missing");

    if (!apiSecret) {
      throw new Error("PUSH_API_SECRET not configured");
    }

    // Send to each subscription via Next.js API
    for (const sub of subscriptions) {
      try {
        console.log("[Convex] Sending to:", `${apiUrl}/api/send-push`);
        const response = await fetch(`${apiUrl}/api/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiSecret}`,
          },
          body: JSON.stringify({
            subscription: {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.keys.p256dh,
                auth: sub.keys.auth,
              },
            },
            payload,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || `HTTP ${response.status}`);
        }

        // Log success
        await ctx.runMutation(internal.sendNotifications.logNotification, {
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
        await ctx.runMutation(internal.sendNotifications.logNotification, {
          userId: sub.userId,
          status: "failed",
          errorMessage,
          ruleId: undefined,
        });

        // If subscription is expired (410), delete it
        if (errorMessage.includes("410") || errorMessage.includes("Subscription expired")) {
          await ctx.runMutation(internal.sendNotifications.deleteSubscription, {
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
