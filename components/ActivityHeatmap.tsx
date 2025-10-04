"use client";

import { motion } from "framer-motion";

interface ActivityData {
  date: string;
  count: number;
  minutes: number;
}

interface ActivityHeatmapProps {
  data: ActivityData[];
}

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  // Generate all days for the past ~50 days (enough to show the seeded data nicely)
  const today = new Date();
  const daysToShow = 56; // 8 weeks = nice grid
  const startDateCalc = new Date(today);
  startDateCalc.setDate(today.getDate() - daysToShow);

  // Start from the first Sunday before the start date
  const startDate = new Date(startDateCalc);
  const dayOfWeek = startDate.getDay();
  const diff = dayOfWeek === 0 ? 0 : -dayOfWeek; // Start on Sunday
  startDate.setDate(startDate.getDate() + diff);

  // Create a map for quick lookup
  const activityMap = new Map<string, ActivityData>();
  data.forEach((item) => activityMap.set(item.date, item));

  // Generate weeks
  const weeks: Array<Array<{ date: Date; data?: ActivityData }>> = [];
  let currentWeek: Array<{ date: Date; data?: ActivityData }> = [];
  const currentDate = new Date(startDate);

  while (currentDate <= today) {
    const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;
    currentWeek.push({
      date: new Date(currentDate),
      data: activityMap.get(dateKey),
    });

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  // Calculate intensity levels (0-4 based on count)
  const getIntensity = (count: number | undefined): number => {
    if (!count) return 0;
    if (count >= 8) return 4;
    if (count >= 6) return 3;
    if (count >= 4) return 2;
    if (count >= 1) return 1;
    return 0;
  };

  const getColor = (intensity: number): string => {
    const colors = [
      "bg-muted/30", // 0 - no activity
      "bg-orange-200 dark:bg-orange-950", // 1 - light
      "bg-orange-300 dark:bg-orange-900", // 2 - medium-light
      "bg-orange-400 dark:bg-orange-700", // 3 - medium
      "bg-orange-500 dark:bg-orange-600", // 4 - high
    ];
    return colors[intensity];
  };

  const monthLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return (
    <div className="w-full overflow-x-auto">
      <div className="inline-block min-w-full">
        {/* Month labels */}
        <div className="flex mb-2 ml-8">
          {weeks.map((week, weekIndex) => {
            const firstDay = week[0].date;
            const isFirstWeekOfMonth = firstDay.getDate() <= 7;
            if (isFirstWeekOfMonth && weekIndex > 0) {
              return (
                <div
                  key={weekIndex}
                  className="text-xs text-muted-foreground"
                  style={{ width: "14px" }}
                >
                  {monthLabels[firstDay.getMonth()]}
                </div>
              );
            }
            return <div key={weekIndex} style={{ width: "14px" }} />;
          })}
        </div>

        {/* Day labels + grid */}
        <div className="flex gap-1">
          {/* Day of week labels */}
          <div className="flex flex-col gap-1 pr-2">
            <div className="h-3" />
            <div className="text-xs text-muted-foreground h-3 flex items-center">Mon</div>
            <div className="h-3" />
            <div className="text-xs text-muted-foreground h-3 flex items-center">Wed</div>
            <div className="h-3" />
            <div className="text-xs text-muted-foreground h-3 flex items-center">Fri</div>
            <div className="h-3" />
          </div>

          {/* Heatmap grid */}
          <div className="flex gap-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((day, dayIndex) => {
                  const intensity = getIntensity(day.data?.count);
                  const color = getColor(intensity);
                  const dateStr = day.date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  const tooltip = day.data
                    ? `${day.data.count} pomodoros (${day.data.minutes}m) on ${dateStr}`
                    : `No activity on ${dateStr}`;

                  return (
                    <motion.div
                      key={dayIndex}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2, delay: (weekIndex * 7 + dayIndex) * 0.001 }}
                      className={`w-3 h-3 rounded-sm ${color} border border-border/50 hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer`}
                      title={tooltip}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={`w-3 h-3 rounded-sm ${getColor(level)} border border-border/50`}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
