import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";

/**
 * Generates a unique username from a full name.
 * Only adds numeric suffix if there's a collision.
 *
 * Algorithm:
 * 1. Sanitize name to create base username
 * 2. Check if base username is available
 * 3. If taken, try incrementing numbers (1, 2, 3...) until unique
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

  // Try base username first (no suffix)
  let candidate = baseUsername;
  let existing = await ctx.db
    .query("users")
    .filter((q) => q.eq(q.field("username"), candidate))
    .first();

  if (!existing) {
    return candidate;
  }

  // Base username is taken, try adding numbers
  let suffix = 1;
  while (existing) {
    candidate = `${baseUsername}${suffix}`;
    existing = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("username"), candidate))
      .first();

    if (!existing) {
      return candidate;
    }

    suffix++;

    // Safety limit to prevent infinite loop
    if (suffix > 10000) {
      return `${baseUsername}${Date.now()}`;
    }
  }

  return candidate;
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
