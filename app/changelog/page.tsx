"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { changelog } from "@/lib/changelog-data";

export default function ChangelogPage() {
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
                              : change.type === "fix"
                                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          {change.label}
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
