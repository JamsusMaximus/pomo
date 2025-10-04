import { query } from "./_generated/server";

/**
 * Get user statistics for pomodoro sessions
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return null;
    }

    // Get all focus sessions
    const sessions = await ctx.db
      .query("pomodoros")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("mode"), "focus"))
      .collect();

    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    // Calculate start of week (Monday)
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days
    startOfWeek.setDate(today.getDate() + diff);
    const weekTimestamp = startOfWeek.getTime();

    // Calculate start of month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthTimestamp = startOfMonth.getTime();

    // Calculate start of year
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const yearTimestamp = startOfYear.getTime();

    // Filter sessions by time period
    const weekSessions = sessions.filter((s) => s.completedAt >= weekTimestamp);
    const monthSessions = sessions.filter((s) => s.completedAt >= monthTimestamp);
    const yearSessions = sessions.filter((s) => s.completedAt >= yearTimestamp);

    // Calculate totals
    const totalCount = sessions.length;
    const totalMinutes = sessions.reduce((sum, s) => sum + s.duration / 60, 0);

    const weekCount = weekSessions.length;
    const weekMinutes = weekSessions.reduce((sum, s) => sum + s.duration / 60, 0);

    const monthCount = monthSessions.length;
    const monthMinutes = monthSessions.reduce((sum, s) => sum + s.duration / 60, 0);

    const yearCount = yearSessions.length;
    const yearMinutes = yearSessions.reduce((sum, s) => sum + s.duration / 60, 0);

    return {
      total: { count: totalCount, minutes: Math.round(totalMinutes) },
      week: { count: weekCount, minutes: Math.round(weekMinutes) },
      month: { count: monthCount, minutes: Math.round(monthMinutes) },
      year: { count: yearCount, minutes: Math.round(yearMinutes) },
    };
  },
});

/**
 * Get daily activity for the past year (for heatmap)
 */
export const getActivity = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return [];
    }

    // Get sessions from the past year
    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const sessions = await ctx.db
      .query("pomodoros")
      .withIndex("by_user_and_date", (q) => q.eq("userId", user._id).gte("completedAt", oneYearAgo))
      .filter((q) => q.eq(q.field("mode"), "focus"))
      .collect();

    // Group by day
    const dailyActivity: Record<string, { count: number; minutes: number }> = {};

    sessions.forEach((session) => {
      const date = new Date(session.completedAt);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

      if (!dailyActivity[dateKey]) {
        dailyActivity[dateKey] = { count: 0, minutes: 0 };
      }

      dailyActivity[dateKey].count += 1;
      dailyActivity[dateKey].minutes += session.duration / 60;
    });

    // Convert to array
    return Object.entries(dailyActivity).map(([date, data]) => ({
      date,
      count: data.count,
      minutes: Math.round(data.minutes),
    }));
  },
});
