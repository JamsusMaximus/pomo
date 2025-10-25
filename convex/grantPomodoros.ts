/**
 * Emergency script to manually grant pomodoros to user after production incident
 * Usage: npx convex run grantPomodoros:grantPomodoros '{"username": "jonathanevans", "count": 3, "tag": "weights"}'
 *
 * After manually adding pomodoros in the dashboard, run:
 * npx convex run grantPomodoros:resyncPactProgress '{"username": "jonathanevans"}'
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

/**
 * Helper query to list all users
 * Usage: npx convex run grantPomodoros:listUsers '{}'
 */
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();
    return allUsers.map((u) => ({
      _id: u._id,
      username: u.username,
      clerkId: u.clerkId,
    }));
  },
});

/**
 * Helper query to find users by partial username match
 * Usage: npx convex run grantPomodoros:findUser '{"search": "jonathan"}'
 */
export const findUser = query({
  args: {
    search: v.string(),
  },
  handler: async (ctx, args) => {
    const allUsers = await ctx.db.query("users").collect();
    const matches = allUsers.filter((u) =>
      u.username?.toLowerCase().includes(args.search.toLowerCase())
    );
    return matches.map((u) => ({
      _id: u._id,
      username: u.username,
      clerkId: u.clerkId,
    }));
  },
});

export const grantPomodoros = mutation({
  args: {
    username: v.string(),
    count: v.number(),
    tag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find user by username
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("username"), args.username))
      .first();

    if (!user) {
      throw new Error(`User ${args.username} not found`);
    }

    const now = Date.now();
    const today = new Date().toISOString().split("T")[0];
    const startOfDay = new Date(today).getTime();

    // Add pomodoros distributed throughout the day
    const pomodoros = [];
    for (let i = 0; i < args.count; i++) {
      // Space them out by ~1 hour (assuming 25min focus + breaks)
      const completedAt = startOfDay + i * 3600000 + 28800000; // Start at 8am

      const pomoId = await ctx.db.insert("pomodoros", {
        userId: user._id,
        tag: args.tag,
        duration: 1500, // 25 minutes
        mode: "focus",
        completedAt: completedAt,
      });

      pomodoros.push(pomoId);
    }

    // Update today's count
    await ctx.db.patch(user._id, {
      todayPomos: (user.todayPomos || 0) + args.count,
      totalPomos: (user.totalPomos || 0) + args.count,
    });

    return {
      success: true,
      username: args.username,
      pomodoros: pomodoros.length,
      message: `Granted ${args.count} pomodoros to ${args.username}`,
    };
  },
});

/**
 * Award Team Player badges for a completed pact
 * Usage: npx convex run grantPomodoros:awardBadgesForPact '{"pactId": "..."}'
 */
export const awardBadgesForPact = mutation({
  args: {
    pactId: v.id("accountabilityChallenges"),
  },
  handler: async (ctx, args) => {
    const pact = await ctx.db.get(args.pactId);
    if (!pact) {
      throw new Error("Pact not found");
    }

    // Find or create "Team Player" challenge badge
    let teamPlayerChallenge = await ctx.db
      .query("challenges")
      .filter((q) => q.eq(q.field("name"), "Team Player"))
      .first();

    if (!teamPlayerChallenge) {
      // Create the badge if it doesn't exist
      const challengeId = await ctx.db.insert("challenges", {
        name: "Team Player",
        description: "Complete an accountability pact with your team",
        type: "total",
        target: 1,
        badge: "Users",
        recurring: true,
        active: true,
        createdAt: Date.now(),
      });
      teamPlayerChallenge = await ctx.db.get(challengeId);
    }

    if (!teamPlayerChallenge) {
      throw new Error("Failed to create Team Player challenge");
    }

    // Get all participants
    const participants = await ctx.db
      .query("accountabilityChallengeParticipants")
      .withIndex("by_challenge", (q) => q.eq("challengeId", args.pactId))
      .collect();

    let badgesAwarded = 0;

    // Award badge to each participant (if they don't have it yet)
    for (const participant of participants) {
      const existing = await ctx.db
        .query("userChallenges")
        .withIndex("by_user_and_challenge", (q) =>
          q.eq("userId", participant.userId).eq("challengeId", teamPlayerChallenge!._id)
        )
        .first();

      if (!existing) {
        await ctx.db.insert("userChallenges", {
          userId: participant.userId,
          challengeId: teamPlayerChallenge._id,
          progress: 1,
          completed: true,
          completedAt: Date.now(),
        });
        badgesAwarded++;
      }
    }

    return {
      success: true,
      pactName: pact.name,
      participantsCount: participants.length,
      badgesAwarded,
      message: `Awarded Team Player badge to ${badgesAwarded} participant(s)`,
    };
  },
});

/**
 * Resync pact progress for a user after manually adding pomodoros
 * This recalculates their daily progress for all active pacts
 */
