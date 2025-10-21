/**
 * Script to create a test user with specific stats and follow relationship
 * Run with: npx convex run scripts/create-test-friend:createTestFriend
 */

import { internalMutation } from "../convex/_generated/server";

export const createTestFriend = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Create test user
    const testUserId = await ctx.db.insert("users", {
      clerkId: `test_friend_${Date.now()}`,
      username: "testfriend",
      avatarUrl: undefined,
      totalPomos: 101,
      todayPomos: 5,
      bestDailyStreak: 12,
      privacy: "public",
      createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000, // 60 days ago
    });

    // Create 101 pomodoro sessions spread over the last 60 days
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    // Create a 12-day streak ending today
    for (let i = 0; i < 12; i++) {
      const daysAgo = 11 - i;
      const date = new Date(now - daysAgo * oneDay);
      date.setHours(14, 30, 0, 0); // 2:30 PM each day

      // 2-3 pomos per streak day
      const pomosThisDay = i === 11 ? 5 : Math.floor(Math.random() * 2) + 2;

      for (let j = 0; j < pomosThisDay; j++) {
        await ctx.db.insert("pomodoros", {
          userId: testUserId,
          mode: "focus",
          duration: 25 * 60,
          tag: ["Deep Work", "Coding", "Reading", "Writing"][Math.floor(Math.random() * 4)],
          completedAt: date.getTime() + j * 30 * 60 * 1000, // 30 min apart
        });
      }
    }

    // Create remaining pomodoros scattered in the past
    const streakPomos = 12 * 2.5; // avg 2.5 per day
    const remainingPomos = 101 - streakPomos;

    for (let i = 0; i < remainingPomos; i++) {
      const daysAgo = Math.floor(Math.random() * 48) + 12; // 12-60 days ago
      const date = new Date(now - daysAgo * oneDay);
      date.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60), 0, 0);

      await ctx.db.insert("pomodoros", {
        userId: testUserId,
        mode: "focus",
        duration: 25 * 60,
        tag: ["Deep Work", "Coding", "Reading", "Writing", "Planning"][
          Math.floor(Math.random() * 5)
        ],
        completedAt: date.getTime(),
      });
    }

    // Find jamesmcaulay2 user
    const james = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", "jamesmcaulay2"))
      .first();

    if (!james) {
      return {
        error: "jamesmcaulay2 not found",
        testUserId,
        testUsername: "testfriend",
      };
    }

    // Create follow relationship: jamesmcaulay2 follows testfriend
    await ctx.db.insert("follows", {
      followerId: james._id,
      followingId: testUserId,
      createdAt: Date.now(),
    });

    return {
      success: true,
      testUserId,
      testUsername: "testfriend",
      pomodorosCreated: 101,
      streakDays: 12,
      jamesUserId: james._id,
    };
  },
});
