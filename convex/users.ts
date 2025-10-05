import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";

/**
 * Generates a unique username from a full name.
 * Uses a random suffix to avoid N+1 database queries.
 *
 * Algorithm:
 * 1. Sanitize name to create base username
 * 2. Add 4-digit random suffix
 * 3. If collision (rare), fallback to timestamp
 *
 * Performance: O(1) instead of O(N) - single DB query instead of loop
 *
 * @param ctx - Mutation context with database access
 * @param firstName - User's first name (optional)
 * @param lastName - User's last name (optional)
 * @returns Unique username string
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

  // Generate random 4-digit suffix (1000-9999)
  // This gives 9000 possible combinations, making collisions rare
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const candidate = `${baseUsername}${randomSuffix}`;

  // Check if this username is available (single query)
  const existing = await ctx.db
    .query("users")
    .filter((q) => q.eq(q.field("username"), candidate))
    .first();

  if (!existing) {
    return candidate;
  }

  // Collision (extremely rare) - fallback to timestamp for guaranteed uniqueness
  return `${baseUsername}${Date.now()}`;
}

/**
 * Ensures a user exists in the database.
 *
 * Security: Uses Clerk auth context - cannot be spoofed by clients.
 * The clerkId comes from verified JWT, not user input.
 *
 * Features:
 * - Auto-generates unique username from firstName + lastName
 * - Idempotent: safe to call multiple times
 * - Returns user info for frontend sync
 *
 * @param args.firstName - User's first name from Clerk (optional)
 * @param args.lastName - User's last name from Clerk (optional)
 * @param args.avatarUrl - User's avatar URL from Clerk (optional)
 * @returns Object with userId, username, and isNew flag
 * @throws Error if not authenticated
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
 *
 * @returns User object if authenticated, null otherwise
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
 *
 * Security: Requires authentication to access user data.
 *
 * @param args.userId - The ID of the user to fetch
 * @returns User object or null if not found
 * @throws Error if not authenticated
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
