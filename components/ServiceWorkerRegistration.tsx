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

    // EMERGENCY FIX: Unregister ALL service workers and DO NOT re-register
    // This completely disables SW to fix production outage
    console.log("[PWA] EMERGENCY MODE: Unregistering all service workers");
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      if (registrations.length > 0) {
        console.log("[PWA] Found", registrations.length, "service worker(s) - unregistering all");
        Promise.all(registrations.map((reg) => reg.unregister())).then(() => {
          console.log("[PWA] ✅ All service workers unregistered successfully");
          console.log("[PWA] Service worker functionality DISABLED until further notice");
        });
      } else {
        console.log("[PWA] No service workers found - good!");
      }
    });

    // Service worker registration completely disabled for emergency fix
    // TODO: Re-enable once sw.js is fixed and tested
  }, []);

  // Service worker update handling disabled during emergency fix
  // useEffect disabled - no new workers will be registered

  return null; // This component doesn't render anything
}
