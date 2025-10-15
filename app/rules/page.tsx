import { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "Rules | Lock.in",
  description: "How the Pomodoro technique works and why it's effective",
};

export default function RulesPage() {
  return (
    <div className="min-h-screen pb-24 md:pb-8 pt-20 md:pt-24 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-orange-500/10 rounded-xl">
            <BookOpen className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Rules</h1>
            <p className="text-muted-foreground">How the Pomodoro Technique works</p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* How it works */}
          <section className="bg-card rounded-xl p-6 border border-border">
            <h2 className="text-xl font-semibold mb-4">How It Works</h2>
            <ol className="space-y-4">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center font-semibold">
                  1
                </span>
                <div>
                  <p className="font-medium">Choose a task</p>
                  <p className="text-sm text-muted-foreground">
                    Pick something you want to work on - it could be studying, coding, writing, or
                    any focused work.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center font-semibold">
                  2
                </span>
                <div>
                  <p className="font-medium">Set the timer</p>
                  <p className="text-sm text-muted-foreground">
                    Start a 25-minute focus session (or use custom durations like 15, 30, or 45
                    minutes).
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center font-semibold">
                  3
                </span>
                <div>
                  <p className="font-medium">Work without interruption</p>
                  <p className="text-sm text-muted-foreground">
                    Focus completely on your task. No checking phone, no browsing, no distractions.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center font-semibold">
                  4
                </span>
                <div>
                  <p className="font-medium">Take a break</p>
                  <p className="text-sm text-muted-foreground">
                    When the timer rings, take a 5-minute break. Stretch, grab water, rest your
                    eyes.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center font-semibold">
                  5
                </span>
                <div>
                  <p className="font-medium">Repeat and rest</p>
                  <p className="text-sm text-muted-foreground">
                    After 4 pomodoros, take a longer 15-30 minute break to fully recharge.
                  </p>
                </div>
              </li>
            </ol>
          </section>

          {/* Call to action */}
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 rounded-xl p-8 text-center border border-orange-500/20">
            <h2 className="text-2xl font-bold mb-4">Ready to lock in?</h2>
            <Link
              href="/?autostart=true"
              className="inline-flex items-center justify-center px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
            >
              Start Timer
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
