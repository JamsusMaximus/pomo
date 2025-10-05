#!/usr/bin/env node

/**
 * Generate changelog from git commits using Claude AI
 * Uses Claude Haiku to intelligently summarize user-facing changes
 * Outputs to lib/changelog-data.ts
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const Anthropic = require("@anthropic-ai/sdk").default;

// Check for API key
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("❌ Error: ANTHROPIC_API_KEY environment variable not set");
  console.error("   Set it in your shell or .env file");
  process.exit(1);
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Get git log for the last 30 days
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
const sinceDate = thirtyDaysAgo.toISOString().split("T")[0];

const gitLog = execSync(
  `git log --since="${sinceDate}" --pretty=format:"%H|%ad|%s|%b" --date=format:"%Y-%m-%d" --no-merges`,
  { encoding: "utf-8" }
);

if (!gitLog.trim()) {
  console.log("⚠️  No commits found in the last 30 days");
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

**Format your response as valid JSON:**
\`\`\`json
[
  {
    "date": "October 5, 2025",
    "changes": [
      {
        "title": "Feature title (2-4 words)",
        "description": "One clear sentence describing what users can now do (max 20 words)"
      }
    ]
  }
]
\`\`\`

**Guidelines:**
- Group similar changes together (e.g., combine "add notifications" + "add sound" into "Completion notifications with sound")
- Maximum 5 changes per day
- Be comprehensive but concise
- Write from user's perspective ("You can now..." not "Added...")
- Skip days with no user-facing changes

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
    const changelog = JSON.parse(jsonText);

    // Add type and label to each change
    const formattedChangelog = changelog.map((entry) => ({
      ...entry,
      changes: entry.changes.map((change) => ({
        ...change,
        type: "feature",
        label: "New",
        hash: "", // We don't track individual hashes in AI-generated changelog
      })),
    }));

    // Generate TypeScript file
    const tsContent = `// Auto-generated from git commits by Claude AI (scripts/generate-changelog.js)
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
    const outputPath = path.join(__dirname, "../lib/changelog-data.ts");
    fs.writeFileSync(outputPath, tsContent);

    const totalChanges = formattedChangelog.reduce((sum, entry) => sum + entry.changes.length, 0);
    console.log(
      `✅ Generated changelog with ${formattedChangelog.length} days and ${totalChanges} user-facing changes`
    );
    console.log(`📝 Written to: ${outputPath}`);
  } catch (error) {
    console.error("❌ Error generating changelog:", error.message);
    process.exit(1);
  }
}

generateChangelog();
