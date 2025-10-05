import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    username: v.string(),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_clerk", ["clerkId"]),

  pomodoros: defineTable({
    userId: v.id("users"),
    tag: v.optional(v.string()),
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
});
