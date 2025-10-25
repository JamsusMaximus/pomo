/**
 * @fileoverview Accountability challenge system for group challenges
 * @module convex/accountabilityChallenges
 *
 * Key responsibilities:
 * - Create and manage group accountability challenges
 * - Track daily progress for all participants
 * - Automatically fail challenge if anyone misses a day
 * - Award badges when challenge completes successfully
 *
 * Dependencies: Convex server runtime, pomodoros.ts (for progress tracking)
 * Used by: app/challenges/page.tsx (challenge management UI)
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx, MutationCtx } from "./_generated/server";

/**
 * Generate a unique 6-character join code (alphanumeric)
 */
function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous chars (0, O, 1, I)
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Get all dates between start and end (inclusive)
 * Returns array of YYYY-MM-DD strings
 */
function getDatesBetween(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split("T")[0]);
  }

  return dates;
}

/**
 * Calculate how many pomodoros a user completed on a specific date
 */
async function calculatePomosForUserOnDate(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  date: string
): Promise<number> {
  // Parse date to get start/end timestamps
  const dateObj = new Date(date);
  const startOfDay = dateObj.getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

  // Query all focus pomodoros for this user on this date
  const pomodoros = await ctx.db
    .query("pomodoros")
    .withIndex("by_user_and_date", (q) =>
      q.eq("userId", userId).gte("completedAt", startOfDay).lt("completedAt", endOfDay)
    )
    .collect();

  // Count only focus sessions
  return pomodoros.filter((p) => p.mode === "focus").length;
}

/**
 * Update daily progress for a specific user on a specific date
 */
async function updateDailyProgress(
  ctx: MutationCtx,
  challengeId: Id<"accountabilityChallenges">,
  userId: Id<"users">,
  date: string,
  requiredPomos: number
): Promise<void> {
  const pomosCompleted = await calculatePomosForUserOnDate(ctx, userId, date);
  const completed = pomosCompleted >= requiredPomos;

  // Check if progress record exists
  const existing = await ctx.db
    .query("accountabilityChallengeDailyProgress")
    .withIndex("by_challenge_and_user", (q) =>
      q.eq("challengeId", challengeId).eq("userId", userId)
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
      challengeId,
      userId,
      date,
      pomosCompleted,
      completed,
    });
  }
}

/**
 * Check if challenge should fail (someone missed a day that has passed)
 */
async function checkIfChallengeFailed(
  ctx: MutationCtx,
  challenge: Doc<"accountabilityChallenges">
): Promise<void> {
  // Only check active challenges
  if (challenge.status !== "active") return;

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const challengeDates = getDatesBetween(challenge.startDate, challenge.endDate);

  // Get all participants
  const participants = await ctx.db
    .query("accountabilityChallengeParticipants")
    .withIndex("by_challenge", (q) => q.eq("challengeId", challenge._id))
    .collect();

  // Check each date that has passed
  for (const date of challengeDates) {
    if (date > today) break; // Don't check future dates

    // Check each participant's progress for this date
    for (const participant of participants) {
      const progress = await ctx.db
        .query("accountabilityChallengeDailyProgress")
        .withIndex("by_challenge_and_user", (q) =>
          q.eq("challengeId", challenge._id).eq("userId", participant.userId)
        )
        .filter((q) => q.eq(q.field("date"), date))
        .first();

      // If this date has passed and user didn't complete it, challenge fails
      if (date < today && (!progress || !progress.completed)) {
        await ctx.db.patch(challenge._id, {
          status: "failed",
          failedOn: date,
          failedByUserId: participant.userId,
          completedAt: Date.now(),
        });
        return;
      }
    }
  }
}

/**
 * Check if challenge should be marked as completed (all participants finished all days)
 */
