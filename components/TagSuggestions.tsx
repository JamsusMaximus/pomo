"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "@/components/motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface TagSuggestionsProps {
  show: boolean;
  onSelect: (tag: string) => void;
  onClose: () => void;
}

export function TagSuggestions({ show, onSelect, onClose }: TagSuggestionsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tagSuggestions = useQuery(api.pomodoros.getTagSuggestions);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (show) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [show, onClose]);

  if (!tagSuggestions || tagSuggestions.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="absolute z-50 mt-2 bg-background/95 backdrop-blur-xl border-2 border-orange-500/30 rounded-lg shadow-xl overflow-hidden min-w-[200px]"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0))",
          }}
        >
          <div className="p-2 space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Previous Tags
            </div>
            {tagSuggestions.map((suggestion, index) => (
              <motion.button
                key={suggestion.tag}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => onSelect(suggestion.tag)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-orange-500/10 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500/50 group-hover:bg-orange-500 transition-colors" />
                  <span className="text-sm font-medium">{suggestion.tag}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {suggestion.count} {suggestion.count === 1 ? "time" : "times"}
                  </span>
                  <svg
                    className="w-4 h-4 text-muted-foreground/50 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
