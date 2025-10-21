"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { X, Copy, Check } from "lucide-react";

interface CreateChallengeModalProps {
  onClose: () => void;
}

export function CreateChallengeModal({ onClose }: CreateChallengeModalProps) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  const createChallenge = useMutation(api.accountabilityChallenges.createAccountabilityChallenge);

  // Get tomorrow's date as minimum (in YYYY-MM-DD format)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const handleCreate = async () => {
    if (!startDate) {
      alert("Please select a start date");
      return;
    }

    setIsCreating(true);
    try {
      const result = await createChallenge({
        name: name || "Focus Pact",
        startDate,
      });

      setJoinCode(result.joinCode);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      alert(`Failed to create pact: ${message}`);
      setIsCreating(false);
    }
  };

  const copyJoinCode = () => {
    navigator.clipboard.writeText(joinCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleClose = () => {
    onClose();
    // Refresh page to show new pact
    if (joinCode) {
      window.location.reload();
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full relative"
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {!joinCode ? (
            // Create form
            <>
              <h2 className="text-2xl font-bold mb-2">Create Pact</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Start a 4-day accountability pact. All participants must complete 1 pomodoro each
                day or everyone fails!
              </p>

              <div className="space-y-4 mb-6">
                {/* Pact Name */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Pact Name <span className="text-gray-500 dark:text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Focus Pact"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none transition-colors"
                    maxLength={50}
                  />
                </div>

                {/* Start Date */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={minDate}
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-orange-500 focus:outline-none transition-colors cursor-pointer"
                  />
                  {!startDate && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Click to select a date (must be in the future)
                    </p>
                  )}
                </div>

                {/* Date Preview */}
                {startDate && (
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm font-medium mb-1">4-day pact:</p>
                    <div className="flex gap-2 flex-wrap">
                      {[0, 1, 2, 3].map((offset) => {
                        const date = new Date(startDate);
                        date.setDate(date.getDate() + offset);
                        return (
                          <div
                            key={offset}
                            className="px-2 py-1 bg-orange-500/10 rounded text-xs font-medium text-orange-600 dark:text-orange-400"
                          >
                            {formatDateDisplay(date.toISOString().split("T")[0])}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!startDate || isCreating}
                  className="flex-1"
                >
                  {isCreating ? "Creating..." : "Create Pact"}
                </Button>
              </div>
            </>
          ) : (
            // Success with join code
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Pact Created!</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Share this code with friends to invite them
                </p>
              </div>

              {/* Join Code Display */}
              <div className="mb-6">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Join Code</p>
                  <p className="text-4xl font-black tracking-wider text-orange-600 dark:text-orange-400 mb-4">
                    {joinCode}
                  </p>
                  <Button onClick={copyJoinCode} variant="outline" className="w-full">
                    {copiedCode ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Code
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
