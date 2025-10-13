"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check } from "lucide-react";

interface ShareProfileButtonProps {
  username: string;
}

export function ShareProfileButton({ username }: ShareProfileButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/profile/${username}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy URL:", error);
      alert("Failed to copy URL to clipboard");
    }
  };

  return (
    <Button onClick={handleShare} variant="outline" size="sm">
      {copied ? (
        <>
          <Check className="w-4 h-4 mr-2 text-green-500" />
          Copied!
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4 mr-2" />
          Share Profile
        </>
      )}
    </Button>
  );
}
