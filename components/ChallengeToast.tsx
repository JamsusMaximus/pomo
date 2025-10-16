"use client";

import { motion } from "@/components/motion";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Award } from "lucide-react";

interface ChallengeToastProps {
  challenge: {
    name: string;
    description: string;
    badge: string;
    progress: number;
    target: number;
    percentage: number;
  };
  onDismiss: () => void;
}

// Helper to render Lucide icon from string name
const ChallengeIcon = ({ iconName, className }: { iconName: string; className?: string }) => {
  const Icon = (LucideIcons as unknown as Record<string, LucideIcon>)[iconName];
  if (!Icon) {
    return <Award className={className} />;
  }
  return <Icon className={className} />;
};

export function ChallengeToast({ challenge, onDismiss }: ChallengeToastProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.3,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="fixed right-8 top-1/2 -translate-y-1/2 z-50 w-80 max-md:right-auto max-md:left-1/2 max-md:-translate-x-1/2 max-md:top-20 max-md:translate-y-0"
    >
      <div
        className="relative bg-background/80 backdrop-blur-xl border-2 border-orange-500/30 rounded-2xl shadow-2xl p-5 cursor-pointer hover:border-orange-500/50 transition-colors"
        onClick={onDismiss}
        style={{
          backgroundImage:
            "linear-gradient(to bottom right, rgba(249, 115, 22, 0.05), rgba(255, 255, 255, 0))",
        }}
      >
        {/* Close button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full hover:bg-foreground/10 transition-colors"
          aria-label="Dismiss"
        >
          <svg
            className="w-4 h-4 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Content */}
        <div className="flex items-start gap-4 pr-6">
          {/* Badge Icon */}
          <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-orange-500/10 rounded-xl">
            <ChallengeIcon iconName={challenge.badge} className="w-6 h-6 text-orange-500" />
          </div>

          {/* Challenge info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate">{challenge.name}</h3>
            </div>

            {/* Progress bar */}
            <div className="mb-2">
              <div className="h-2 bg-border/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${challenge.percentage}%` }}
                  transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-600"
                />
              </div>
            </div>

            {/* Progress text */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {challenge.progress} / {challenge.target}
              </span>
              <span className="font-semibold text-orange-500">{challenge.percentage}%</span>
            </div>
          </div>
        </div>

        {/* Subtle hint */}
        <p className="text-xs text-muted-foreground/70 mt-3 text-center">Click to dismiss</p>
      </div>
    </motion.div>
  );
}
