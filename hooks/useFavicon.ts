/**
 * @fileoverview Custom hook for dynamic favicon that changes based on timer state
 * @module hooks/useFavicon
 *
 * Key responsibilities:
 * - Generate SVG-based favicons
 * - Update favicon when timer starts/stops (filled circle = running, outline = stopped)
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
    // Generate SVG-based favicon
    const generateFavicon = (color: string, isFilled: boolean) => {
      const svg = `
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="14" fill="none" stroke="${color}" stroke-width="3"/>
          ${isFilled ? `<circle cx="16" cy="16" r="8" fill="${color}"/>` : ""}
        </svg>
      `;
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

    // Set favicon based on timer state
    // Orange filled circle when running, gray outline when stopped
    const iconData = generateFavicon(isRunning ? "#f97316" : "#6b7280", isRunning);
    favicon.href = iconData;

    // Cleanup: reset to gray outline when component unmounts
    return () => {
      const resetIcon = generateFavicon("#6b7280", false);
      if (favicon) {
        favicon.href = resetIcon;
      }
    };
  }, [isRunning]);
}