async function checkIfChallengeCompleted(
  ctx: MutationCtx,
  challenge: Doc<"accountabilityChallenges">
): Promise<void> {
  // Only check active challenges
  if (challenge.status !== "active") return;

  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // Challenge can only complete if end date has passed
  if (challenge.endDate >= today) return;

  const challengeDates = getDatesBetween(challenge.startDate, challenge.endDate);

  // Get all participants
  const participants = await ctx.db
    .query("accountabilityChallengeParticipants")
    .withIndex("by_challenge", (q) => q.eq("challengeId", challenge._id))
    .collect();

  // Check if all participants completed all days
  for (const participant of participants) {
    for (const date of challengeDates) {
      const progress = await ctx.db
        .query("accountabilityChallengeDailyProgress")
        .withIndex("by_challenge_and_user", (q) =>
          q.eq("challengeId", challenge._id).eq("userId", participant.userId)
        )
        .filter((q) => q.eq(q.field("date"), date))
        .first();

      if (!progress || !progress.completed) {
        // Someone didn't complete a day - don't mark as completed yet
        return;
      }
    }
  }

  // All participants completed all days!
  await ctx.db.patch(challenge._id, {
    status: "completed",
    completedAt: Date.now(),
  });

  // Award badges to all participants
  await awardTeamPlayerBadge(ctx, challenge._id);
}

/**
 * Award "Team Player" badge to all participants of a completed challenge
 */
async function awardTeamPlayerBadge(
  ctx: MutationCtx,
  challengeId: Id<"accountabilityChallenges">
): Promise<void> {
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
      type: "total", // Using total type for now
      target: 1,
      badge: "Users",
      recurring: true,
      active: true,
      createdAt: Date.now(),
    });
    teamPlayerChallenge = await ctx.db.get(challengeId);
  }

  if (!teamPlayerChallenge) return;

  // Get all participants
  const participants = await ctx.db
    .query("accountabilityChallengeParticipants")
    .withIndex("by_challenge", (q) => q.eq("challengeId", challengeId))
    .collect();

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
    }
  }
}

/**
 * Create a new accountability challenge
 */
export const createAccountabilityChallenge = mutation({
  args: {
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    startDate: v.string(), // YYYY-MM-DD
    durationDays: v.number(), // 2-365
    minDailyPomos: v.number(), // 1-50
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // Validate inputs
    if (args.durationDays < 2 || args.durationDays > 365) {
      throw new Error("Duration must be between 2 and 365 days");
    }
    if (args.minDailyPomos < 1 || args.minDailyPomos > 50) {
      throw new Error("Minimum daily pomos must be between 1 and 50");
    }

    // Validate start date is in the future
    const startDate = new Date(args.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      throw new Error("Start date must be in the future");
    }

    // Calculate end date based on duration
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + args.durationDays - 1); // -1 because start date is day 1
    const endDateStr = endDate.toISOString().split("T")[0];

    // Generate name if not provided: "7 Days · 3 Pomos Daily"
    const name =
      args.name ||
      `${args.durationDays} Day${args.durationDays !== 1 ? "s" : ""} · ${args.minDailyPomos} Pomo${args.minDailyPomos !== 1 ? "s" : ""} Daily`;

    // Generate unique join code
    let joinCode = generateJoinCode();
    let existing = await ctx.db
      .query("accountabilityChallenges")
      .withIndex("by_join_code", (q) => q.eq("joinCode", joinCode))
      .first();

    // Regenerate if collision (very unlikely)
    while (existing) {
      joinCode = generateJoinCode();
      existing = await ctx.db
        .query("accountabilityChallenges")
        .withIndex("by_join_code", (q) => q.eq("joinCode", joinCode))
        .first();
    }

    // Create challenge
    const challengeId = await ctx.db.insert("accountabilityChallenges", {
      creatorId: user._id,
      name,
      description: args.description,
      joinCode,
      startDate: args.startDate,
      endDate: endDateStr,
      durationDays: args.durationDays,
      status: "pending",
      requiredPomosPerDay: args.minDailyPomos,
      createdAt: Date.now(),
    });

    // Add creator as first participant
    await ctx.db.insert("accountabilityChallengeParticipants", {
      challengeId,
      userId: user._id,
      joinedAt: Date.now(),
      role: "creator",
    });

    return { challengeId, joinCode };
  },
});

/**
 * Update a challenge's settings (only before it starts)
 */
