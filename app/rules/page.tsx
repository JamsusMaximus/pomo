import { Metadata } from "next";
import Link from "next/link";
import { Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "Rules | Lock.in",
  description: "The rules are simple - lock in and focus",
};

export default function RulesPage() {
  return (
    <div className="min-h-screen pb-24 md:pb-8 pt-6 md:pt-24 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-orange-500/10 rounded-xl">
            <Lock className="w-6 h-6 text-orange-500" />
          </div>
          <h1 className="text-3xl font-bold">The Rules are simple</h1>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* The Rules */}
          <section className="bg-card rounded-xl p-6 border border-border">
            <ol className="space-y-6">
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center font-semibold">
                  1
                </span>
                <div className="space-y-2">
                  <p className="font-bold text-base">Close all chats.</p>
                  <p className="text-muted-foreground leading-relaxed">
                    No WhatsApp. No Slack. No disturbances when locked in.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center font-semibold">
                  2
                </span>
                <div className="space-y-2">
                  <p className="font-bold text-base">Do not touch your phone.</p>
                  <p className="text-muted-foreground leading-relaxed">
                    Put it upside down or in a different room. If you&apos;re using Lock.in on your
                    mobile, put it somewhere visible and don&apos;t touch it.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center font-semibold">
                  3
                </span>
                <div className="space-y-2">
                  <p className="font-bold text-base">Singular Focus.</p>
                  <p className="text-muted-foreground leading-relaxed">
                    While the timer is ticking, you are focused on one thing only. Honour the Lock
                    In.
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
