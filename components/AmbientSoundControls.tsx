/**
 * @fileoverview Ambient sound controls with 4 simultaneous sounds and vertical sliders
 */

"use client";

import { useEffect, useState } from "react";
import { useAmbientSoundContext } from "@/components/AmbientSoundProvider";
import { Slider } from "@/components/ui/slider";
import { CloudRain, CloudLightning, Waves, AudioWaveform } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { AMBIENT_SOUNDS, AmbientSoundId } from "@/lib/ambientSounds";

interface AmbientSoundControlsProps {
  className?: string;
}

// Map icon names to Lucide icon components
const iconMap: Record<string, LucideIcon> = {
  CloudRain,
  CloudLightning,
  Waves,
  AudioWaveform,
};

export function AmbientSoundControls({ className }: AmbientSoundControlsProps) {
  const [mounted, setMounted] = useState(false);
  const { volumes, toggleSound, setVolume } = useAmbientSoundContext();

  useEffect(() => {
    setMounted(true);
  }, []);

  const soundIds = Object.keys(AMBIENT_SOUNDS) as AmbientSoundId[];

  return (
    <div className={cn("rounded-lg border bg-card p-4", "grid grid-cols-4 gap-4", className)}>
      {soundIds.map((soundId) => {
        const sound = AMBIENT_SOUNDS[soundId];
        const IconComponent = iconMap[sound.icon];
        const volume = volumes[soundId];
        const isActive = volume > 0;

        return (
          <div key={soundId} className="flex flex-col items-center gap-2.5">
            {/* Icon Button */}
            <button
              onClick={() => toggleSound(soundId)}
              className={cn(
                "flex items-center justify-center transition-all duration-300",
                "hover:scale-110 active:scale-95",
                "focus-visible:outline-none focus:outline-none",
                "cursor-pointer"
              )}
              aria-label={`Toggle ${sound.name}`}
            >
              <IconComponent
                className={cn(
                  "w-8 h-8 transition-colors",
                  isActive ? "text-orange-500" : "text-gray-400"
                )}
              />
            </button>

            {/* Sound Name */}
            <span className="text-xs text-center text-muted-foreground font-medium whitespace-nowrap">
              {sound.name}
            </span>

            {/* Vertical Slider */}
            <div className="h-24 flex items-center justify-center py-2">
              <Slider
                value={[mounted ? volume * 100 : 0]}
                onValueChange={(value) => setVolume(soundId, value[0] / 100)}
                max={100}
                step={1}
                orientation="vertical"
                className="h-full"
                aria-label={`${sound.name} volume`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