export const updateAccountabilityChallenge = mutation({
  args: {
    challengeId: v.id("accountabilityChallenges"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    startDate: v.optional(v.string()),
    durationDays: v.optional(v.number()),
    minDailyPomos: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) throw new Error("Challenge not found");

    // Only creator can edit
    if (challenge.creatorId !== user._id) {
      throw new Error("Only the creator can edit this pact");
    }

    // Can't edit if challenge has already started
    if (challenge.status !== "pending") {
      throw new Error("Cannot edit a pact that has already started");
    }

    // Validate inputs if provided
    if (args.durationDays !== undefined && (args.durationDays < 2 || args.durationDays > 365)) {
      throw new Error("Duration must be between 2 and 365 days");
    }
    if (args.minDailyPomos !== undefined && (args.minDailyPomos < 1 || args.minDailyPomos > 50)) {
      throw new Error("Minimum daily pomos must be between 1 and 50");
    }

    // Validate start date if provided
    if (args.startDate) {
      const startDate = new Date(args.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (startDate < today) {
        throw new Error("Start date must be in the future");
      }
    }

    // Calculate new values with backwards compatibility
    const startDate = args.startDate || challenge.startDate;

    // For old pacts without durationDays, calculate from dates
    const oldDuration =
      challenge.durationDays ||
      Math.ceil(
        (new Date(challenge.endDate).getTime() - new Date(challenge.startDate).getTime()) /
          (24 * 60 * 60 * 1000)
      ) + 1;

    const durationDays = (args.durationDays ?? oldDuration) as number;
    const minDailyPomos = (args.minDailyPomos ?? challenge.requiredPomosPerDay ?? 1) as number;

    // Calculate end date
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays - 1);
    const endDateStr = endDate.toISOString().split("T")[0];

    // Generate name if not provided and no custom name set
    let name = args.name !== undefined ? args.name : challenge.name;
    if (!name) {
      name = `${durationDays} Day${durationDays !== 1 ? "s" : ""} · ${minDailyPomos} Pomo${minDailyPomos !== 1 ? "s" : ""} Daily`;
    }

    // Update challenge
    await ctx.db.patch(args.challengeId, {
      name,
      description: args.description !== undefined ? args.description : challenge.description,
      startDate,
      endDate: endDateStr,
      durationDays,
      requiredPomosPerDay: minDailyPomos,
    });

    return { success: true };
  },
});

/**
 * Join a challenge via join code
 */
export const joinAccountabilityChallenge = mutation({
  args: {
    joinCode: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // Find challenge
    const challenge = await ctx.db
      .query("accountabilityChallenges")
      .withIndex("by_join_code", (q) => q.eq("joinCode", args.joinCode.toUpperCase()))
      .first();

    if (!challenge) throw new Error("Challenge not found");

    // Can't join if challenge has ended
    if (challenge.status === "completed" || challenge.status === "failed") {
      throw new Error("Challenge has ended");
    }

    // Allow joining on the start date (until 23:59), but not after
    const today = new Date().toISOString().split("T")[0];
    if (today > challenge.startDate) {
      throw new Error("Challenge has already started");
    }

    // Check if already participating
    const existing = await ctx.db
      .query("accountabilityChallengeParticipants")
      .withIndex("by_challenge_and_user", (q) =>
        q.eq("challengeId", challenge._id).eq("userId", user._id)
      )
      .first();

    if (existing) throw new Error("Already participating in this challenge");

    // Add participant
    await ctx.db.insert("accountabilityChallengeParticipants", {
      challengeId: challenge._id,
      userId: user._id,
      joinedAt: Date.now(),
      role: "participant",
    });

    return { success: true, challengeId: challenge._id };
  },
});

/**
 * Leave a challenge (only if it hasn't started yet)
 */
export const leaveAccountabilityChallenge = mutation({
  args: {
    challengeId: v.id("accountabilityChallenges"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) throw new Error("Challenge not found");

    // Can't leave if challenge has already started
    if (challenge.status !== "pending") {
      throw new Error("Cannot leave a challenge that has already started");
    }

    // Find and remove participant record
    const participant = await ctx.db
      .query("accountabilityChallengeParticipants")
      .withIndex("by_challenge_and_user", (q) =>
        q.eq("challengeId", args.challengeId).eq("userId", user._id)
      )
      .first();

    if (!participant) throw new Error("Not participating in this challenge");

    await ctx.db.delete(participant._id);

    return { success: true };
  },
});

/**
 * Get all challenges for the current user
 */
