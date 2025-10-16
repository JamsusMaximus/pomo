/**
 * @fileoverview Level system utilities with hybrid progression algorithm
 * @module lib/levels
 *
 * Key responsibilities:
 * - Calculate user's current level from total pomodoro count
 * - Determine pomodoros needed for next level
 * - Compute level progress percentage
 * - Provide level titles for different progression tiers
 * - Implement hybrid progression (exponential → gradual growth)
 *
 * Progression algorithm:
 * - Levels 1-5: Exponential (0, 2, 4, 8, 16 pomodoros)
 * - Levels 6+: Pokemon-style growth (gaps increase by 5 each level)
 * - Example: Level 6: 31 (+15), Level 7: 51 (+20), Level 8: 76 (+25)
 *
 * Dependencies: None (pure utility functions)
 * Used by: app/page.tsx, app/profile/page.tsx (fallback when levelConfig unavailable)
 */

export interface LevelInfo {
  currentLevel: number;
  pomosForCurrentLevel: number; // Total pomos needed to reach current level
  pomosForNextLevel: number; // Total pomos needed to reach next level
  pomosRemaining: number; // Pomos remaining until next level
  progress: number; // Progress percentage (0-100)
}

export interface LevelInfoWithTitle extends LevelInfo {
  title: string;
}

/**
 * Calculate the total pomos threshold for a specific level
 * Level 1-5: Exponential (2^(level-1))
 * Level 6+: 16 + sum of (10 + 5*(i-5)) for i from 6 to level
 */
export function getTotalPomosForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level <= 5) {
    // Exponential for levels 2-5: 2, 4, 8, 16
    return Math.pow(2, level - 1);
  }

  // For level 6+, start at 16 and add increasing gaps
  // Gap formula: 10 + 5*(level - 5)
  // Level 6: 16 + 15 = 31
  // Level 7: 31 + 20 = 51
  // Level 8: 51 + 25 = 76
  // Level 9: 76 + 30 = 106
  let total = 16; // Total pomos at level 5
  for (let i = 6; i <= level; i++) {
    const gap = 10 + 5 * (i - 5);
    total += gap;
  }
  return total;
}

/**
 * Get level information for a given number of completed pomodoros
 */
export function getLevelInfo(completedPomos: number): LevelInfo {
  let currentLevel = 1;

  // Find the current level (highest level where threshold <= completedPomos)
  while (currentLevel < 100 && getTotalPomosForLevel(currentLevel + 1) <= completedPomos) {
    currentLevel++;
  }

  const pomosForCurrentLevel = getTotalPomosForLevel(currentLevel);
  const pomosForNextLevel = getTotalPomosForLevel(currentLevel + 1);
  const pomosInCurrentLevel = completedPomos - pomosForCurrentLevel;
  const pomosNeededForNextLevel = pomosForNextLevel - pomosForCurrentLevel;
  const pomosRemaining = pomosForNextLevel - completedPomos;
  const progress = (pomosInCurrentLevel / pomosNeededForNextLevel) * 100;

  return {
    currentLevel,
    pomosForCurrentLevel,
    pomosForNextLevel,
    pomosRemaining,
    progress: Math.min(100, Math.max(0, progress)),
  };
}

/**
 * Get a fun level title based on level
 */
export function getLevelTitle(level: number): string {
  const titles = [
    "Beginner", // 1
    "Novice", // 2
    "Apprentice", // 3
    "Adept", // 4
    "Expert", // 5
    "Master", // 6
    "Grandmaster", // 7
    "Legend", // 8
    "Mythic", // 9
    "Immortal", // 10+
  ];

  if (level <= 0) return titles[0];
  if (level > titles.length) return titles[titles.length - 1];
  return titles[level - 1];
}

/**
 * Calculate level info from database level configurations
 * Falls back to default calculation if no configs provided
 *
 * @param pomos - Total completed pomodoros
 * @param levelConfigs - Database level configurations (sorted by threshold)
 * @returns Level info with title
 */
export function getLevelInfoFromConfig(
  pomos: number,
  levelConfigs?: Array<{ level: number; title: string; threshold: number }>
): LevelInfoWithTitle {
  // Fallback to default calculation if no config
  if (!levelConfigs || !Array.isArray(levelConfigs) || levelConfigs.length === 0) {
    const info = getLevelInfo(pomos);
    return { ...info, title: getLevelTitle(info.currentLevel) };
  }

  // Find current level from database config (assumes sorted by threshold)
  let currentLevel = levelConfigs[0];
  for (const level of levelConfigs) {
    if (level.threshold <= pomos) {
      currentLevel = level;
    } else {
      break;
    }
  }

  const currentIndex = levelConfigs.findIndex((l) => l.level === currentLevel.level);
  const nextLevel = levelConfigs[currentIndex + 1];

  // Max level reached
  if (!nextLevel) {
    return {
      currentLevel: currentLevel.level,
      pomosForCurrentLevel: currentLevel.threshold,
      pomosForNextLevel: currentLevel.threshold,
      pomosRemaining: 0,
      progress: 100,
      title: currentLevel.title,
    };
  }

  // Calculate progress to next level
  const pomosInCurrentLevel = pomos - currentLevel.threshold;
  const pomosNeededForNextLevel = nextLevel.threshold - currentLevel.threshold;
  const progress = (pomosInCurrentLevel / pomosNeededForNextLevel) * 100;

  return {
    currentLevel: currentLevel.level,
    pomosForCurrentLevel: currentLevel.threshold,
    pomosForNextLevel: nextLevel.threshold,
    pomosRemaining: nextLevel.threshold - pomos,
    progress: Math.min(100, Math.max(0, progress)),
    title: currentLevel.title,
  };
}
