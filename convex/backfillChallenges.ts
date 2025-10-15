/**
 * Migration script to backfill challenge progress for existing users
 * Run with: npx convex run backfillChallenges:backfillAllUsers
 */

import { internalMutation } from "./_generated/server";

export const backfillAllUsers = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get all users
    const users = await ctx.db.query("users").collect();

    console.log(`Found ${users.length} users to backfill`);

    let usersProcessed = 0;
    let challengesCreated = 0;

    for (const user of users) {
      // Check if user already has challenge progress
      const existingProgress = await ctx.db
        .query("userChallenges")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();

      // Skip users who already have challenge progress
      if (existingProgress) {
        continue;
      }

      // Get all user's pomodoros
      const pomodoros = await ctx.db
        .query("pomodoros")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();

      // Skip users with no pomodoros
      if (pomodoros.length === 0) {
        continue;
      }

      console.log(`Processing user ${user.username} with ${pomodoros.length} pomodoros`);

      // Get all active challenges
      const challenges = await ctx.db
        .query("challenges")
        .withIndex("by_active", (q) => q.eq("active", true))
        .collect();

      // If no challenges exist, skip (should be seeded by updateChallengeProgress)
      if (challenges.length === 0) {
        console.log("No challenges found, skipping");
        continue;
      }

      // Calculate progress for each challenge
      for (const challenge of challenges) {
        let progress = 0;
        let completed = false;
        let completedAt: number | undefined;

        if (challenge.type === "total") {
          // Total pomodoros count
          progress = user.totalPomos || 0;
        } else if (challenge.type === "streak") {
          // Use best streak
          progress = user.bestDailyStreak || 0;
        } else if (challenge.type === "daily") {
          // Count days with at least 1 pomo (approximate)
          const uniqueDays = new Set(
            pomodoros.map((p) => {
              const date = new Date(p.completedAt);
              return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            })
          );
          progress = uniqueDays.size;
        }

        // Check if completed
        if (progress >= challenge.target) {
          completed = true;
          // Find the pomodoro that would have completed this challenge
          if (challenge.type === "total" && challenge.target <= pomodoros.length) {
            // Sort pomodoros by completion time
            const sortedPomos = [...pomodoros].sort((a, b) => a.completedAt - b.completedAt);
            completedAt = sortedPomos[challenge.target - 1]?.completedAt;
          } else if (challenge.type === "streak") {
            // Use the date when they achieved their best streak
            // For now, just use the last pomo date as an approximation
            completedAt = pomodoros[pomodoros.length - 1]?.completedAt;
          } else if (challenge.type === "daily") {
            // Use approximation
            completedAt = pomodoros[pomodoros.length - 1]?.completedAt;
          }
        }

        // Create user challenge record
        await ctx.db.insert("userChallenges", {
          userId: user._id,
          challengeId: challenge._id,
          progress,
          completed,
          completedAt,
        });

        if (completed) {
          challengesCreated++;
        }
      }

      usersProcessed++;
    }

    return {
      success: true,
      usersProcessed,
      challengesCreated,
      totalUsers: users.length,
    };
  },
});
