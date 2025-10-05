#!/usr/bin/env node

/**
 * Generate changelog from git commits
 * Reads conventional commits (feat:, fix:, etc.) and groups by day
 * Outputs to lib/changelog-data.ts
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Get git log with specific format
const gitLog = execSync(
  'git log --pretty=format:"%H|%ad|%s" --date=format:"%Y-%m-%d" --no-merges',
  { encoding: "utf-8" }
);

// Parse commits
const commits = gitLog
  .trim()
  .split("\n")
  .map((line) => {
    const [hash, date, message] = line.split("|");
    return { hash, date, message };
  });

// Filter for major user-facing features only
const userFacingKeywords = [
  "level",
  "profile",
  "notification",
  "sound",
  "keyboard",
  "space",
  "avatar",
  "heatmap",
  "activity",
  "stats",
  "dark mode",
  "theme",
  "progress ring",
  "timer",
  "pomodoro feed",
  "session",
  "tag",
  "mac app",
  "download page",
  "changelog",
];

// Keywords to exclude (infrastructure, tweaks, backend, etc.)
const excludeKeywords = [
  "convex",
  "clerk",
  "ci",
  "build",
  "eslint",
  "typescript",
  "test",
  "vitest",
  "backend",
  "schema",
  "refactor",
  "improve",
  "simplify",
  "move",
  "replace",
  "remove",
  "add missing",
  "separate",
  "better",
  "enhanced",
];

const significantCommits = commits
  .filter((commit) => {
    const msg = commit.message.toLowerCase();

    // Only features
    if (!msg.startsWith("feat:")) return false;

    // Must contain user-facing keywords
    const hasUserFacing = userFacingKeywords.some((kw) => msg.includes(kw));
    if (!hasUserFacing) return false;

    // Must not contain excluded keywords
    const hasExcluded = excludeKeywords.some((kw) => msg.includes(kw));
    return !hasExcluded;
  })
  .map((commit) => {
    // Extract title and description
    const messageWithoutPrefix = commit.message.substring(5).trim(); // Remove "feat:"
    const [title, ...descParts] = messageWithoutPrefix.split("\n");
    const description = descParts.join(" ").trim();

    return {
      hash: commit.hash.substring(0, 7),
      date: commit.date,
      type: "feature",
      label: "New",
      title: title.charAt(0).toUpperCase() + title.slice(1),
      description: description || title,
    };
  });

// Group by date
const groupedByDate = significantCommits.reduce((acc, commit) => {
  if (!acc[commit.date]) {
    acc[commit.date] = [];
  }
  acc[commit.date].push(commit);
  return acc;
}, {});

// Format for TypeScript export
const formatDate = (dateStr) => {
  const [year, month, day] = dateStr.split("-");
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const changelog = Object.keys(groupedByDate)
  .sort((a, b) => new Date(b) - new Date(a)) // Most recent first
  .map((date) => ({
    date: formatDate(date),
    changes: groupedByDate[date].slice(0, 5), // Max 5 entries per day
  }))
  .filter((entry) => entry.changes.length > 0); // Remove empty days

// Generate TypeScript file
const tsContent = `// Auto-generated from git commits by scripts/generate-changelog.js
// Do not edit manually - run 'npm run generate:changelog' to update

export interface ChangelogChange {
  hash: string;
  type: "feature" | "fix" | "improvement";
  label: string;
  title: string;
  description: string;
}

export interface ChangelogEntry {
  date: string;
  changes: ChangelogChange[];
}

export const changelog: ChangelogEntry[] = ${JSON.stringify(changelog, null, 2)};
`;

// Write to file
const outputPath = path.join(__dirname, "../lib/changelog-data.ts");
fs.writeFileSync(outputPath, tsContent);

console.log(
  `✅ Generated changelog with ${changelog.length} days and ${significantCommits.length} entries`
);
console.log(`📝 Written to: ${outputPath}`);
