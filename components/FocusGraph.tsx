"use client";

import { useMemo } from "react";

interface FocusGraphProps {
  data: Array<{ date: string; score: number }>;
}

export function FocusGraph({ data }: FocusGraphProps) {
  const { maxScore, points, pathD } = useMemo(() => {
    if (!data || data.length === 0) {
      return { maxScore: 100, points: "", pathD: "" };
    }

    const max = Math.max(...data.map((d) => d.score), 100);
    const width = 800;
    const height = 200;
    const padding = 20;

    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const xStep = chartWidth / (data.length - 1);

    // Generate SVG path
    const pathPoints = data.map((point, i) => {
      const x = padding + i * xStep;
      const y = height - padding - (point.score / max) * chartHeight;
      return `${x},${y}`;
    });

    const path = `M ${pathPoints.join(" L ")}`;

    // Generate area path (filled)
    const areaPath = `${path} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`;

    return {
      maxScore: max,
      points: pathPoints.join(" "),
      pathD: areaPath,
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="w-full">
      <svg
        viewBox="0 0 800 200"
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((percent) => (
          <line
            key={percent}
            x1="20"
            y1={20 + (1 - percent) * 160}
            x2="780"
            y2={20 + (1 - percent) * 160}
            stroke="currentColor"
            strokeWidth="1"
            className="text-border opacity-30"
          />
        ))}

        {/* Area fill */}
        <path
          d={pathD}
          fill="url(#focusGradient)"
          opacity="0.2"
        />

        {/* Line */}
        <path
          d={pathD.split(" Z")[0]}
          fill="none"
          stroke="url(#focusGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="focusGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
        </defs>
      </svg>

      {/* Legend */}
      <div className="flex justify-between text-xs text-muted-foreground mt-2 px-2">
        <span>90 days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}
