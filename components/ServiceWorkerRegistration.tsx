"use client";

import { useEffect, useState } from "react";

/**
 * Service Worker Registration Component
 * Registers the service worker for PWA capabilities and push notifications
 */
export function ServiceWorkerRegistration() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newWorker, setNewWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      console.log("[PWA] Service workers not supported");
      return;
    }

    // Register service worker
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("[PWA] Service worker registered:", registration.scope);

        // Check for updates periodically (every hour)
        setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000
        );

        // Listen for updates
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;

          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              console.log("[PWA] New version available!");
              setNewWorker(worker);
              setUpdateAvailable(true);
            }
          });
        });
      })
      .catch((error) => {
        console.error("[PWA] Service worker registration failed:", error);
      });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data && event.data.type === "SW_UPDATED") {
        console.log("[PWA] Service worker updated to version:", event.data.version);
      }
    });

    // Listen for controller change (new service worker activated)
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      console.log("[PWA] Controller changed, reloading page");
      window.location.reload();
    });
  }, []);

  // Show update notification when available
  useEffect(() => {
    if (updateAvailable && newWorker) {
      // Auto-activate the new service worker after a short delay
      // This ensures users get the latest version without manual intervention
      const timer = setTimeout(() => {
        console.log("[PWA] Activating new service worker...");
        newWorker.postMessage({ type: "SKIP_WAITING" });
      }, 3000); // 3 second delay to let current operations complete

      return () => clearTimeout(timer);
    }
  }, [updateAvailable, newWorker]);

  return null; // This component doesn't render anything
}
