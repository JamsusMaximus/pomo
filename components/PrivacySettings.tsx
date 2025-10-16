"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, Users, Lock, ChevronDown } from "lucide-react";

interface PrivacySettingsProps {
  currentPrivacy: "public" | "followers_only" | "private" | undefined;
}

const PRIVACY_OPTIONS = [
  {
    value: "public" as const,
    label: "Public",
    description: "Anyone can view your profile",
    icon: Globe,
  },
  {
    value: "followers_only" as const,
    label: "Followers Only",
    description: "Only people you accept can view",
    icon: Users,
  },
  {
    value: "private" as const,
    label: "Private",
    description: "Only you can view your profile",
    icon: Lock,
  },
];

export function PrivacySettings({ currentPrivacy }: PrivacySettingsProps) {
  const updatePrivacy = useMutation(api.users.updatePrivacy);
  const [isUpdating, setIsUpdating] = useState(false);

  const privacy = currentPrivacy || "followers_only";
  const currentOption = PRIVACY_OPTIONS.find((opt) => opt.value === privacy);

  const handlePrivacyChange = async (newPrivacy: "public" | "followers_only" | "private") => {
    setIsUpdating(true);
    try {
      await updatePrivacy({ privacy: newPrivacy });
    } catch (error) {
      console.error("Failed to update privacy:", error);
      alert("Failed to update privacy settings");
    } finally {
      setIsUpdating(false);
    }
  };

  const CurrentIcon = currentOption?.icon || Users;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isUpdating} className="min-h-[44px]">
          <CurrentIcon className="w-4 h-4 mr-2" />
          {currentOption?.label || "Followers Only"}
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-background/95 backdrop-blur-xl border-2">
        {PRIVACY_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isCurrent = option.value === privacy;

          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handlePrivacyChange(option.value)}
              className={`flex flex-col items-start gap-1 p-3 ${isCurrent ? "bg-muted" : ""}`}
            >
              <div className="flex items-center gap-2 w-full">
                <Icon className="w-4 h-4" />
                <span className="font-medium">{option.label}</span>
                {isCurrent && <span className="ml-auto text-xs text-orange-500">Current</span>}
              </div>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
