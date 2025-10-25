"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

interface Challenge {
  _id: Id<"accountabilityChallenges">;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  durationDays?: number;
  requiredPomosPerDay?: number;
  status: "pending" | "active" | "completed" | "failed";
}

interface EditChallengeModalProps {
  challenge: Challenge;
  onClose: () => void;
}

export function EditChallengeModal({ challenge, onClose }: EditChallengeModalProps) {
  const [name, setName] = useState(challenge.name);
  const [description, setDescription] = useState(challenge.description || "");
  const [startDate, setStartDate] = useState(challenge.startDate);
  const [durationDays, setDurationDays] = useState(challenge.durationDays || 7);
  const [minDailyPomos, setMinDailyPomos] = useState(challenge.requiredPomosPerDay || 1);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateChallenge = useMutation(api.accountabilityChallenges.updateAccountabilityChallenge);

  // Get tomorrow's date as minimum (in YYYY-MM-DD format)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  // Generate preview title
  const previewTitle =
    name ||
    `${durationDays} Day${durationDays !== 1 ? "s" : ""} · ${minDailyPomos} Pomo${minDailyPomos !== 1 ? "s" : ""} Daily`;

  const handleUpdate = async () => {
    if (!startDate) {
      alert("Please select a start date");
      return;
    }

    setIsUpdating(true);
    try {
      await updateChallenge({
        challengeId: challenge._id,
        name: name || undefined,
        description: description || undefined,
        startDate,
        durationDays,
        minDailyPomos,
      });

      alert("Pact updated successfully!");
      onClose();
      window.location.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      alert(`Failed to update pact: ${message}`);
      setIsUpdating(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
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
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-2xl font-bold mb-2">Edit Pact</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Update your pact settings before it starts
          </p>

          <div className="space-y-4 mb-6 max-h-[60vh] overflow-y-auto pr-1">
            {/* Pact Name */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Pact Name <span className="text-gray-500 dark:text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={previewTitle}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none transition-colors"
                maxLength={60}
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Description <span className="text-gray-500 dark:text-gray-400">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details about this pact..."
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none transition-colors resize-none"
                maxLength={250}
                rows={3}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {description.length}/250 characters
              </p>
            </div>

            {/* Duration and Pomos - Side by side */}
            <div className="grid grid-cols-2 gap-3">
              {/* Duration */}
              <div>
                <label className="text-sm font-medium mb-2 block">Duration (days)</label>
                <input
                  type="number"
                  value={durationDays}
                  onChange={(e) =>
                    setDurationDays(Math.max(2, Math.min(365, parseInt(e.target.value) || 2)))
                  }
                  min={2}
                  max={365}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-orange-500 focus:outline-none transition-colors"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">2-365 days</p>
              </div>

              {/* Min Daily Pomos */}
              <div>
                <label className="text-sm font-medium mb-2 block">Daily Minimum</label>
                <input
                  type="number"
                  value={minDailyPomos}
                  onChange={(e) =>
                    setMinDailyPomos(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))
                  }
                  min={1}
                  max={50}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-orange-500 focus:outline-none transition-colors"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">1-50 pomos</p>
              </div>
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
            </div>

            {/* Date Preview */}
            {startDate && (
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p className="text-sm font-medium mb-1">{previewTitle}</p>
                <div className="flex gap-2 flex-wrap max-h-20 overflow-y-auto">
                  {Array.from({ length: Math.min(durationDays, 30) }).map((_, offset) => {
                    const date = new Date(startDate);
                    date.setDate(date.getDate() + offset);
                    return (
                      <div
                        key={offset}
                        className="px-2 py-1 bg-orange-500/10 rounded text-xs font-medium text-orange-600 dark:text-orange-400 whitespace-nowrap"
                      >
                        {formatDateDisplay(date.toISOString().split("T")[0])}
                      </div>
                    );
                  })}
                  {durationDays > 30 && (
                    <div className="px-2 py-1 text-xs text-gray-500">
                      +{durationDays - 30} more days
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={!startDate || isUpdating} className="flex-1">
              {isUpdating ? "Updating..." : "Save Changes"}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
