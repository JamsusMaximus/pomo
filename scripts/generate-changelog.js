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

// Filter and categorize significant commits
const significantPrefixes = {
  "feat:": { type: "feature", label: "New" },
  "fix:": { type: "fix", label: "Fixed" },
  "perf:": { type: "improvement", label: "Improved" },
  "refactor:": { type: "improvement", label: "Improved" },
};

// Keywords to filter out minor changes
const minorKeywords = [
  "typo",
  "formatting",
  "prettier",
  "lint",
  "comment",
  "readme",
  "docs only",
  "whitespace",
  "missing import",
];

const significantCommits = commits
  .filter((commit) => {
    // Check if it has a significant prefix
    const hasPrefix = Object.keys(significantPrefixes).some((prefix) =>
      commit.message.toLowerCase().startsWith(prefix)
    );
    if (!hasPrefix) return false;

    // Filter out minor changes
    const isMinor = minorKeywords.some((keyword) => commit.message.toLowerCase().includes(keyword));
    return !isMinor;
  })
  .map((commit) => {
    // Determine type from prefix
    const prefix = Object.keys(significantPrefixes).find((p) =>
      commit.message.toLowerCase().startsWith(p)
    );
    const { type, label } = significantPrefixes[prefix];

    // Extract title and description
    const messageWithoutPrefix = commit.message.substring(prefix.length).trim();
    const [title, ...descParts] = messageWithoutPrefix.split("\n");
    const description = descParts.join(" ").trim();

    return {
      hash: commit.hash.substring(0, 7),
      date: commit.date,
      type,
      label,
      title: title.charAt(0).toUpperCase() + title.slice(1), // Capitalize
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
    changes: groupedByDate[date],
  }));

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
