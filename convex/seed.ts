import { mutation } from "./_generated/server";

/**
 * Seeds test pomodoro data for the authenticated user
 * Generates realistic pomodoros over the past 40 days
 */
export const seedTestData = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if user already has data
    const existingSessions = await ctx.db
      .query("pomodoros")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    if (existingSessions.length > 0) {
      throw new Error("User already has pomodoro data. Delete existing data first.");
    }

    const tags = [
      "Deep Work",
      "Code Review",
      "Bug Fixing",
      "Feature Development",
      "Planning",
      "Documentation",
      "Meeting Prep",
      "Research",
      "Testing",
      undefined, // Some sessions without tags
    ];

    const sessions = [];
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    // Generate data for the past 40 days
    for (let daysAgo = 0; daysAgo < 40; daysAgo++) {
      const dayStart = new Date(now - daysAgo * oneDayMs);
      dayStart.setHours(9, 0, 0, 0); // Start at 9am

      // Variable number of pomodoros per day (0-8)
      // More productive on some days, less on others
      const pomodorosToday = Math.floor(Math.random() * 9);

      for (let i = 0; i < pomodorosToday; i++) {
        // Spread sessions throughout the day (9am - 6pm)
        const hoursOffset = Math.random() * 9; // 0-9 hours
        const sessionTime = dayStart.getTime() + hoursOffset * 60 * 60 * 1000;

        // Duration: mostly 25 minutes, sometimes 50
        const duration = Math.random() > 0.8 ? 50 * 60 : 25 * 60;

        sessions.push({
          userId: user._id,
          mode: "focus" as const,
          duration,
          tag: tags[Math.floor(Math.random() * tags.length)],
          completedAt: sessionTime,
        });
      }
    }

    // Insert all sessions
    await Promise.all(sessions.map((session) => ctx.db.insert("pomodoros", session)));

    return {
      count: sessions.length,
      days: 40,
    };
  },
});

/**
 * Deletes all pomodoro data for the authenticated user
 * Use this to reset before seeding new data
 */
export const clearAllData = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Delete all pomodoros for this user
    const sessions = await ctx.db
      .query("pomodoros")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    await Promise.all(sessions.map((session) => ctx.db.delete(session._id)));

    return { deleted: sessions.length };
  },
});
