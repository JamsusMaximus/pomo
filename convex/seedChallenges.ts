import { mutation } from "./_generated/server";

/**
 * Seed default challenges - run this once to populate initial challenges
 * Can be called from admin page or via dashboard
 */
export const seedDefaultChallenges = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if challenges already exist
    const existing = await ctx.db.query("challenges").first();
    if (existing) {
      return { message: "Challenges already exist", count: 0 };
    }

    const defaultChallenges = [
      {
        name: "First Steps",
        description: "Complete your first pomodoro",
        type: "total" as const,
        target: 1,
        badge: "Target",
        recurring: false,
        active: true,
        createdAt: Date.now(),
      },
      {
        name: "Getting Started",
        description: "Complete 10 pomodoros",
        type: "total" as const,
        target: 10,
        badge: "Sprout",
        recurring: false,
        active: true,
        createdAt: Date.now(),
      },
      {
        name: "Half Century",
        description: "Complete 50 total pomodoros",
        type: "total" as const,
        target: 50,
        badge: "Flame",
        recurring: false,
        active: true,
        createdAt: Date.now(),
      },
      {
        name: "Century Club",
        description: "Complete 100 total pomodoros",
        type: "total" as const,
        target: 100,
        badge: "Award",
        recurring: false,
        active: true,
        createdAt: Date.now(),
      },
      {
        name: "Dedication",
        description: "Complete 250 total pomodoros",
        type: "total" as const,
        target: 250,
        badge: "Star",
        recurring: false,
        active: true,
        createdAt: Date.now(),
      },
      {
        name: "Master",
        description: "Complete 500 total pomodoros",
        type: "total" as const,
        target: 500,
        badge: "Trophy",
        recurring: false,
        active: true,
        createdAt: Date.now(),
      },
      {
        name: "Streak Starter",
        description: "Maintain a 3-day streak",
        type: "streak" as const,
        target: 3,
        badge: "Flame",
        recurring: false,
        active: true,
        createdAt: Date.now(),
      },
      {
        name: "Week Warrior",
        description: "Maintain a 7-day streak",
        type: "streak" as const,
        target: 7,
        badge: "Swords",
        recurring: false,
        active: true,
        createdAt: Date.now(),
      },
      {
        name: "Consistency King",
        description: "Maintain a 30-day streak",
        type: "streak" as const,
        target: 30,
        badge: "Crown",
        recurring: false,
        active: true,
        createdAt: Date.now(),
      },
      {
        name: "Daily Dozen",
        description: "Complete 12 pomodoros in one day",
        type: "daily" as const,
        target: 12,
        badge: "Sparkles",
        recurring: false,
        active: true,
        createdAt: Date.now(),
      },
      {
        name: "Weekend Warrior",
        description: "Complete 20 pomodoros in one week",
        type: "weekly" as const,
        target: 20,
        badge: "Zap",
        recurring: false,
        active: true,
        createdAt: Date.now(),
      },
      {
        name: "Monthly Marathon",
        description: "Complete 100 pomodoros in one month",
        type: "monthly" as const,
        target: 100,
        badge: "Medal",
        recurring: false,
        active: true,
        createdAt: Date.now(),
      },
    ];

    // Insert all challenges
    const promises = defaultChallenges.map((challenge) => ctx.db.insert("challenges", challenge));

    await Promise.all(promises);

    return { message: "Default challenges created", count: defaultChallenges.length };
  },
});