/**
 * Quick resync for Jon - hardcoded userId
 * Usage: npx convex run grantPomodoros:resyncJon '{}'
 */
export const resyncJon = mutation({
  args: {},
  handler: async (ctx) => {
    // Find Jon by clerkId
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", "user_349fXEGIchEZortJl3iScCT4Da1"))
      .first();

    if (!user) {
      throw new Error("Jon not found");
    }

    const userId = user._id;

    const date = new Date().toISOString().split("T")[0];

    // Get all user's pact participations
    const participations = await ctx.db
      .query("accountabilityChallengeParticipants")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    let updatedPacts = 0;

    for (const participation of participations) {
      const pact = await ctx.db.get(participation.challengeId);
      if (!pact) continue;

      // Only process active pacts or pacts that cover this date
      if (date >= pact.startDate && date <= pact.endDate) {
        // Recalculate pomodoros for this date
        const dateObj = new Date(date);
        const startOfDay = dateObj.getTime();
        const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

        const pomodoros = await ctx.db
          .query("pomodoros")
          .withIndex("by_user_and_date", (q) =>
            q.eq("userId", userId).gte("completedAt", startOfDay).lt("completedAt", endOfDay)
          )
          .collect();

        const pomosCompleted = pomodoros.filter((p) => p.mode === "focus").length;
        const completed = pomosCompleted >= (pact.requiredPomosPerDay || 1);

        // Update or create progress record
        const existing = await ctx.db
          .query("accountabilityChallengeDailyProgress")
          .withIndex("by_challenge_and_user", (q) =>
            q.eq("challengeId", pact._id).eq("userId", userId)
          )
          .filter((q) => q.eq(q.field("date"), date))
          .first();

        if (existing) {
          await ctx.db.patch(existing._id, {
            pomosCompleted,
            completed,
          });
        } else {
          await ctx.db.insert("accountabilityChallengeDailyProgress", {
            challengeId: pact._id,
            userId: userId,
            date,
            pomosCompleted,
            completed,
          });
        }

        updatedPacts++;
      }
    }

    return {
      success: true,
      username: user.username,
      date,
      updatedPacts,
      pomosFound: await ctx.db
        .query("pomodoros")
        .withIndex("by_user_and_date", (q) =>
          q.eq("userId", userId).gte("completedAt", new Date(date).getTime())
        )
        .collect()
        .then((p) => p.length),
      message: `Resynced ${updatedPacts} pact(s) for Jon on ${date}`,
    };
  },
});

export const resyncPactProgress = mutation({
  args: {
    username: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    date: v.optional(v.string()), // YYYY-MM-DD, defaults to today
  },
  handler: async (ctx, args) => {
    // Find user by username or userId
    let user = null;

    if (args.userId) {
      user = await ctx.db.get(args.userId);
    } else if (args.username) {
      user = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("username"), args.username))
        .first();
    } else {
      throw new Error("Must provide either username or userId");
    }

    if (!user) {
      throw new Error(`User ${args.username || args.userId} not found`);
    }

    const date = args.date || new Date().toISOString().split("T")[0];

    // Get all user's pact participations
    const participations = await ctx.db
      .query("accountabilityChallengeParticipants")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    let updatedPacts = 0;

    for (const participation of participations) {
      const pact = await ctx.db.get(participation.challengeId);
      if (!pact) continue;

      // Only process active pacts or pacts that cover this date
      if (date >= pact.startDate && date <= pact.endDate) {
        // Recalculate pomodoros for this date
        const dateObj = new Date(date);
        const startOfDay = dateObj.getTime();
        const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

        const pomodoros = await ctx.db
          .query("pomodoros")
          .withIndex("by_user_and_date", (q) =>
            q.eq("userId", user._id).gte("completedAt", startOfDay).lt("completedAt", endOfDay)
          )
          .collect();

        const pomosCompleted = pomodoros.filter((p) => p.mode === "focus").length;
        const completed = pomosCompleted >= (pact.requiredPomosPerDay || 1);

        // Update or create progress record
        const existing = await ctx.db
          .query("accountabilityChallengeDailyProgress")
          .withIndex("by_challenge_and_user", (q) =>
            q.eq("challengeId", pact._id).eq("userId", user._id)
          )
          .filter((q) => q.eq(q.field("date"), date))
          .first();

        if (existing) {
          await ctx.db.patch(existing._id, {
            pomosCompleted,
            completed,
          });
        } else {
          await ctx.db.insert("accountabilityChallengeDailyProgress", {
            challengeId: pact._id,
            userId: user._id,
            date,
            pomosCompleted,
            completed,
          });
        }

        updatedPacts++;
      }
    }

    return {
      success: true,
      username: user.username || args.username,
      date,
      updatedPacts,
      message: `Resynced ${updatedPacts} pact(s) for ${user.username || args.username} on ${date}`,
    };
  },
});
