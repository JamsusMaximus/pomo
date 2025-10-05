// Auto-generated from git commits by Claude AI (scripts/generate-changelog.mjs)
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
        hash: "",
        type: "feature",
        label: "New",
        title: "Pomodoro session feed",
        description: "You can now view a feed of your completed Pomodoro sessions.",
      },
      {
        hash: "",
        type: "feature",
        label: "New",
        title: "Hybrid Convex sync",
        description:
          "Your Pomodoro sessions are now automatically synced to the cloud when you're signed in.",
      },
      {
        hash: "",
        type: "feature",
        label: "New",
        title: "Optional authentication",
        description:
          "You can now use the app without signing in, with your sessions stored locally.",
      },
    ],
  },
  {
    date: "October 4, 2025",
    changes: [
      {
        hash: "",
        type: "feature",
        label: "New",
        title: "Streamlined signup",
        description:
          "The signup form now only requires an email, with Google sign-in as the prominent option.",
      },
      {
        hash: "",
        type: "feature",
        label: "New",
        title: "Completion notifications with sound",
        description:
          "You'll get notifications when a Pomodoro session completes, with an optional sound.",
      },
      {
        hash: "",
        type: "feature",
        label: "New",
        title: "24-hour time format",
        description:
          "The session feed now displays time in a 24-hour format for better readability.",
      },
    ],
  },
];
