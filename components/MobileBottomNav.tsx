"use client";

import { useUser } from "@clerk/nextjs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Users, Lock, Trophy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserLevel } from "@/hooks/useUserLevel";

export function MobileBottomNav() {
  const { user, isSignedIn } = useUser();
  const pathname = usePathname();
  const { levelInfo } = useUserLevel();

  if (!isSignedIn) {
    return null;
  }

  const isFriendsActive = pathname === "/friends";
  const isRulesActive = pathname === "/rules";
  const isHomeActive = pathname === "/";
  const isChallengesActive = pathname === "/challenges";
  const isProfileActive = pathname === "/profile";

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-area-inset-bottom"
      style={{ position: "fixed" }}
    >
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
          <Lock
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

        {/* Challenges */}
        <Link
          href="/challenges"
          className="flex flex-col items-center justify-center gap-1.5 flex-1"
        >
          <Trophy
            className={`w-5 h-5 ${isChallengesActive ? "text-orange-500" : "text-muted-foreground"}`}
          />
          <span
            className={`text-[10px] font-medium ${isChallengesActive ? "text-orange-500" : "text-muted-foreground"}`}
          >
            Challenges
          </span>
        </Link>

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
            {levelInfo ? `Level ${levelInfo.currentLevel}` : "Level 1"}
          </span>
        </Link>
      </div>
    </nav>
  );
}
