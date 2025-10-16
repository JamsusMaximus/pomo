import { useEffect } from "react";

/**
 * Custom hook to dynamically change the favicon
 * Generates emoji-based favicons using canvas
 */
export function useFavicon(isRunning: boolean) {
  useEffect(() => {
    // Generate favicon from emoji
    const generateFavicon = (emoji: string) => {
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext("2d");

      if (!ctx) return null;

      // Clear canvas
      ctx.clearRect(0, 0, 32, 32);

      // Draw emoji
      ctx.font = "24px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(emoji, 16, 16);

      return canvas.toDataURL("image/png");
    };

    // Get or create favicon link element
    let favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      document.head.appendChild(favicon);
    }

    // Set favicon based on timer state
    const iconData = generateFavicon(isRunning ? "🔒" : "🔓");
    if (iconData) {
      favicon.href = iconData;
    }

    // Cleanup: reset to open padlock when component unmounts
    return () => {
      const resetIcon = generateFavicon("🔓");
      if (resetIcon && favicon) {
        favicon.href = resetIcon;
      }
    };
  }, [isRunning]);
}
