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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

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

    // Calculate streaks
    const streaks = calculateStreaks(sessions);

    return {
      total: { count: totalCount, minutes: Math.round(totalMinutes) },
      week: { count: weekCount, minutes: Math.round(weekMinutes) },
      month: { count: monthCount, minutes: Math.round(monthMinutes) },
      year: { count: yearCount, minutes: Math.round(yearMinutes) },
      dailyStreak: streaks.daily,
      weeklyStreak: streaks.weekly,
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

/**
 * Calculate daily and weekly streaks
 * Daily streak: consecutive days with at least 1 completed pomodoro
 * Weekly streak: consecutive weeks with at least 5 completed pomodoros
 */
function calculateStreaks(sessions: Array<{ completedAt: number }>): {
  daily: number;
  weekly: number;
} {
  if (sessions.length === 0) {
    return { daily: 0, weekly: 0 };
  }

  // Group sessions by date
  const sessionsByDate: Record<string, number> = {};
  sessions.forEach((session) => {
    const date = new Date(session.completedAt);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    sessionsByDate[dateKey] = (sessionsByDate[dateKey] || 0) + 1;
  });

  // Get sorted dates (most recent first)
  const sortedDates = Object.keys(sessionsByDate).sort().reverse();

  // Calculate daily streak
  let dailyStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Start from today or yesterday (allow for timezone differences)
  let checkDate = new Date(today);
  if (!sessionsByDate[todayKey]) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Count consecutive days with sessions
  while (true) {
    const checkKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;
    if (sessionsByDate[checkKey]) {
      dailyStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate weekly streak (weeks with at least 5 pomodoros)
  const sessionsByWeek: Record<string, number> = {};
  sessions.forEach((session) => {
    const date = new Date(session.completedAt);
    const startOfWeek = new Date(date);
    const dayOfWeek = date.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(date.getDate() + diff);
    startOfWeek.setHours(0, 0, 0, 0);
    const weekKey = startOfWeek.toISOString().split("T")[0];
    sessionsByWeek[weekKey] = (sessionsByWeek[weekKey] || 0) + 1;
  });

  const sortedWeeks = Object.keys(sessionsByWeek).sort().reverse();
  let weeklyStreak = 0;

  const currentWeekStart = new Date();
  const dayOfWeek = currentWeekStart.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  currentWeekStart.setDate(currentWeekStart.getDate() + diff);
  currentWeekStart.setHours(0, 0, 0, 0);

  let checkWeek = new Date(currentWeekStart);

  // Count consecutive weeks with at least 5 pomodoros
  while (true) {
    const weekKey = checkWeek.toISOString().split("T")[0];
    if (sessionsByWeek[weekKey] && sessionsByWeek[weekKey] >= 5) {
      weeklyStreak++;
      checkWeek.setDate(checkWeek.getDate() - 7);
    } else {
      break;
    }
  }

  return { daily: dailyStreak, weekly: weeklyStreak };
}

/**
 * Get Focus Graph data - similar to Strava's fitness graph
 * Uses exponential weighted moving average to show productivity trends
 */
export const getFocusGraph = query({
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

    // Get sessions from past 90 days
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const sessions = await ctx.db
      .query("pomodoros")
      .withIndex("by_user_and_date", (q) => q.eq("userId", user._id).gte("completedAt", ninetyDaysAgo))
      .filter((q) => q.eq(q.field("mode"), "focus"))
      .collect();

    // Group by date
    const pomosByDate: Record<string, number> = {};
    sessions.forEach((session) => {
      const date = new Date(session.completedAt);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      pomosByDate[dateKey] = (pomosByDate[dateKey] || 0) + 1;
    });

    // Calculate focus score for each day using exponential weighted moving average
    const DECAY_FACTOR = 0.97; // 3% daily decay
    const POMO_WEIGHT = 10; // Each pomo adds 10 points
    
    const focusData: Array<{ date: string; score: number }> = [];
    let currentScore = 0;

    // Generate data for past 90 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 89; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      
      // Apply decay from previous day
      currentScore = currentScore * DECAY_FACTOR;
      
      // Add today's pomos
      const todayPomos = pomosByDate[dateKey] || 0;
      currentScore += todayPomos * POMO_WEIGHT;

      focusData.push({
        date: dateKey,
        score: Math.round(currentScore),
      });
    }

    return focusData;
  },
});
