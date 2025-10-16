"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Download, Check } from "lucide-react";

export default function DownloadPage() {
  return (
    <main className="min-h-screen px-4 pt-20 pb-12 sm:pt-24">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-8 min-h-[44px]">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Timer
          </Button>
        </Link>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold mb-4">Download Pomo</h1>
          <p className="text-xl text-muted-foreground">
            Native Mac app for the best pomodoro experience
          </p>
        </motion.div>

        {/* Download Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-card rounded-2xl shadow-2xl border border-border p-8 mb-12"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-orange-500 rounded-full flex items-center justify-center mb-6">
              <Download className="w-12 h-12 text-white" />
            </div>

            <h2 className="text-2xl font-bold mb-2">Pomo for macOS</h2>
            <p className="text-muted-foreground mb-6">Version 0.1.0 • 5MB</p>

            <Button size="lg" className="px-12 py-6 text-lg mb-4">
              <Download className="w-5 h-5 mr-2" />
              Download for Mac (Apple Silicon)
            </Button>

            <p className="text-sm text-muted-foreground">
              macOS 10.13 or later • Free & Open Source
            </p>

            <div className="mt-6 text-sm text-muted-foreground">
              <p>
                <strong>Note:</strong> If you see &quot;unidentified developer&quot;, right-click →
                Open
              </p>
              <p>or go to System Settings → Privacy & Security → Open Anyway</p>
            </div>
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid md:grid-cols-2 gap-6 mb-12"
        >
          <div className="bg-card rounded-2xl shadow-lg border border-border p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Check className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h3 className="font-bold mb-2">Native Notifications</h3>
                <p className="text-sm text-muted-foreground">
                  Get alerts even when the app is in the background or minimized
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-lg border border-border p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Check className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h3 className="font-bold mb-2">Lightning Fast</h3>
                <p className="text-sm text-muted-foreground">
                  Native performance without browser overhead
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-lg border border-border p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Check className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h3 className="font-bold mb-2">Works Offline</h3>
                <p className="text-sm text-muted-foreground">
                  No internet required. Your timer works anywhere
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-lg border border-border p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Check className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h3 className="font-bold mb-2">Tiny Size</h3>
                <p className="text-sm text-muted-foreground">
                  Only 5MB. Downloads in seconds, not minutes
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-card rounded-2xl shadow-lg border border-border p-8"
        >
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>

          <div className="space-y-6">
            <div>
              <h3 className="font-bold mb-2">Is this safe to install?</h3>
              <p className="text-sm text-muted-foreground">
                Yes! Pomo is open source and built with Tauri (backed by Rust). You can review the
                code on{" "}
                <a
                  href="https://github.com/yourusername/pomo"
                  className="text-orange-500 hover:underline"
                >
                  GitHub
                </a>
                .
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2">Do I need an account?</h3>
              <p className="text-sm text-muted-foreground">
                No! The app works perfectly without signing in. Your sessions are stored locally.
                Sign in is optional if you want to sync across devices.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2">What about Intel Macs?</h3>
              <p className="text-sm text-muted-foreground">
                Currently only Apple Silicon (M1/M2/M3) builds are available. Intel support coming
                soon. Use the web version at{" "}
                <Link href="/" className="text-orange-500 hover:underline">
                  pomo.vercel.app
                </Link>{" "}
                in the meantime.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2">How do I update?</h3>
              <p className="text-sm text-muted-foreground">
                Download the latest version from this page when a new release is available.
                Automatic updates coming in v0.2.0!
              </p>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">Prefer to use in your browser?</p>
          <Link href="/">
            <Button variant="outline" size="lg">
              Launch Web App
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
