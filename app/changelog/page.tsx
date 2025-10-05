"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function ChangelogPage() {
  const changelog = [
    {
      date: "October 5, 2025",
      changes: [
        {
          title: "User Levels & Progression System",
          description:
            "Added exponential leveling system (Level 2 at 2 pomos, Level 3 at 4, Level 4 at 8, etc.). Shows current level in navigation bar and detailed progress on profile page with Pokemon-style XP bar.",
          type: "feature",
        },
        {
          title: "Activity Heatmap",
          description:
            "GitHub-style activity heatmap on profile page showing productive days over the past 8 weeks in orange color intensity.",
          type: "feature",
        },
        {
          title: "Profile & Stats Dashboard",
          description:
            "Comprehensive profile page showing total pomodoros, weekly/monthly/yearly stats, level progression, and account management. Includes sign out and Clerk profile integration.",
          type: "feature",
        },
        {
          title: "Improved Navigation",
          description:
            "Replaced profile button with user avatar showing current level. Clicking avatar goes to profile page.",
          type: "improvement",
        },
        {
          title: "Completion Notifications",
          description:
            "Added browser notifications when pomodoro completes, with calming chime sound using Web Audio API. Works even when app is in background.",
          type: "feature",
        },
        {
          title: "Keyboard Shortcuts",
          description: "Space bar now starts/pauses timer. Shows subtle hint on first load.",
          type: "feature",
        },
        {
          title: "Enhanced Timer Controls",
          description:
            "Timer shows Start → Pause → Reset flow. Paused state shows 'Click to Resume'. Displays 'Pomos Today' counter that increments on completion.",
          type: "improvement",
        },
        {
          title: "Pomodoro Feed",
          description:
            "Recent completed sessions feed showing time started, time finished, duration, and tags in 24-hour format.",
          type: "feature",
        },
        {
          title: "Optional Authentication",
          description:
            "App works fully without sign-in. Sessions stored locally. Optional sign-in syncs data to cloud via Convex, with automatic migration of local sessions.",
          type: "feature",
        },
        {
          title: "Mac App Distribution",
          description:
            "Set up Tauri for native Mac app packaging (~5MB). Added download page with feature showcase and distribution guides.",
          type: "feature",
        },
      ],
    },
    {
      date: "October 4, 2025",
      changes: [
        {
          title: "Backend Infrastructure",
          description:
            "Integrated Convex for real-time backend, Clerk for authentication, and comprehensive test suite with Vitest.",
          type: "feature",
        },
        {
          title: "User System",
          description:
            "Secure user management with auto-generated usernames from first/last name, deduplication logic, and profile syncing.",
          type: "feature",
        },
        {
          title: "Data Persistence",
          description:
            "Local storage for preferences (durations, cycles) and completed sessions. Cloud sync when signed in.",
          type: "feature",
        },
        {
          title: "CI/CD Pipeline",
          description:
            "GitHub Actions workflow with Prettier, ESLint (strict mode), TypeScript checking, and automated builds.",
          type: "improvement",
        },
      ],
    },
    {
      date: "October 3, 2025",
      changes: [
        {
          title: "Dark Mode",
          description:
            "Full dark mode support with theme toggle and cohesive minimal aesthetic using slate/neutral colors with AA contrast accessibility.",
          type: "feature",
        },
        {
          title: "Focus & Break Modes",
          description:
            "Auto-switching between focus (default 25min) and break (default 5min) sessions with cycle tracking.",
          type: "feature",
        },
        {
          title: "Circular Progress Ring",
          description:
            "Animated SVG progress ring around timer with subtle gradient, replacing horizontal progress bar.",
          type: "feature",
        },
        {
          title: "Session Tagging",
          description: "Add optional keywords/tags to focus sessions for categorization.",
          type: "feature",
        },
        {
          title: "Responsive Design",
          description:
            "Mobile-optimized layout with proper spacing, rounded-2xl cards, and clean typography scale.",
          type: "improvement",
        },
      ],
    },
    {
      date: "October 2, 2025",
      changes: [
        {
          title: "Initial Release",
          description:
            "Pomodoro timer with configurable focus/break durations, start/pause/reset controls, and Framer Motion animations.",
          type: "feature",
        },
      ],
    },
  ];

  return (
    <main className="min-h-screen px-4 py-8 sm:py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Timer
            </Button>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-500 rounded-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold">Changelog</h1>
          </div>
          <p className="text-muted-foreground">
            New features and improvements to Pomo. Follow along as we build in public.
          </p>
        </motion.div>

        {/* Changelog entries */}
        <div className="space-y-12">
          {changelog.map((entry, idx) => (
            <motion.div
              key={entry.date}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
            >
              {/* Date header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold">{entry.date}</h2>
                <div className="mt-2 h-px bg-border" />
              </div>

              {/* Changes */}
              <div className="space-y-6 ml-4">
                {entry.changes.map((change, changeIdx) => (
                  <div key={changeIdx} className="relative pl-6">
                    {/* Bullet point */}
                    <div className="absolute left-0 top-2 w-2 h-2 rounded-full bg-orange-500" />

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{change.title}</h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            change.type === "feature"
                              ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          {change.type === "feature" ? "New" : "Improved"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {change.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>Built with Next.js, Tailwind CSS, Convex, Clerk, and Tauri</p>
          <p className="mt-2">
            <a
              href="https://github.com/jamsusmaximus/pomo"
              className="text-orange-500 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              View source on GitHub
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
