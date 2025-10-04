import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Ensures a user exists in the database.
 * Uses Clerk auth context - cannot be spoofed by clients.
 * Idempotent: safe to call multiple times.
 */
export const ensureUser = mutation({
  args: {
    username: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get authenticated user from Clerk
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const clerkId = identity.subject;

    // Validate username
    if (!args.username || args.username.trim().length === 0) {
      throw new Error("Username cannot be empty");
    }

    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", clerkId))
      .first();

    if (existing) {
      return existing._id;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      clerkId,
      username: args.username.trim(),
      avatarUrl: args.avatarUrl,
      createdAt: Date.now(),
    });

    return userId;
  },
});

/**
 * Gets the current authenticated user.
 * Returns null if not authenticated.
 */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    return user;
  },
});

/**
 * Gets a user by their ID.
 * Only returns user if requester is authenticated.
 */
export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    return await ctx.db.get(args.userId);
  },
});
