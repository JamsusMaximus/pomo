"use client";

import { useEffect } from "react";

/**
 * Service Worker Registration Component
 * Registers the service worker for PWA capabilities and push notifications
 */
export function ServiceWorkerRegistration() {
  // Removed unused state - keeping component minimal during emergency SW fix
  // const [updateAvailable, setUpdateAvailable] = useState(false);
  // const [newWorker, setNewWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // EMERGENCY FIX: Force update to new self-destruct service worker
    // Unregister all existing workers first
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      if (registrations.length > 0) {
        Promise.all(registrations.map((reg) => reg.unregister())).then(() => {
          // Register the new self-destruct worker with cache-busting timestamp
          const timestamp = Date.now();
          navigator.serviceWorker
            .register(`/sw.js?v=${timestamp}`, { updateViaCache: "none" })
            .then((registration) => {
              registration.update(); // Force immediate update check
            })
            .catch((err) => {
              console.error("[PWA] Failed to register self-destruct worker:", err);
            });
        });
      } else {
        // Register self-destruct worker with cache-busting
        const timestamp = Date.now();
        navigator.serviceWorker
          .register(`/sw.js?v=${timestamp}`, { updateViaCache: "none" })
          .then((registration) => {
            registration.update();
          })
          .catch((err) => {
            console.error("[PWA] Failed to register self-destruct worker:", err);
          });
      }
    });
  }, []);

  // Service worker update handling disabled during emergency fix
  // useEffect disabled - no new workers will be registered

  return null; // This component doesn't render anything
}
