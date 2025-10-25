"use client";

import { motion } from "@/components/motion";
import { SignedIn, useUser } from "@clerk/nextjs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Users, Lock, Handshake } from "lucide-react";
import { useUserLevel } from "@/hooks/useUserLevel";

interface NavbarProps {
  isTimerRunning?: boolean;
}

export function Navbar({ isTimerRunning = false }: NavbarProps) {
  const { user } = useUser();
  const { levelInfo } = useUserLevel();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <motion.nav
      className="hidden md:block fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border"
      animate={{
        opacity: isTimerRunning ? 0.2 : 1,
      }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      style={{
        pointerEvents: isTimerRunning ? "none" : "auto",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Left: Logo + Friends */}
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            {/* Animated Circle */}
            <div className="relative w-8 h-8">
              <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                <defs>
                  <linearGradient id="navLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fb923c" stopOpacity="1" />
                    <stop offset="100%" stopColor="#f97316" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
                {/* Animated progress circle - no background */}
                {isLoaded && (
                  <motion.circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="url(#navLogoGradient)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: 100.53, strokeDashoffset: 100.53 }}
                    animate={{ strokeDashoffset: 0 }}
                    transition={{ duration: 1.4, delay: 0.4, ease: [0.65, 0, 0.35, 1] }}
                  />
                )}
              </svg>
            </div>
            {/* Lock.in Text */}
            <span className="text-xl font-bold tracking-tight group-hover:text-orange-500 transition-colors">
              Lock.in
            </span>
          </Link>

          {/* Friends Menu */}
          <SignedIn>
            <Link
              href="/friends"
              className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted transition-colors text-sm font-medium"
            >
              <Users className="w-4 h-4" />
              <span>Friends</span>
            </Link>
          </SignedIn>

          {/* Pacts Menu */}
          <SignedIn>
            <Link
              href="/pacts"
              className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted transition-colors text-sm font-medium"
            >
              <Handshake className="w-4 h-4" />
              <span>Pacts</span>
            </Link>
          </SignedIn>

          {/* Rules Menu */}
          <Link
            href="/rules"
            className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted transition-colors text-sm font-medium"
          >
            <Lock className="w-4 h-4" />
            <span>Rules</span>
          </Link>
        </div>

        {/* Right: Profile, Level, Dark Mode */}
        <div className="flex items-center gap-3">
          <SignedIn>
            <Link
              href="/profile"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Avatar className="w-8 h-8 cursor-pointer">
                <AvatarImage src={user?.imageUrl} alt={user?.username || "User"} />
                <AvatarFallback>{user?.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
              {/* Level indicator */}
              <div className="flex flex-col gap-1 w-20">
                {levelInfo ? (
                  <motion.div
                    className="flex flex-col gap-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <span className="text-sm font-medium">Level {levelInfo.currentLevel}</span>
                    <div className="w-20 h-1 bg-muted/50 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-orange-400/60 to-orange-500/60"
                        initial={{ width: 0 }}
                        animate={{ width: `${levelInfo.progress}%` }}
                        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                      />
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex flex-col gap-1 opacity-0">
                    <span className="text-sm font-medium">Level 1</span>
                    <div className="w-20 h-1 bg-muted/50 rounded-full" />
                  </div>
                )}
              </div>
            </Link>
          </SignedIn>
          <ThemeToggle />
        </div>
      </div>
    </motion.nav>
  );
}
