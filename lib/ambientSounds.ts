/**
 * @fileoverview Ambient sound registry and configuration
 */

export type AmbientSoundId = keyof typeof AMBIENT_SOUNDS;

export interface AmbientSound {
  id: AmbientSoundId;
  name: string;
  file: string;
  icon?: string;
}

export const AMBIENT_SOUNDS = {
  rain: {
    id: "rain" as const,
    name: "Light Rain",
    file: "/audio/ambient/rain.mp3",
    icon: "🌧️",
  },
  // Future sounds can be added here:
  // ocean: {
  //   id: "ocean" as const,
  //   name: "Ocean Waves",
  //   file: "/audio/ambient/ocean.mp3",
  //   icon: "🌊",
  // },
} as const;

export const DEFAULT_VOLUME = 0.5;
export const AMBIENT_VOLUME_KEY = "pomo_ambient_volume";
export const AMBIENT_SOUND_KEY = "pomo_ambient_sound";
export const AMBIENT_ENABLED_KEY = "pomo_ambient_enabled";
