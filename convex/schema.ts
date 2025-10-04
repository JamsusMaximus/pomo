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
});
