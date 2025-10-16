/**
 * @fileoverview Custom hook for dynamic favicon that changes based on timer state
 * @module hooks/useFavicon
 *
 * Key responsibilities:
 * - Generate SVG padlock favicons (not emojis, actual icon graphics)
 * - Update favicon when timer starts/stops (locked = running, unlocked = stopped)
 * - Restore default favicon on unmount
 *
 * Dependencies: React hooks
 * Used by: app/page.tsx
 */

import { useEffect } from "react";

/**
 * Custom hook to dynamically change the favicon based on timer state
 *
 * @param isRunning - Whether the timer is currently running
 *
 * @example
 * ```tsx
 * const { isRunning } = useTimer({ ... });
 * useFavicon(isRunning);
 * ```
 */
export function useFavicon(isRunning: boolean) {
  useEffect(() => {
    // Generate SVG padlock favicon
    const generateFavicon = (isLocked: boolean) => {
      const color = isLocked ? "#f97316" : "#6b7280"; // Orange when locked, gray when unlocked

      const svg = isLocked
        ? // Locked padlock
          `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <rect x="9" y="14" width="14" height="12" rx="2" fill="${color}"/>
            <path d="M 12 14 L 12 10 C 12 7.8 13.8 6 16 6 C 18.2 6 20 7.8 20 10 L 20 14" stroke="${color}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
            <circle cx="16" cy="20" r="2" fill="white"/>
          </svg>`
        : // Unlocked padlock (shackle open)
          `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <rect x="9" y="14" width="14" height="12" rx="2" fill="${color}"/>
            <path d="M 12 14 L 12 10 C 12 7.8 13.8 6 16 6 C 18.2 6 20 7.8 20 10 L 20 12" stroke="${color}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
            <circle cx="16" cy="20" r="2" fill="white"/>
          </svg>`;

      return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    };

    // Remove all existing favicon links to avoid conflicts
    const existingIcons = document.querySelectorAll("link[rel*='icon']");
    existingIcons.forEach((icon) => icon.remove());

    // Create new favicon link element
    const favicon = document.createElement("link");
    favicon.rel = "icon";
    favicon.type = "image/svg+xml";
    document.head.appendChild(favicon);

    // Set favicon: locked when running, unlocked when stopped
    const iconData = generateFavicon(isRunning);
    favicon.href = iconData;

    // Cleanup: reset to unlocked when component unmounts
    return () => {
      const resetIcon = generateFavicon(false);
      if (favicon) {
        favicon.href = resetIcon;
      }
    };
  }, [isRunning]);
}
