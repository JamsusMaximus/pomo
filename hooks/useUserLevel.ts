/**
 * @fileoverview Custom hook for user level calculation with optimized queries
 * @module hooks/useUserLevel
 *
 * Key responsibilities:
 * - Fetch user stats and level config efficiently
 * - Calculate level info with memoization
 * - Eliminate redundant queries (combines profileStats + stats)
 * - Single source of truth for level calculations
 *
 * Dependencies: Convex queries, React hooks
 * Used by: Navbar.tsx, MobileBottomNav.tsx, app/profile/page.tsx
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemo } from "react";
import { getLevelInfoFromConfig } from "@/lib/levels";

export interface LevelInfo {
  currentLevel: number;
  pomosForCurrentLevel: number;
  pomosForNextLevel: number;
  pomosRemaining: number;
  progress: number;
  title: string;
}

/**
 * Custom hook to get user level information with memoization
 * Eliminates redundant queries by fetching profileStats once
 *
 * @returns Object containing stats, levelConfig, and calculated levelInfo
 */
export function useUserLevel() {
  // OPTIMIZATION: Use profileStats as single source (includes all stats data)
  const profileStats = useQuery(api.stats.getProfileStats);
  const levelConfig = useQuery(api.levels.getLevelConfig);

  // OPTIMIZATION: Memoize level calculation to avoid recalculating on every render
  const levelInfo = useMemo(() => {
    if (!profileStats) return null;

    const pomos = profileStats.total.count;

    // Convert levelConfig to the format expected by utility function
    const levelConfigArray = levelConfig
      ? levelConfig.map((l) => ({
          level: l.level,
          title: l.title,
          threshold: l.threshold,
        }))
      : undefined;

    return getLevelInfoFromConfig(pomos, levelConfigArray);
  }, [profileStats, levelConfig]); // Only recalculate when stats or config change

  return {
    stats: profileStats,
    levelConfig,
    levelInfo,
    isLoading: profileStats === undefined || levelConfig === undefined,
  };
}
