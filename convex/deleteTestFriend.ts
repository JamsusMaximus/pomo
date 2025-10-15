/**
 * Script to delete the test friend user
 * Run with: npx convex run deleteTestFriend:deleteTestFriend
 */

import { internalMutation } from "./_generated/server";

export const deleteTestFriend = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Find testfriend user
    const testFriend = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", "testfriend"))
      .first();

    if (!testFriend) {
      return { error: "testfriend not found" };
    }

    // Delete all pomodoros
    const pomodoros = await ctx.db
      .query("pomodoros")
      .withIndex("by_user", (q) => q.eq("userId", testFriend._id))
      .collect();

    for (const pomo of pomodoros) {
      await ctx.db.delete(pomo._id);
    }

    // Delete all follows
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", testFriend._id))
      .collect();

    for (const follow of follows) {
      await ctx.db.delete(follow._id);
    }

    // Delete all userChallenges
    const userChallenges = await ctx.db
      .query("userChallenges")
      .withIndex("by_user", (q) => q.eq("userId", testFriend._id))
      .collect();

    for (const challenge of userChallenges) {
      await ctx.db.delete(challenge._id);
    }

    // Delete the user
    await ctx.db.delete(testFriend._id);

    return {
      success: true,
      deletedPomodoros: pomodoros.length,
      deletedFollows: follows.length,
      deletedUserChallenges: userChallenges.length,
    };
  },
});
