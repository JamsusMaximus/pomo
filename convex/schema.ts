import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    username: v.string(),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
    bestDailyStreak: v.optional(v.number()), // Historical best daily streak
    // Profile customization
    bio: v.optional(v.string()), // Optional 160 char bio
    privacy: v.optional(
      v.union(v.literal("public"), v.literal("followers_only"), v.literal("private"))
    ), // Default: followers_only
    // Cached pomodoro counts for performance (updated on each session)
    totalPomos: v.optional(v.number()), // All-time total focus sessions
    todayPomos: v.optional(v.number()), // Focus sessions today
    todayDate: v.optional(v.string()), // "YYYY-MM-DD" to track when to reset
    weekPomos: v.optional(v.number()), // Focus sessions this week
    weekStartDate: v.optional(v.string()), // "YYYY-MM-DD" of Monday
    monthPomos: v.optional(v.number()), // Focus sessions this month
    monthKey: v.optional(v.string()), // "YYYY-MM" to track month changes
  })
    .index("by_clerk", ["clerkId"])
    .index("by_username", ["username"]),

  pomodoros: defineTable({
    userId: v.id("users"),
    tag: v.optional(v.string()),
    tagPrivate: v.optional(v.boolean()), // Hide tag from others (pomo itself still visible)
    duration: v.number(), // seconds
    mode: v.union(v.literal("focus"), v.literal("break")),
    completedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "completedAt"]),

  timers: defineTable({
    userId: v.id("users"),
    mode: v.union(v.literal("focus"), v.literal("break")),
    focusDuration: v.number(),
    breakDuration: v.number(),
    startedAt: v.optional(v.number()), // null if paused
    remainingAtPause: v.optional(v.number()),
    currentTag: v.optional(v.string()),
    cyclesCompleted: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  challenges: defineTable({
    name: v.string(),
    description: v.string(),
    type: v.union(
      v.literal("streak"),
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("recurring_monthly"),
      v.literal("total")
    ),
    target: v.number(),
    badge: v.string(), // emoji or icon name
    recurring: v.boolean(),
    recurringMonth: v.optional(v.number()), // 1-12 for monthly challenges
    active: v.boolean(),
    createdAt: v.number(),
  }).index("by_active", ["active"]),

  userChallenges: defineTable({
    userId: v.id("users"),
    challengeId: v.id("challenges"),
    progress: v.number(),
    completed: v.boolean(),
    completedAt: v.optional(v.number()),
    periodKey: v.optional(v.string()), // "2025-01" for recurring monthly
  })
    .index("by_user", ["userId"])
    .index("by_user_and_challenge", ["userId", "challengeId"])
    .index("by_user_completed", ["userId", "completed"]),

  levelConfig: defineTable({
    level: v.number(),
    title: v.string(),
    threshold: v.number(), // total pomos needed to reach this level
  }).index("by_level", ["level"]),

  flowSessions: defineTable({
    userId: v.id("users"),
    startedAt: v.number(),
    endedAt: v.optional(v.number()), // null if flow is still active
    completedPomos: v.number(), // number of full 25min pomos completed in this flow
  })
    .index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "startedAt"]),

  follows: defineTable({
    followerId: v.id("users"), // The user who is following
    followingId: v.id("users"), // The user being followed
    createdAt: v.number(),
  })
    .index("by_follower", ["followerId"])
    .index("by_following", ["followingId"])
    .index("by_follower_and_following", ["followerId", "followingId"]),

  accountabilityChallenges: defineTable({
    creatorId: v.id("users"),
    name: v.string(), // "Team Focus Week" or auto-generated "7 Days · 3 Pomos Daily"
    description: v.optional(v.string()), // Optional pact description (max 250 chars)
    joinCode: v.string(), // "ABC123" (6-char unique)
    startDate: v.string(), // "2025-10-21" (YYYY-MM-DD)
    endDate: v.string(), // Calculated based on durationDays
    durationDays: v.optional(v.number()), // 2-365 days (optional for backwards compatibility)
    status: v.union(
      v.literal("pending"), // Not started yet
      v.literal("active"), // Currently in progress
      v.literal("completed"), // All participants completed all days
      v.literal("failed") // Someone missed a day
    ),
    requiredPomosPerDay: v.optional(v.number()), // 1-50 pomos per day (optional for backwards compatibility, defaults to 1)
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    failedOn: v.optional(v.string()), // "2025-10-22" (which day it failed)
    failedByUserId: v.optional(v.id("users")), // who missed the day
  })
    .index("by_status", ["status"])
    .index("by_join_code", ["joinCode"])
    .index("by_creator", ["creatorId"]),

  accountabilityChallengeParticipants: defineTable({
    challengeId: v.id("accountabilityChallenges"),
    userId: v.id("users"),
    joinedAt: v.number(),
    role: v.union(v.literal("creator"), v.literal("participant")),
  })
    .index("by_challenge", ["challengeId"])
    .index("by_user", ["userId"])
    .index("by_challenge_and_user", ["challengeId", "userId"]),

  accountabilityChallengeDailyProgress: defineTable({
    challengeId: v.id("accountabilityChallenges"),
    userId: v.id("users"),
    date: v.string(), // "2025-10-21"
    pomosCompleted: v.number(), // computed from pomodoros table
    completed: v.boolean(), // pomosCompleted >= requiredPomosPerDay
  })
    .index("by_challenge_and_date", ["challengeId", "date"])
    .index("by_challenge_and_user", ["challengeId", "userId"]),

  pushSubscriptions: defineTable({
    userId: v.id("users"),
    endpoint: v.string(), // Push service endpoint URL
    keys: v.object({
      p256dh: v.string(), // Client public key for encryption
      auth: v.string(), // Authentication secret
    }),
    userAgent: v.optional(v.string()), // Browser/device info
    createdAt: v.number(),
    lastUsed: v.optional(v.number()), // Track when subscription was last successfully used
  })
    .index("by_user", ["userId"])
    .index("by_endpoint", ["endpoint"]),

  notificationRules: defineTable({
    name: v.string(), // Rule name (e.g., "24h Inactivity Reminder")
    description: v.string(), // What this rule does
    enabled: v.boolean(),
    trigger: v.union(
      v.literal("inactivity"), // User hasn't completed pomo in X hours
      v.literal("streak_risk"), // Streak about to expire
      v.literal("challenge_available"), // New challenge unlocked
      v.literal("friend_activity"), // Friend completed pomo
      v.literal("daily_goal"), // Remind about daily goal
      v.literal("manual") // Manually triggered from admin
    ),
    // Trigger-specific config
    config: v.object({
      inactivityHours: v.optional(v.number()), // For inactivity trigger
      hoursBeforeExpiry: v.optional(v.number()), // For streak_risk trigger
      targetAudience: v.optional(
        v.union(
          v.literal("all"), // All users
          v.literal("active"), // Users with activity in last 7 days
          v.literal("inactive"), // Users inactive for 7+ days
          v.literal("streak_holders") // Users with active streaks
        )
      ),
    }),
    // Notification content
    notification: v.object({
      title: v.string(),
      body: v.string(),
      icon: v.optional(v.string()),
      badge: v.optional(v.string()),
      tag: v.optional(v.string()),
      requireInteraction: v.optional(v.boolean()),
      actions: v.optional(
        v.array(
          v.object({
            action: v.string(), // Action ID
            title: v.string(), // Button text
          })
        )
      ),
      data: v.optional(
        v.object({
          url: v.optional(v.string()), // Where to navigate on click
        })
      ),
    }),
    // Scheduling
    schedule: v.optional(
      v.object({
        type: v.union(
          v.literal("immediate"), // Send right away when triggered
          v.literal("daily"), // Send once per day at specific time
          v.literal("interval") // Send every X hours
        ),
        hourUTC: v.optional(v.number()), // For daily schedule
        minuteUTC: v.optional(v.number()), // For daily schedule
        intervalHours: v.optional(v.number()), // For interval schedule
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.id("users"), // Admin who created the rule
  })
    .index("by_enabled", ["enabled"])
    .index("by_trigger", ["trigger"]),

  notificationLogs: defineTable({
    ruleId: v.optional(v.id("notificationRules")), // null if manual send
    userId: v.id("users"),
    status: v.union(
      v.literal("sent"), // Successfully sent to push service
      v.literal("delivered"), // User clicked/interacted
      v.literal("failed"), // Failed to send
      v.literal("expired") // Subscription expired
    ),
    errorMessage: v.optional(v.string()),
    sentAt: v.number(),
    deliveredAt: v.optional(v.number()),
  })
    .index("by_rule", ["ruleId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_sent_at", ["sentAt"]),
});
