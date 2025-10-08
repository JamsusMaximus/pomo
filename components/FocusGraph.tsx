"use client";

import { useMemo, useState, useEffect, useRef } from "react";

interface FocusGraphProps {
  data: Array<{ date: string; score: number }>;
}

export function FocusGraph({ data }: FocusGraphProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    score: number;
    date: string;
  } | null>(null);

  // Lazy load using Intersection Observer
  const [shouldRender, setShouldRender] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShouldRender(true);
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const { linePath, areaPath, dataPoints } = useMemo(() => {
    if (!data || data.length === 0) {
      return { linePath: "", areaPath: "", dataPoints: [] };
    }

    // Use actual max from data, with minimum of 1 to avoid division by zero
    const dataMax = Math.max(...data.map((d) => d.score));
    const max = Math.max(dataMax, 1);
    const width = 800;
    const height = 200;
    const padding = 20;

    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const xStep = chartWidth / (data.length - 1);

    // Generate SVG path and data points
    const pathPoints: string[] = [];
    const pointData: Array<{ x: number; y: number; score: number; date: string }> = [];

    data.forEach((point, i) => {
      const x = padding + i * xStep;
      const y = height - padding - (point.score / max) * chartHeight;
      pathPoints.push(`${x},${y}`);
      pointData.push({ x, y, score: point.score, date: point.date });
    });

    // Line path: just connect the data points
    const linePath = `M ${pathPoints.join(" L ")}`;

    // Area path: for gradient fill under the curve
    const areaPath = `${linePath} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`;

    return {
      linePath,
      areaPath,
      dataPoints: pointData,
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        No data available
      </div>
    );
  }

  // Render placeholder until visible
  if (!shouldRender) {
    return (
      <div ref={containerRef} className="w-full h-[200px] bg-muted/20 rounded-lg animate-pulse" />
    );
  }

  return (
    <div ref={containerRef} className="w-full relative">
      <svg viewBox="0 0 800 200" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
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
        <path d={areaPath} fill="url(#focusGradient)" opacity="0.2" />

        {/* Line - only the data points, no baseline */}
        <path
          d={linePath}
          fill="none"
          stroke="url(#focusGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Hover circles */}
        {dataPoints.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r="20"
            fill="transparent"
            className="cursor-pointer"
            onMouseEnter={() => setHoveredPoint(point)}
            onMouseLeave={() => setHoveredPoint(null)}
          />
        ))}

        {/* Hover indicator */}
        {hoveredPoint && (
          <>
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r="5"
              fill="#f97316"
              stroke="white"
              strokeWidth="2"
            />
            <line
              x1={hoveredPoint.x}
              y1={hoveredPoint.y}
              x2={hoveredPoint.x}
              y2="180"
              stroke="#f97316"
              strokeWidth="1"
              strokeDasharray="4"
              opacity="0.5"
            />
          </>
        )}

        {/* Gradient definition */}
        <defs>
          <linearGradient id="focusGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
        </defs>
      </svg>

      {/* Tooltip */}
      {hoveredPoint && (
        <div
          className="absolute bg-card border border-border rounded-lg shadow-lg px-3 py-2 pointer-events-none z-10"
          style={{
            left: `${(hoveredPoint.x / 800) * 100}%`,
            top: `${(hoveredPoint.y / 200) * 100}%`,
            transform: "translate(-50%, -120%)",
          }}
        >
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {hoveredPoint.score}
          </p>
          <p className="text-xs text-muted-foreground whitespace-nowrap">{hoveredPoint.date}</p>
        </div>
      )}

      {/* Legend */}
      <div className="flex justify-between text-xs text-muted-foreground mt-2 px-2">
        <span>{data.length} days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}
