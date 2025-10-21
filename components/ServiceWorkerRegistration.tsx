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
      console.log("[PWA] Service workers not supported");
      return;
    }

    // EMERGENCY FIX: Force update to new self-destruct service worker
    console.log("[PWA] EMERGENCY MODE: Forcing service worker update");

    // Unregister all existing workers first
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      if (registrations.length > 0) {
        console.log("[PWA] Unregistering", registrations.length, "old service worker(s)");
        Promise.all(registrations.map((reg) => reg.unregister())).then(() => {
          console.log("[PWA] Old workers unregistered, registering self-destruct version");

          // Register the new self-destruct worker with cache-busting timestamp
          const timestamp = Date.now();
          navigator.serviceWorker
            .register(`/sw.js?v=${timestamp}`, { updateViaCache: "none" })
            .then((registration) => {
              console.log("[PWA] Self-destruct worker registered, forcing update");
              registration.update(); // Force immediate update check
            })
            .catch((err) => {
              console.error("[PWA] Failed to register self-destruct worker:", err);
            });
        });
      } else {
        console.log("[PWA] No existing workers, registering self-destruct version");
        // Register self-destruct worker with cache-busting
        const timestamp = Date.now();
        navigator.serviceWorker
          .register(`/sw.js?v=${timestamp}`, { updateViaCache: "none" })
          .then((registration) => {
            console.log("[PWA] Self-destruct worker registered");
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