export const getMyAccountabilityChallenges = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { pending: [], active: [], past: [] };

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return { pending: [], active: [], past: [] };

    // Get all participations
    const participations = await ctx.db
      .query("accountabilityChallengeParticipants")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get all challenges
    const challenges = await Promise.all(participations.map((p) => ctx.db.get(p.challengeId)));

    // Filter out null challenges and categorize
    const validChallenges = challenges.filter(
      (c) => c !== null
    ) as Doc<"accountabilityChallenges">[];

    const pending = validChallenges.filter((c) => c.status === "pending");
    const active = validChallenges.filter((c) => c.status === "active");
    const past = validChallenges.filter((c) => c.status === "completed" || c.status === "failed");

    return { pending, active, past };
  },
});

/**
 * Get challenge details including all participants and progress
 */
export const getChallengeDetails = query({
  args: {
    challengeId: v.id("accountabilityChallenges"),
  },
  handler: async (ctx, args) => {
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) return null;

    // Get all participants
    const participantRecords = await ctx.db
      .query("accountabilityChallengeParticipants")
      .withIndex("by_challenge", (q) => q.eq("challengeId", args.challengeId))
      .collect();

    const participants = await Promise.all(
      participantRecords.map(async (p) => {
        const user = await ctx.db.get(p.userId);
        return {
          userId: p.userId,
          username: user?.username || "Unknown",
          avatarUrl: user?.avatarUrl,
          role: p.role,
          joinedAt: p.joinedAt,
        };
      })
    );

    // Get all daily progress
    const allProgress = await ctx.db
      .query("accountabilityChallengeDailyProgress")
      .withIndex("by_challenge_and_date", (q) => q.eq("challengeId", args.challengeId))
      .collect();

    // Organize progress by user and date
    const progressByUser: Record<
      string,
      Record<string, { pomosCompleted: number; completed: boolean }>
    > = {};

    for (const progress of allProgress) {
      const userIdStr = progress.userId;
      if (!progressByUser[userIdStr]) {
        progressByUser[userIdStr] = {};
      }
      progressByUser[userIdStr][progress.date] = {
        pomosCompleted: progress.pomosCompleted,
        completed: progress.completed,
      };
    }

    return {
      ...challenge,
      participants,
      progressByUser,
    };
  },
});

/**
 * Get challenge by join code (for preview before joining)
 */
export const getChallengeByJoinCode = query({
  args: {
    joinCode: v.string(),
  },
  handler: async (ctx, args) => {
    const challenge = await ctx.db
      .query("accountabilityChallenges")
      .withIndex("by_join_code", (q) => q.eq("joinCode", args.joinCode.toUpperCase()))
      .first();

    if (!challenge) return null;

    // Get participant count
    const participantRecords = await ctx.db
      .query("accountabilityChallengeParticipants")
      .withIndex("by_challenge", (q) => q.eq("challengeId", challenge._id))
      .collect();

    const participants = await Promise.all(
      participantRecords.map(async (p) => {
        const user = await ctx.db.get(p.userId);
        return {
          username: user?.username || "Unknown",
          avatarUrl: user?.avatarUrl,
        };
      })
    );

    return {
      ...challenge,
      participants,
    };
  },
});

/**
 * Internal mutation: Check and update challenge status after a pomodoro is completed
 * This is called by the saveSession mutation in pomodoros.ts
 */
export const checkAndUpdateChallengeStatus = internalMutation({
  args: {
    userId: v.id("users"),
    completedAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Get user's active challenges
    const participations = await ctx.db
      .query("accountabilityChallengeParticipants")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const completedDate = new Date(args.completedAt).toISOString().split("T")[0];

    for (const participation of participations) {
      const challenge = await ctx.db.get(participation.challengeId);
      if (!challenge) continue;

      // Only process active or pending challenges
      if (challenge.status !== "active" && challenge.status !== "pending") continue;

      // Activate challenge if start date has arrived
      const today = new Date().toISOString().split("T")[0];
      if (challenge.status === "pending" && challenge.startDate <= today) {
        await ctx.db.patch(challenge._id, { status: "active" });
      }

      // Check if this pomo is within challenge date range
      if (completedDate >= challenge.startDate && completedDate <= challenge.endDate) {
        // Update daily progress for this user on this date
        await updateDailyProgress(
          ctx,
          challenge._id,
          args.userId,
          completedDate,
          (challenge.requiredPomosPerDay ?? 1) as number
        );

        // Check if challenge should fail or complete
        await checkIfChallengeFailed(ctx, challenge);

        // Refresh challenge data after potential status change
        const updatedChallenge = await ctx.db.get(challenge._id);
        if (updatedChallenge) {
          await checkIfChallengeCompleted(ctx, updatedChallenge);
        }
      }
    }
  },
});

