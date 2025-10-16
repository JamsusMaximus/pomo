/**
 * @fileoverview Ambient sound registry and configuration
 */

export type AmbientSoundId = keyof typeof AMBIENT_SOUNDS;

export interface AmbientSound {
  id: AmbientSoundId;
  name: string;
  file: string;
  icon: string; // Lucide icon name
}

export const AMBIENT_SOUNDS = {
  rain: {
    id: "rain" as const,
    name: "Light Rain",
    file: "/audio/ambient/rain.mp3",
    icon: "CloudRain",
  },
  thunder: {
    id: "thunder" as const,
    name: "Thunder",
    file: "/audio/ambient/thunder.mp3",
    icon: "CloudLightning",
  },
  ocean: {
    id: "ocean" as const,
    name: "Ocean Waves",
    file: "/audio/ambient/waves.mp3",
    icon: "Waves",
  },
  whitenoise: {
    id: "whitenoise" as const,
    name: "White Noise",
    file: "/audio/ambient/whitenoise.mp3",
    icon: "AudioWaveform",
  },
} as const;

// Storage keys for individual sound volumes
export const VOLUME_STORAGE_PREFIX = "pomo_ambient_volume_";
