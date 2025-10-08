import { mutation } from "./_generated/server";

/**
 * One-time migration to update challenge badges from emojis to Lucide icon names
 */
export const migrateChallengeBadges = mutation({
  args: {},
  handler: async (ctx) => {
    // Emoji to Lucide icon name mapping
    const emojiToIcon: Record<string, string> = {
      "🎯": "Target",
      "🌱": "Sprout",
      "🔥": "Flame",
      "💯": "Award",
      "⭐": "Star",
      "🏆": "Trophy",
      "💪": "Swords",
      "👑": "Crown",
      "🌟": "Sparkles",
      "⚡": "Zap",
      "🎖️": "Medal",
    };

    const challenges = await ctx.db.query("challenges").collect();
    let updatedCount = 0;

    for (const challenge of challenges) {
      const newIcon = emojiToIcon[challenge.badge];
      if (newIcon) {
        await ctx.db.patch(challenge._id, { badge: newIcon });
        updatedCount++;
      }
    }

    return {
      message: "Challenge badges migrated",
      total: challenges.length,
      updated: updatedCount,
    };
  },
});
