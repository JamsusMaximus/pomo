/**
 * @fileoverview Ambient sound controls with play/pause and volume slider
 */

"use client";

import { useEffect, useState } from "react";
import { useAmbientSoundContext } from "@/components/AmbientSoundProvider";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Volume2, VolumeX, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface AmbientSoundControlsProps {
  className?: string;
}

export function AmbientSoundControls({ className }: AmbientSoundControlsProps) {
  const [mounted, setMounted] = useState(false);
  const { isPlaying, volume, activeSound, toggle, changeVolume, availableSounds } =
    useAmbientSoundContext();

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentSound = availableSounds.find((s) => s.id === activeSound);

  return (
    <div className={cn("flex items-center gap-3 rounded-lg border bg-card p-4", className)}>
      {/* Play/Pause Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={toggle}
        className="shrink-0 min-w-[44px] min-h-[44px]"
        aria-label={isPlaying ? "Pause ambient sound" : "Play ambient sound"}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>

      {/* Sound Info */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-lg" aria-hidden="true">
          {currentSound?.icon}
        </span>
        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
          {currentSound?.name}
        </span>
      </div>

      {/* Volume Slider */}
      <div className="flex items-center gap-2 flex-1 min-w-[120px]">
        <button
          onClick={() => changeVolume(0)}
          className="shrink-0 hover:opacity-70 transition-opacity cursor-pointer flex items-center justify-center min-w-[44px] min-h-[44px] -m-3"
          aria-label="Mute"
        >
          <VolumeX className="h-4 w-4 text-muted-foreground" />
        </button>
        <Slider
          value={[volume * 100]}
          onValueChange={(value) => changeVolume(value[0] / 100)}
          max={100}
          step={1}
          className="flex-1"
          aria-label="Ambient sound volume"
        />
        <button
          onClick={() => changeVolume(1)}
          className="shrink-0 hover:opacity-70 transition-opacity cursor-pointer flex items-center justify-center min-w-[44px] min-h-[44px] -m-3"
          aria-label="Maximum volume"
        >
          <Volume2 className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Volume Percentage */}
      <span className="text-xs text-muted-foreground tabular-nums w-8 text-right shrink-0">
        {mounted ? `${Math.round(volume * 100)}%` : "50%"}
      </span>
    </div>
  );
}
