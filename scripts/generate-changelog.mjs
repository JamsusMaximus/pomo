#!/usr/bin/env node

/**
 * Generate changelog from git commits using Claude AI
 * Uses Claude Haiku to intelligently summarize user-facing changes
 * Outputs to lib/changelog-data.ts
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check for API key
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("❌ Error: ANTHROPIC_API_KEY environment variable not set");
  console.error("   Set it in your shell or .env file");
  process.exit(1);
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Get the date of the last changelog entry to determine what needs processing
const outputPath = path.join(__dirname, "../lib/changelog-data.ts");
let lastChangelogDate = null;

if (fs.existsSync(outputPath)) {
  try {
    const existingContent = fs.readFileSync(outputPath, "utf-8");
    const match = existingContent.match(/export const changelog: ChangelogEntry\[\] = ([\s\S]*);/);
    if (match) {
      const existingChangelog = JSON.parse(match[1]);
      if (existingChangelog.length > 0) {
        // Parse the first entry's date (most recent)
        const mostRecentEntry = existingChangelog[0].date;
        lastChangelogDate = new Date(mostRecentEntry);
      }
    }
  } catch {
    console.log("⚠️  Could not parse existing changelog");
  }
}

// If no existing changelog, start from 7 days ago (to catch recent history)
// If existing changelog, start from the day after the last entry
let sinceDate;
if (lastChangelogDate) {
  sinceDate = new Date(lastChangelogDate);
  sinceDate.setDate(sinceDate.getDate() + 1);
} else {
  sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - 7);
}

const sinceDateStr = sinceDate.toISOString().split("T")[0];
const today = new Date();
const todayStr = today.toISOString().split("T")[0];

console.log(`📅 Processing commits from ${sinceDateStr} to ${todayStr}`);

const gitLog = execSync(
  `git log --since="${sinceDateStr} 00:00:00" --until="${todayStr} 23:59:59" --pretty=format:"%H|%ad|%s|%b" --date=format:"%Y-%m-%d" --no-merges`,
  { encoding: "utf-8" }
);

if (!gitLog.trim()) {
  console.log("⚠️  No new commits to process. Keeping existing changelog.");
  process.exit(0);
}

// Parse commits
const commits = gitLog
  .trim()
  .split("\n")
  .map((line) => {
    const [hash, date, subject, body] = line.split("|");
    return {
      hash: hash.substring(0, 7),
      date,
      subject,
      body: body || "",
    };
  });

// Group by date
const commitsByDate = commits.reduce((acc, commit) => {
  if (!acc[commit.date]) {
    acc[commit.date] = [];
  }
  acc[commit.date].push(commit);
  return acc;
}, {});

console.log(`📊 Found ${commits.length} commits across ${Object.keys(commitsByDate).length} days`);
console.log(`🤖 Asking Claude Haiku to generate changelog...`);

// Prepare prompt for Claude
const commitSummary = Object.keys(commitsByDate)
  .sort((a, b) => new Date(b) - new Date(a))
  .map((date) => {
    const dayCommits = commitsByDate[date];
    return `## ${date}\n${dayCommits.map((c) => `- ${c.subject}\n  ${c.body}`).join("\n")}`;
  })
  .join("\n\n");

const prompt = `You are analyzing git commits for a Pomodoro timer web app. Extract ONLY user-facing features and changes.

**Exclude:**
- Backend infrastructure (Convex, Clerk, database, auth setup)
- Build/CI/deployment changes
- Code refactoring, formatting, linting
- Bug fixes unless they significantly impact UX
- Minor UI tweaks (moving buttons, color changes, etc.)
- Documentation

**Include:**
- New features users can see/use
- Major UX improvements
- Important functionality additions
- Significant bug fixes that improve user experience

**Format your response as valid JSON:**
\`\`\`json
[
  {
    "date": "October 5, 2025",
    "changes": [
      {
        "type": "feature",
        "label": "New",
        "title": "Feature title (2-4 words)",
        "description": "One clear sentence describing what users can now do (max 20 words)"
      }
    ]
  }
]
\`\`\`

**Type categorization:**
- type: "feature" + label: "New" = Brand new functionality
- type: "improvement" + label: "Improved" = Enhancement to existing feature
- type: "fix" + label: "Fixed" = Important bug fix that improves UX

**Guidelines:**
- Group similar changes together (e.g., combine "add notifications" + "add sound" into "Completion notifications with sound")
- Maximum 5 changes per day
- Be comprehensive but concise
- Write from user's perspective ("You can now..." not "Added...")
- Skip days with no user-facing changes
- Always include type and label fields for each change

Here are the commits:

${commitSummary}`;

async function generateChangelog() {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307", // Cheapest model
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.content[0].text;

    // Extract JSON from response (Claude might wrap it in markdown code blocks)
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\[([\s\S]*)\]/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from Claude response");
    }

    const jsonText = jsonMatch[1] || jsonMatch[0];
    const newEntries = JSON.parse(jsonText);

    // Load existing changelog (outputPath already defined earlier)
    let existingChangelog = [];

    if (fs.existsSync(outputPath)) {
      try {
        const existingContent = fs.readFileSync(outputPath, "utf-8");
        const match = existingContent.match(
          /export const changelog: ChangelogEntry\[\] = ([\s\S]*);/
        );
        if (match) {
          existingChangelog = JSON.parse(match[1]);
        }
      } catch {
        console.log("⚠️  Could not parse existing changelog, starting fresh");
      }
    }

    // Merge new entries with existing (prepend new entries)
    const mergedChangelog = [...newEntries, ...existingChangelog];

    // Remove duplicates by date and keep only the first occurrence
    const uniqueChangelog = [];
    const seenDates = new Set();

    for (const entry of mergedChangelog) {
      if (!seenDates.has(entry.date)) {
        seenDates.add(entry.date);
        uniqueChangelog.push(entry);
      }
    }

    // Ensure all changes have required fields (Claude should provide these now)
    const formattedChangelog = uniqueChangelog.map((entry) => ({
      date: entry.date,
      changes: entry.changes.map((change) => ({
        hash: change.hash || "",
        type: change.type || "feature", // Fallback only if Claude didn't provide
        label: change.label || "New",   // Fallback only if Claude didn't provide
        title: change.title,
        description: change.description,
      })),
    }));

    // Generate TypeScript file
    const tsContent = `// Auto-generated from git commits by Claude AI (scripts/generate-changelog.mjs)
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

export const changelog: ChangelogEntry[] = ${JSON.stringify(formattedChangelog, null, 2)};
`;

    // Write to file
    fs.writeFileSync(outputPath, tsContent);

    const totalChanges = formattedChangelog.reduce((sum, entry) => sum + entry.changes.length, 0);
    const newChanges = newEntries.reduce((sum, entry) => sum + entry.changes.length, 0);

    console.log(`✅ Added ${newChanges} new changes from yesterday`);
    console.log(`📊 Total changelog: ${formattedChangelog.length} days, ${totalChanges} changes`);
    console.log(`📝 Written to: ${outputPath}`);
  } catch (error) {
    console.error("❌ Error generating changelog:", error.message);
    process.exit(1);
  }
}

generateChangelog();
