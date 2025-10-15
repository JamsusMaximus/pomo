"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Users, BookOpen, Dot } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getLevelInfo, getLevelTitle } from "@/lib/levels";

export function MobileBottomNav() {
  const { user, isSignedIn } = useUser();
  const pathname = usePathname();
  const profileStats = useQuery(api.stats.getProfileStats);
  const stats = useQuery(api.stats.getStats);
  const levelConfig = useQuery(api.levels.getLevelConfig);

  // Calculate level info
  const levelInfo = (() => {
    const statsToUse = profileStats || stats;
    if (!statsToUse) return null;

    const pomos = statsToUse.total.count;

    if (!levelConfig || !Array.isArray(levelConfig) || levelConfig.length === 0) {
      const info = getLevelInfo(pomos);
      return { ...info, title: getLevelTitle(info.currentLevel) };
    }

    let currentLevel = levelConfig[0];
    for (const level of levelConfig) {
      if (level.threshold <= pomos) {
        currentLevel = level;
      } else {
        break;
      }
    }

    const currentIndex = levelConfig.findIndex((l) => l.level === currentLevel.level);
    const nextLevel = levelConfig[currentIndex + 1];

    if (!nextLevel) {
      return {
        currentLevel: currentLevel.level,
        pomosForCurrentLevel: currentLevel.threshold,
        pomosForNextLevel: currentLevel.threshold,
        pomosRemaining: 0,
        progress: 100,
        title: currentLevel.title,
      };
    }

    const pomosInCurrentLevel = pomos - currentLevel.threshold;
    const pomosNeededForNextLevel = nextLevel.threshold - currentLevel.threshold;
    const progress = (pomosInCurrentLevel / pomosNeededForNextLevel) * 100;

    return {
      currentLevel: currentLevel.level,
      pomosForCurrentLevel: currentLevel.threshold,
      pomosForNextLevel: nextLevel.threshold,
      pomosRemaining: nextLevel.threshold - pomos,
      progress: Math.min(100, Math.max(0, progress)),
      title: currentLevel.title,
    };
  })();

  if (!isSignedIn) {
    return null;
  }

  const isFriendsActive = pathname === "/friends";
  const isRulesActive = pathname === "/rules";
  const isHomeActive = pathname === "/";
  const isProfileActive = pathname === "/profile";

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-area-inset-bottom">
      <div className="flex items-center justify-around h-20 px-2">
        {/* Friends */}
        <Link href="/friends" className="flex flex-col items-center justify-center gap-1.5 flex-1">
          <Users
            className={`w-5 h-5 ${isFriendsActive ? "text-orange-500" : "text-muted-foreground"}`}
          />
          <span
            className={`text-[10px] font-medium ${isFriendsActive ? "text-orange-500" : "text-muted-foreground"}`}
          >
            Friends
          </span>
        </Link>

        {/* Rules */}
        <Link href="/rules" className="flex flex-col items-center justify-center gap-1.5 flex-1">
          <BookOpen
            className={`w-5 h-5 ${isRulesActive ? "text-orange-500" : "text-muted-foreground"}`}
          />
          <span
            className={`text-[10px] font-medium ${isRulesActive ? "text-orange-500" : "text-muted-foreground"}`}
          >
            Rules
          </span>
        </Link>

        {/* Lock.in Logo - Center */}
        <Link href="/" className="flex flex-col items-center justify-center gap-1.5 flex-1">
          <div className="relative w-6 h-6">
            <svg className="w-6 h-6 -rotate-90" viewBox="0 0 36 36">
              <defs>
                <linearGradient id="mobileNavGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fb923c" stopOpacity="1" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke={isHomeActive ? "url(#mobileNavGradient)" : "currentColor"}
                strokeWidth="2.5"
                strokeLinecap="round"
                className={isHomeActive ? "" : "text-muted-foreground"}
                strokeDasharray={isHomeActive ? "100.53" : undefined}
                strokeDashoffset={isHomeActive ? "0" : undefined}
              />
            </svg>
          </div>
          <span
            className={`text-[10px] font-bold ${isHomeActive ? "text-orange-500" : "text-muted-foreground"}`}
          >
            Lock.in
          </span>
        </Link>

        {/* Placeholder - Coming Soon */}
        <div className="flex flex-col items-center justify-center gap-1.5 flex-1 opacity-30 cursor-not-allowed">
          <Dot className="w-5 h-5 text-muted-foreground" />
          <span className="text-[10px] font-medium text-muted-foreground">Soon</span>
        </div>

        {/* Profile with Level */}
        <Link href="/profile" className="flex flex-col items-center justify-center gap-1.5 flex-1">
          <div className="relative">
            {/* Circular progress ring */}
            {levelInfo && (
              <svg className="absolute -inset-0.5 w-7 h-7 -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="17"
                  fill="none"
                  stroke="url(#profileLevelGradient)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="106.81"
                  strokeDashoffset={106.81 * (1 - levelInfo.progress / 100)}
                />
                <defs>
                  <linearGradient id="profileLevelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fb923c" stopOpacity="1" />
                    <stop offset="100%" stopColor="#f97316" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
              </svg>
            )}
            <Avatar className="w-6 h-6">
              <AvatarImage src={user?.imageUrl} alt={user?.username || "User"} />
              <AvatarFallback className="text-[10px]">
                {user?.username?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
          <span
            className={`text-[10px] font-medium ${isProfileActive ? "text-orange-500" : "text-muted-foreground"}`}
          >
            You
          </span>
        </Link>
      </div>
    </nav>
  );
}
