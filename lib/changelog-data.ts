// Auto-generated from git commits by scripts/generate-changelog.js
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

export const changelog: ChangelogEntry[] = [
  {
    date: "October 5, 2025",
    changes: [
      {
        hash: "b433536",
        date: "2025-10-05",
        type: "feature",
        label: "New",
        title: "Auto-generate changelog from git commits",
        description: "auto-generate changelog from git commits",
      },
      {
        hash: "7ebb133",
        date: "2025-10-05",
        type: "feature",
        label: "New",
        title: "Add changelog page at /changelog",
        description: "add changelog page at /changelog",
      },
      {
        hash: "8dcfa34",
        date: "2025-10-05",
        type: "feature",
        label: "New",
        title: "Show user level beside avatar in navigation",
        description: "show user level beside avatar in navigation",
      },
      {
        hash: "1da11ad",
        date: "2025-10-05",
        type: "feature",
        label: "New",
        title: "Add Tauri for Mac app packaging",
        description: "add Tauri for Mac app packaging",
      },
      {
        hash: "280c4db",
        date: "2025-10-05",
        type: "feature",
        label: "New",
        title: "Add completion sound and browser notifications",
        description: "add completion sound and browser notifications",
      },
    ],
  },
  {
    date: "October 4, 2025",
    changes: [
      {
        hash: "5e913a7",
        date: "2025-10-04",
        type: "feature",
        label: "New",
        title: "Add pomodoro session feed",
        description: "add pomodoro session feed",
      },
      {
        hash: "9b3aab2",
        date: "2025-10-04",
        type: "feature",
        label: "New",
        title: "Make auth optional, add local session storage",
        description: "make auth optional, add local session storage",
      },
    ],
  },
  {
    date: "October 3, 2025",
    changes: [
      {
        hash: "9871df9",
        date: "2025-10-03",
        type: "feature",
        label: "New",
        title: "Cohesive minimal dark theme with slate palette",
        description: "cohesive minimal dark theme with slate palette",
      },
    ],
  },
];
