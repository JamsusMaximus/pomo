/**
 * @fileoverview Global ambient sound provider that persists across page navigation
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
import {
  AMBIENT_SOUNDS,
  AmbientSoundId,
  DEFAULT_VOLUME,
  AMBIENT_VOLUME_KEY,
  AMBIENT_SOUND_KEY,
  AMBIENT_ENABLED_KEY,
} from "@/lib/ambientSounds";

const FADE_DURATION = 1000; // 1 second fade in/out

interface AmbientSoundContextType {
  isPlaying: boolean;
  volume: number;
  activeSound: AmbientSoundId;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  changeVolume: (newVolume: number) => void;
  changeSound: (soundId: AmbientSoundId) => void;
  availableSounds: (typeof AMBIENT_SOUNDS)[keyof typeof AMBIENT_SOUNDS][];
}

const AmbientSoundContext = createContext<AmbientSoundContextType | null>(null);

export function AmbientSoundProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load persisted state
  const [volume, setVolume] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_VOLUME;
    const saved = localStorage.getItem(AMBIENT_VOLUME_KEY);
    return saved ? parseFloat(saved) : DEFAULT_VOLUME;
  });

  const [activeSound, setActiveSound] = useState<AmbientSoundId>(() => {
    if (typeof window === "undefined") return "rain";
    const saved = localStorage.getItem(AMBIENT_SOUND_KEY);
    return (saved as AmbientSoundId) || "rain";
  });

  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem(AMBIENT_ENABLED_KEY);
    return saved === "true";
  });

  const [isPlaying, setIsPlaying] = useState(false);

  // Initialize audio element
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!audioRef.current) {
      const audio = new Audio();
      audio.loop = true;
      audio.preload = "auto";
      audioRef.current = audio;
    }

    const audio = audioRef.current;
    audio.src = AMBIENT_SOUNDS[activeSound].file;
    audio.volume = 0; // Start at 0 for fade in

    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
      // Don't pause on cleanup - let it continue playing
    };
  }, [activeSound]);

  // Fade helper function
  const fade = useCallback((targetVolume: number, duration: number, onComplete?: () => void) => {
    if (!audioRef.current) return;

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    const audio = audioRef.current;
    const startVolume = audio.volume;
    const volumeDiff = targetVolume - startVolume;
    const steps = 20;
    const stepDuration = duration / steps;
    const volumeStep = volumeDiff / steps;
    let currentStep = 0;

    fadeIntervalRef.current = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        audio.volume = targetVolume;
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        onComplete?.();
      } else {
        audio.volume = startVolume + volumeStep * currentStep;
      }
    }, stepDuration);
  }, []);

  // Play with fade in
  const play = useCallback(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    audio.volume = 0;

    audio
      .play()
      .then(() => {
        setIsPlaying(true);
        fade(volume, FADE_DURATION);
      })
      .catch((error) => {
        console.error("Failed to play ambient sound:", error);
      });
  }, [volume, fade]);

  // Pause with fade out
  const pause = useCallback(() => {
    if (!audioRef.current) return;

    fade(0, FADE_DURATION, () => {
      audioRef.current?.pause();
      setIsPlaying(false);
    });
  }, [fade]);

  // Toggle play/pause
  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
      setIsEnabled(false);
    } else {
      play();
      setIsEnabled(true);
    }
  }, [isPlaying, play, pause]);

  // Change volume
  const changeVolume = useCallback(
    (newVolume: number) => {
      const clampedVolume = Math.max(0, Math.min(1, newVolume));
      setVolume(clampedVolume);

      if (audioRef.current && isPlaying) {
        audioRef.current.volume = clampedVolume;
      }

      localStorage.setItem(AMBIENT_VOLUME_KEY, clampedVolume.toString());
    },
    [isPlaying]
  );

  // Change sound
  const changeSound = useCallback(
    (soundId: AmbientSoundId) => {
      const wasPlaying = isPlaying;

      if (wasPlaying) {
        pause();
      }

      setActiveSound(soundId);
      localStorage.setItem(AMBIENT_SOUND_KEY, soundId);

      if (wasPlaying) {
        // Small delay to let the audio source change
        setTimeout(() => play(), 100);
      }
    },
    [isPlaying, pause, play]
  );

  // Persist enabled state
  useEffect(() => {
    localStorage.setItem(AMBIENT_ENABLED_KEY, isEnabled.toString());
  }, [isEnabled]);

  // Auto-play if enabled on mount
  useEffect(() => {
    if (isEnabled && !isPlaying && audioRef.current) {
      play();
    }
  }, []); // Only run on mount

  const value: AmbientSoundContextType = {
    isPlaying,
    volume,
    activeSound,
    play,
    pause,
    toggle,
    changeVolume,
    changeSound,
    availableSounds: Object.values(AMBIENT_SOUNDS),
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
