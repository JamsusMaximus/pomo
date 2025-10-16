/**
 * @fileoverview Global ambient sound provider supporting multiple simultaneous sounds
 */

"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { AMBIENT_SOUNDS, AmbientSoundId, VOLUME_STORAGE_PREFIX } from "@/lib/ambientSounds";

const FADE_DURATION = 1500; // 1.5 second fade in/out

// Ease-in-out function for smooth animation
const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

interface AmbientSoundContextType {
  volumes: Record<AmbientSoundId, number>;
  isPlaying: Record<AmbientSoundId, boolean>;
  setVolume: (soundId: AmbientSoundId, volume: number) => void;
  toggleSound: (soundId: AmbientSoundId) => void;
  fadeAllToVolume: (targetVolume: number, duration: number, updateState?: boolean) => void;
  restoreVolumes: (savedVolumes: Record<AmbientSoundId, number>, duration: number) => void;
}

const AmbientSoundContext = createContext<AmbientSoundContextType | null>(null);

export function AmbientSoundProvider({ children }: { children: ReactNode }) {
  // Store audio elements and fade intervals in refs
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const fadeIntervalsRef = useRef<Record<string, NodeJS.Timeout | null>>({});

  // Initialize volumes - always start at 0 on page load
  const [volumes, setVolumes] = useState<Record<AmbientSoundId, number>>({
    rain: 0,
    thunder: 0,
    ocean: 0,
    whitenoise: 0,
  });

  // Track which sounds are playing
  const [isPlaying, setIsPlaying] = useState<Record<AmbientSoundId, boolean>>({
    rain: false,
    thunder: false,
    ocean: false,
    whitenoise: false,
  });

  // Initialize audio elements and clear localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Clear any saved volumes - always start fresh
    Object.keys(AMBIENT_SOUNDS).forEach((soundId) => {
      localStorage.removeItem(`${VOLUME_STORAGE_PREFIX}${soundId}`);
    });

    Object.entries(AMBIENT_SOUNDS).forEach(([soundId, sound]) => {
      if (!audioRefs.current[soundId]) {
        const audio = new Audio();
        audio.loop = true;
        audio.preload = "auto";
        audio.src = sound.file;
        audio.volume = 0; // Start at 0
        audioRefs.current[soundId] = audio;
      }
    });

    return () => {
      // Cleanup: stop all sounds and clear intervals
      Object.keys(audioRefs.current).forEach((soundId) => {
        if (fadeIntervalsRef.current[soundId]) {
          clearInterval(fadeIntervalsRef.current[soundId]!);
        }
        audioRefs.current[soundId]?.pause();
      });
    };
  }, []);

  // Fade helper function
  const fade = useCallback(
    (soundId: string, targetVolume: number, duration: number, onComplete?: () => void) => {
      const audio = audioRefs.current[soundId];
      if (!audio) return;

      if (fadeIntervalsRef.current[soundId]) {
        clearInterval(fadeIntervalsRef.current[soundId]!);
      }

      const startVolume = audio.volume;
      const volumeDiff = targetVolume - startVolume;
      const steps = 20;
      const stepDuration = duration / steps;
      const volumeStep = volumeDiff / steps;
      let currentStep = 0;

      fadeIntervalsRef.current[soundId] = setInterval(() => {
        currentStep++;
        if (currentStep >= steps) {
          audio.volume = targetVolume;
          if (fadeIntervalsRef.current[soundId]) {
            clearInterval(fadeIntervalsRef.current[soundId]!);
            fadeIntervalsRef.current[soundId] = null;
          }
          onComplete?.();
        } else {
          audio.volume = startVolume + volumeStep * currentStep;
        }
      }, stepDuration);
    },
    []
  );

  // Set volume for a specific sound (immediate, no fade - used by slider)
  const setVolume = useCallback(
    (soundId: AmbientSoundId, volume: number) => {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      const audio = audioRefs.current[soundId];

      setVolumes((prev) => ({
        ...prev,
        [soundId]: clampedVolume,
      }));

      localStorage.setItem(`${VOLUME_STORAGE_PREFIX}${soundId}`, clampedVolume.toString());

      if (audio) {
        if (clampedVolume === 0 && isPlaying[soundId]) {
          // Stop immediately (no fade for slider)
          audio.pause();
          audio.volume = 0;
          setIsPlaying((prev) => ({ ...prev, [soundId]: false }));
        } else if (clampedVolume > 0 && !isPlaying[soundId]) {
          // Start playing immediately at target volume (no fade for slider)
          audio.volume = clampedVolume;
          audio
            .play()
            .then(() => {
              setIsPlaying((prev) => ({ ...prev, [soundId]: true }));
            })
            .catch((error) => {
              console.error(`Failed to play ${soundId}:`, error);
            });
        } else if (isPlaying[soundId]) {
          // Just adjust volume immediately (no fade)
          audio.volume = clampedVolume;
        }
      }
    },
    [isPlaying]
  );

  // Toggle sound (icon click - goes to 100% with fade or 0% with fade)
  const toggleSound = useCallback(
    (soundId: AmbientSoundId) => {
      const currentVolume = volumes[soundId];
      const audio = audioRefs.current[soundId];

      if (!audio) return;

      if (currentVolume > 0) {
        // Turn off with fade - animate both audio and slider using RAF
        const startVolume = currentVolume;
        const startTime = performance.now();

        const animateFadeOut = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / FADE_DURATION, 1);
          const easedProgress = easeInOutCubic(progress);
          const newVolume = startVolume * (1 - easedProgress);

          audio.volume = newVolume;
          setVolumes((prev) => ({ ...prev, [soundId]: newVolume }));

          if (progress < 1) {
            requestAnimationFrame(animateFadeOut);
          } else {
            audio.pause();
            audio.volume = 0;
            setIsPlaying((prev) => ({ ...prev, [soundId]: false }));
            setVolumes((prev) => ({ ...prev, [soundId]: 0 }));
            localStorage.setItem(`${VOLUME_STORAGE_PREFIX}${soundId}`, "0");
          }
        };

        requestAnimationFrame(animateFadeOut);
      } else {
        // Turn on to 100% with fade - animate both audio and slider using RAF
        audio.volume = 0;
        audio
          .play()
          .then(() => {
            setIsPlaying((prev) => ({ ...prev, [soundId]: true }));

            const startTime = performance.now();

            const animateFadeIn = (currentTime: number) => {
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / FADE_DURATION, 1);
              const easedProgress = easeInOutCubic(progress);
              const newVolume = easedProgress;

              audio.volume = newVolume;
              setVolumes((prev) => ({ ...prev, [soundId]: newVolume }));

              if (progress < 1) {
                requestAnimationFrame(animateFadeIn);
              } else {
                setVolumes((prev) => ({ ...prev, [soundId]: 1 }));
                localStorage.setItem(`${VOLUME_STORAGE_PREFIX}${soundId}`, "1");
              }
            };

            requestAnimationFrame(animateFadeIn);
          })
          .catch((error) => {
            console.error(`Failed to play ${soundId}:`, error);
          });
      }
    },
    [volumes]
  );

  // Fade all currently playing sounds to a target volume
  const fadeAllToVolume = useCallback(
    (targetVolume: number, duration: number, updateState = false) => {
      Object.keys(AMBIENT_SOUNDS).forEach((soundId) => {
        const audio = audioRefs.current[soundId];
        if (!audio || !isPlaying[soundId as AmbientSoundId]) return;

        const startVolume = audio.volume;
        const startTime = performance.now();

        const animateFade = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easedProgress = easeInOutCubic(progress);
          const newVolume = startVolume + (targetVolume - startVolume) * easedProgress;

          audio.volume = Math.max(0, Math.min(1, newVolume));

          if (progress >= 1) {
            // Animation complete
            if (updateState) {
              // Update React state to match audio volume
              setVolumes((prev) => ({ ...prev, [soundId]: targetVolume }));
              localStorage.setItem(`${VOLUME_STORAGE_PREFIX}${soundId}`, targetVolume.toString());

              // If target is 0, stop playback and update isPlaying
              if (targetVolume === 0) {
                audio.pause();
                setIsPlaying((prev) => ({ ...prev, [soundId]: false }));
              }
            }
          } else {
            requestAnimationFrame(animateFade);
          }
        };

        requestAnimationFrame(animateFade);
      });
    },
    [isPlaying]
  );

  // Restore all sounds to their saved volumes
  const restoreVolumes = useCallback(
    (savedVolumes: Record<AmbientSoundId, number>, duration: number) => {
      Object.entries(savedVolumes).forEach(([soundId, targetVolume]) => {
        const audio = audioRefs.current[soundId];
        if (!audio || !isPlaying[soundId as AmbientSoundId]) return;

        const startVolume = audio.volume;
        const startTime = performance.now();

        const animateFade = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easedProgress = easeInOutCubic(progress);
          const newVolume = startVolume + (targetVolume - startVolume) * easedProgress;

          audio.volume = Math.max(0, Math.min(1, newVolume));

          if (progress < 1) {
            requestAnimationFrame(animateFade);
          }
        };

        requestAnimationFrame(animateFade);
      });
    },
    [isPlaying]
  );

  const value: AmbientSoundContextType = {
    volumes,
    isPlaying,
    setVolume,
    toggleSound,
    fadeAllToVolume,
    restoreVolumes,
  };

  return <AmbientSoundContext.Provider value={value}>{children}</AmbientSoundContext.Provider>;
}

export function useAmbientSoundContext() {
  const context = useContext(AmbientSoundContext);
  if (!context) {
    throw new Error("useAmbientSoundContext must be used within AmbientSoundProvider");
  }
  return context;
}
