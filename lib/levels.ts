/**
 * Level system utilities
 * Simple doubling progression:
 * Level 1: 0, Level 2: 2, Level 3: 4, Level 4: 8, Level 5: 16, etc.
 * Each level threshold = 2^(level-1) for level >= 2
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
 * Level 1: 0 pomos (starting level)
 * Level 2: 2 pomos
 * Level 3: 4 pomos
 * Level 4: 8 pomos
 * Level N: 2^(N-1) pomos
 */
export function getTotalPomosForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.pow(2, level - 1);
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
