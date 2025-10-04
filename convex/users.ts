import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";

/**
 * Generates a unique username from a full name.
 * If the username exists, appends numbers (1, 2, 3...).
 */
async function generateUniqueUsername(
  ctx: MutationCtx,
  firstName: string | undefined,
  lastName: string | undefined
): Promise<string> {
  // Generate base username from name
  let baseUsername = "";
  if (firstName && lastName) {
    baseUsername = `${firstName}${lastName}`.toLowerCase().replace(/[^a-z0-9]/g, "");
  } else if (firstName) {
    baseUsername = firstName.toLowerCase().replace(/[^a-z0-9]/g, "");
  } else {
    baseUsername = "user";
  }

  // If empty after sanitization, use default
  if (baseUsername.length === 0) {
    baseUsername = "user";
  }

  // Check if base username is available
  const existingWithBase = await ctx.db
    .query("users")
    .filter((q: any) => q.eq(q.field("username"), baseUsername))
    .first();

  if (!existingWithBase) {
    return baseUsername;
  }

  // Try appending numbers until we find an available username
  let counter = 1;
  while (counter < 1000) {
    // Sanity limit
    const candidate = `${baseUsername}${counter}`;
    const existing = await ctx.db
      .query("users")
      .filter((q: any) => q.eq(q.field("username"), candidate))
      .first();

    if (!existing) {
      return candidate;
    }
    counter++;
  }

  // Fallback: use timestamp
  return `${baseUsername}${Date.now()}`;
}

/**
 * Ensures a user exists in the database.
 * Uses Clerk auth context - cannot be spoofed by clients.
 * Auto-generates username from firstName + lastName.
 * Returns { userId, username, isNew } so frontend can sync to Clerk.
 * Idempotent: safe to call multiple times.
 */
export const ensureUser = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get authenticated user from Clerk
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const clerkId = identity.subject;

    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", clerkId))
      .first();

    if (existing) {
      return { userId: existing._id, username: existing.username, isNew: false };
    }

    // Generate unique username
    const username = await generateUniqueUsername(ctx, args.firstName, args.lastName);

    // Create new user
    const userId = await ctx.db.insert("users", {
      clerkId,
      username,
      avatarUrl: args.avatarUrl,
      createdAt: Date.now(),
    });

    return { userId, username, isNew: true };
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
