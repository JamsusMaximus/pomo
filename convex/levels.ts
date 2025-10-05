import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const ADMIN_EMAILS = ["jddmcaulay@gmail.com"];

/**
 * Check if the current user is an admin
 */
export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    
    const email = identity.email;
    return ADMIN_EMAILS.includes(email || "");
  },
});

/**
 * Get all level configurations (fallback to default if empty)
 */
export const getLevelConfig = query({
  args: {},
  handler: async (ctx) => {
    const configs = await ctx.db
      .query("levelConfig")
      .withIndex("by_level")
      .collect();
    
    // If no configs exist, return defaults
    if (configs.length === 0) {
      return getDefaultLevelConfig();
    }
    
    return configs.sort((a, b) => a.level - b.level);
  },
});

/**
 * Update a level's title and threshold (admin only)
 */
export const updateLevel = mutation({
  args: {
    level: v.number(),
    title: v.string(),
    threshold: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !ADMIN_EMAILS.includes(identity.email || "")) {
      throw new Error("Unauthorized: Admin access only");
    }

    const existing = await ctx.db
      .query("levelConfig")
      .withIndex("by_level", (q) => q.eq("level", args.level))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        title: args.title,
        threshold: args.threshold,
      });
    } else {
      await ctx.db.insert("levelConfig", {
        level: args.level,
        title: args.title,
        threshold: args.threshold,
      });
    }

    return { success: true };
  },
});

/**
 * Seed default level configuration (admin only)
 */
export const seedLevelConfig = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !ADMIN_EMAILS.includes(identity.email || "")) {
      throw new Error("Unauthorized: Admin access only");
    }

    const existing = await ctx.db.query("levelConfig").first();
    if (existing) {
      return { message: "Level config already exists", count: 0 };
    }

    const defaults = getDefaultLevelConfig();
    const promises = defaults.map((config) =>
      ctx.db.insert("levelConfig", config)
    );

    await Promise.all(promises);

    return { message: "Level config seeded", count: defaults.length };
  },
});

/**
 * Get default level configuration
 */
function getDefaultLevelConfig() {
  return [
    { level: 1, title: "Beginner", threshold: 0 },
    { level: 2, title: "Novice", threshold: 2 },
    { level: 3, title: "Apprentice", threshold: 4 },
    { level: 4, title: "Adept", threshold: 8 },
    { level: 5, title: "Expert", threshold: 16 },
    { level: 6, title: "Master", threshold: 31 },
    { level: 7, title: "Grandmaster", threshold: 51 },
    { level: 8, title: "Legend", threshold: 76 },
    { level: 9, title: "Mythic", threshold: 106 },
    { level: 10, title: "Immortal", threshold: 141 },
    { level: 11, title: "Transcendent", threshold: 181 },
    { level: 12, title: "Eternal", threshold: 226 },
    { level: 13, title: "Divine", threshold: 276 },
    { level: 14, title: "Omniscient", threshold: 331 },
    { level: 15, title: "Ultimate", threshold: 391 },
  ];
}

