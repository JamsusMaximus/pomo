/**
 * Level system utilities
 * Exponential progression: 2^(level-1) pomos needed for next level
 */

export interface LevelInfo {
  currentLevel: number;
  pomosForCurrentLevel: number; // Total pomos needed to reach current level
  pomosForNextLevel: number; // Total pomos needed to reach next level
  pomosRemaining: number; // Pomos remaining until next level
  progress: number; // Progress percentage (0-100)
}

/**
 * Calculate the total pomos needed to reach a specific level
 * Level 1: 0 pomos (starting level)
 * Level 2: 2 pomos
 * Level 3: 6 pomos (2 + 4)
 * Level 4: 14 pomos (2 + 4 + 8)
 * Level N: sum of 2^i for i from 0 to N-2
 */
export function getTotalPomosForLevel(level: number): number {
  if (level <= 1) return 0;
  // Sum of geometric series: 2^0 + 2^1 + 2^2 + ... + 2^(N-2) = 2^(N-1) - 1
  return Math.pow(2, level - 1) - 2;
}

/**
 * Calculate pomos needed to go from one level to the next
 */
export function getPomosNeededForLevel(level: number): number {
  if (level <= 1) return 2; // Level 1->2 needs 2 pomos
  return Math.pow(2, level - 1); // Level N needs 2^(N-1) pomos
}

/**
 * Get level information for a given number of completed pomodoros
 */
export function getLevelInfo(completedPomos: number): LevelInfo {
  let currentLevel = 1;

  // Find the current level
  while (getTotalPomosForLevel(currentLevel + 1) <= completedPomos) {
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
