"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "@/components/motion";
import { Input } from "@/components/ui/input";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface TagInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  isPrivate?: boolean;
  onPrivacyChange?: (isPrivate: boolean) => void;
  isSignedIn?: boolean;
  onEnterPress?: () => void;
}

export function TagInput({
  value,
  onChange,
  disabled,
  placeholder = "Tag e.g. coding, writing, piano",
  isPrivate = false,
  onPrivacyChange,
  isSignedIn = false,
  onEnterPress,
}: TagInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showPrivacyToast, setShowPrivacyToast] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const privacyToastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const tagSuggestions = useQuery(api.pomodoros.getTagSuggestions);

  // Cleanup privacy toast timer on unmount
  useEffect(() => {
    return () => {
      if (privacyToastTimerRef.current) {
        clearTimeout(privacyToastTimerRef.current);
      }
    };
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setIsFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePrivacyToggle = () => {
    if (!onPrivacyChange) return;

    const newPrivateState = !isPrivate;
    onPrivacyChange(newPrivateState);

    // Clear existing timer if any
    if (privacyToastTimerRef.current) {
      clearTimeout(privacyToastTimerRef.current);
    }

    // Show toast
    setShowPrivacyToast(true);

    // Auto-hide after 2 seconds
    privacyToastTimerRef.current = setTimeout(() => {
      setShowPrivacyToast(false);
    }, 2000);
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (tagSuggestions && tagSuggestions.length > 0) {
      setShowSuggestions(true);
    }
    // Scroll input into view on mobile to prevent keyboard obstruction
    // Use 'start' to position input near top of visible area (above keyboard)
    setTimeout(() => {
      inputRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });
      // Additional scroll to add padding above input
      window.scrollBy({ top: -60, behavior: "smooth" });
    }, 350); // Delay to allow keyboard animation
  };

  const handleBlur = () => {
    // Delay to allow clicking on suggestions
    setTimeout(() => {
      setIsFocused(false);
    }, 200);
  };

  const handleSuggestionClick = (tag: string) => {
    onChange(tag);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onEnterPress) {
      e.preventDefault();
      setShowSuggestions(false);
      inputRef.current?.blur(); // Close keyboard on mobile
      onEnterPress();
    }
  };

  const filteredSuggestions =
    tagSuggestions?.filter((s) => s.tag.toLowerCase().includes(value.toLowerCase())) || [];

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Privacy Toast - appears above input */}
      <AnimatePresence>
        {showPrivacyToast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-lg shadow-lg px-4 py-2 text-sm whitespace-nowrap"
          >
            {isPrivate
              ? "Tag is private (only you can see it)"
              : "This tag can be seen by your friends"}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="relative rounded-md border-2 border-border/50 focus-within:border-orange-500/50 transition-colors">
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="h-12 text-sm text-center font-medium bg-muted/30 focus:bg-background transition-all duration-200 placeholder:text-muted-foreground/50 px-12 border-0 rounded-md"
        />
        <div className="absolute right-[0.25rem] top-1/2 -translate-y-1/2 flex items-center gap-2">
          {/* Privacy toggle button - only show if signed in, onPrivacyChange is provided, and tag has content */}
          {isSignedIn && onPrivacyChange && value && (
            <button
              type="button"
              onClick={handlePrivacyToggle}
              disabled={disabled}
              className={`p-1 rounded transition-colors ${
                isPrivate
                  ? "text-orange-500 hover:text-orange-600"
                  : "text-gray-300 hover:text-gray-400"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              title={
                isPrivate
                  ? "Tag is private (only you can see it)"
                  : "This tag can be seen by your friends"
              }
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isPrivate ? (
                  <>
                    {/* Eye with slash (private) */}
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </>
                ) : (
                  <>
                    {/* Eye (public) */}
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </>
                )}
              </svg>
            </button>
          )}
          {/* Clear button */}
          {value && !disabled && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => onChange("")}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </motion.button>
          )}
        </div>
      </div>

      {/* Tag Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && filteredSuggestions.length > 0 && isFocused && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-2 bg-background/80 backdrop-blur-xl border-2 border-orange-500/30 rounded-lg shadow-xl overflow-hidden"
            style={{
              backgroundImage:
                "linear-gradient(to bottom, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0))",
            }}
          >
            <div className="p-2 space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Previous Tags
              </div>
              {filteredSuggestions.map((suggestion, index) => (
                <motion.button
                  key={suggestion.tag}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => handleSuggestionClick(suggestion.tag)}
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
    </div>
  );
}
