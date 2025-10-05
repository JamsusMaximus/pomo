/**
 * Level system utilities
 * Hybrid progression:
 * Levels 1-5: Exponential (0, 2, 4, 8, 16)
 * Levels 6+: Pokemon-style growth (gaps increase gradually)
 *
 * Level 1: 0, Level 2: 2, Level 3: 4, Level 4: 8, Level 5: 16
 * Level 6: 31 (+15), Level 7: 51 (+20), Level 8: 76 (+25), Level 9: 106 (+30)
 * Gap increases by 5 each level after level 5
 */

export interface LevelInfo {
  currentLevel: number;
  pomosForCurrentLevel: number; // Total pomos needed to reach current level
  pomosForNextLevel: number; // Total pomos needed to reach next level
  pomosRemaining: number; // Pomos remaining until next level
  progress: number; // Progress percentage (0-100)
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
