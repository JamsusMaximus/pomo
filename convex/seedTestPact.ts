/**
 * Seed script to create a test pact with dummy data
 * Run with: npx convex run seedTestPact:seedTestPact
 */

import { mutation } from "./_generated/server";

export const seedTestPact = mutation({
  args: {},
  handler: async (ctx) => {
    // Find jamesmcaulay2
    const mainUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("username"), "jamesmcaulay2"))
      .first();

    if (!mainUser) {
      throw new Error("User jamesmcaulay2 not found. Please sign in first.");
    }

    // Create 2 dummy users
    const dummyUser1 = await ctx.db.insert("users", {
      clerkId: `dummy_${Date.now()}_1`,
      username: "alice_focus",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=alice",
      createdAt: Date.now(),
    });

    const dummyUser2 = await ctx.db.insert("users", {
      clerkId: `dummy_${Date.now()}_2`,
      username: "bob_productive",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=bob",
      createdAt: Date.now(),
    });

    // Calculate dates: started yesterday, so today is day 2
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const startDate = yesterday.toISOString().split("T")[0]; // YYYY-MM-DD

    const dayAfterTomorrow = new Date(now);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    const endDate = dayAfterTomorrow.toISOString().split("T")[0];

    // Generate join code
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let joinCode = "";
    for (let i = 0; i < 6; i++) {
      joinCode += chars[Math.floor(Math.random() * chars.length)];
    }

    // Create the pact with the date in the name
    const pactId = await ctx.db.insert("accountabilityChallenges", {
      creatorId: mainUser._id,
      name: `21 Oct Pact`,
      joinCode,
      startDate,
      endDate,
      durationDays: 4,
      status: "active",
      requiredPomosPerDay: 1,
      createdAt: yesterday.getTime(),
    });

    // Add all 3 participants
    await ctx.db.insert("accountabilityChallengeParticipants", {
      challengeId: pactId,
      userId: mainUser._id,
      role: "creator",
      joinedAt: yesterday.getTime(),
    });

    await ctx.db.insert("accountabilityChallengeParticipants", {
      challengeId: pactId,
      userId: dummyUser1,
      role: "participant",
      joinedAt: yesterday.getTime(),
    });

    await ctx.db.insert("accountabilityChallengeParticipants", {
      challengeId: pactId,
      userId: dummyUser2,
      role: "participant",
      joinedAt: yesterday.getTime(),
    });

    const today = now.toISOString().split("T")[0];

    // Alice completed both days
    await ctx.db.insert("accountabilityChallengeDailyProgress", {
      challengeId: pactId,
      userId: dummyUser1,
      date: startDate,
      pomosCompleted: 1,
      completed: true,
    });

    await ctx.db.insert("accountabilityChallengeDailyProgress", {
      challengeId: pactId,
      userId: dummyUser1,
      date: today,
      pomosCompleted: 2,
      completed: true,
    });

    // Bob completed yesterday but NOT today
    await ctx.db.insert("accountabilityChallengeDailyProgress", {
      challengeId: pactId,
      userId: dummyUser2,
      date: startDate,
      pomosCompleted: 1,
      completed: true,
    });

    // Bob has NOT completed today (no progress record for today)

    // jamesmcaulay2 has NOT completed any days (no progress records)

    return {
      success: true,
      pactId,
      joinCode,
      message: `Created test pact with join code: ${joinCode}

Participants:
- ${mainUser.username} (you) - 0/2 days completed ❌
- alice_focus - 2/2 days completed ✅ (GREEN glow)
- bob_productive - 1/2 days completed ⚠️ (ORANGE/RED glow - not completed today)

Today is Day 2. You and Bob need to complete a pomodoro!`,
    };
  },
});