/**
 * Get active challenges that need completion today
 */
export const getActiveChallengesForToday = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return [];

    const today = new Date().toISOString().split("T")[0];

    // Get user's active challenges
    const participations = await ctx.db
      .query("accountabilityChallengeParticipants")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const activeChallenges = [];

    for (const participation of participations) {
      const challenge = await ctx.db.get(participation.challengeId);
      if (!challenge || challenge.status !== "active") continue;

      // Check if today is within challenge date range
      if (today >= challenge.startDate && today <= challenge.endDate) {
        // Check if user has completed today
        const progress = await ctx.db
          .query("accountabilityChallengeDailyProgress")
          .withIndex("by_challenge_and_user", (q) =>
            q.eq("challengeId", challenge._id).eq("userId", user._id)
          )
          .filter((q) => q.eq(q.field("date"), today))
          .first();

        // Get all participants with their avatars and completion status
        const participantRecords = await ctx.db
          .query("accountabilityChallengeParticipants")
          .withIndex("by_challenge", (q) => q.eq("challengeId", challenge._id))
          .collect();

        const participants = await Promise.all(
          participantRecords.map(async (p) => {
            const participantUser = await ctx.db.get(p.userId);

            // Check if this participant completed today
            const participantProgress = await ctx.db
              .query("accountabilityChallengeDailyProgress")
              .withIndex("by_challenge_and_user", (q) =>
                q.eq("challengeId", challenge._id).eq("userId", p.userId)
              )
              .filter((q) => q.eq(q.field("date"), today))
              .first();

            return {
              userId: p.userId,
              username: participantUser?.username || "Unknown",
              avatarUrl: participantUser?.avatarUrl,
              role: p.role,
              completedToday: participantProgress?.completed || false,
            };
          })
        );

        activeChallenges.push({
          ...challenge,
          completedToday: progress?.completed || false,
          pomosToday: progress?.pomosCompleted || 0,
          participants,
        });
      }
    }

    return activeChallenges;
  },
});

/**
 * Mutation: Activate pending pacts that should start today or earlier
 * Call this on page load to ensure pacts activate at the right time
 */
export const activatePendingPacts = mutation({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split("T")[0];

    // Find all pending challenges that should be active
    const pendingChallenges = await ctx.db
      .query("accountabilityChallenges")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    let activatedCount = 0;

    for (const challenge of pendingChallenges) {
      if (challenge.startDate <= today) {
        await ctx.db.patch(challenge._id, { status: "active" });
        activatedCount++;
      }
    }

    return { activatedCount };
  },
});

/**
 * Mutation: Check and complete finished pacts
 * Call this on page load to mark completed pacts
 */
export const checkCompletedPacts = mutation({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split("T")[0];

    // Find all active challenges that have ended
    const activeChallenges = await ctx.db
      .query("accountabilityChallenges")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    let completedCount = 0;
    let failedCount = 0;

    for (const challenge of activeChallenges) {
      // Skip if end date hasn't passed
      if (challenge.endDate >= today) continue;

      // Check if challenge should fail or complete
      await checkIfChallengeFailed(ctx, challenge);

      // Refresh challenge data after potential status change
      const updatedChallenge = await ctx.db.get(challenge._id);
      if (updatedChallenge && updatedChallenge.status === "active") {
        await checkIfChallengeCompleted(ctx, updatedChallenge);

        // Check final status
        const finalChallenge = await ctx.db.get(challenge._id);
        if (finalChallenge?.status === "completed") {
          completedCount++;
        } else if (finalChallenge?.status === "failed") {
          failedCount++;
        }
      }
    }

    return { completedCount, failedCount };
  },
});
