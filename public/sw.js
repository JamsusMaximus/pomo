/**
 * EMERGENCY SERVICE WORKER - SELF DESTRUCT MODE
 * This service worker immediately unregisters itself and clears all caches
 * to fix production outage caused by broken fetch handler
 */

console.log("[SW EMERGENCY] Self-destruct service worker loaded");

// Install: Immediately skip waiting and activate
self.addEventListener("install", (_event) => {
  console.log("[SW EMERGENCY] Installing self-destruct worker");
  self.skipWaiting();
});

// Activate: Unregister self and clear all caches
self.addEventListener("activate", (event) => {
  console.log("[SW EMERGENCY] Activating - will self-destruct");

  event.waitUntil(
    Promise.all([
      // Clear all caches
      caches.keys().then((cacheNames) => {
        console.log("[SW EMERGENCY] Deleting", cacheNames.length, "caches");
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log("[SW EMERGENCY] Deleting cache:", cacheName);
            return caches.delete(cacheName);
          })
        );
      }),
      // Claim all clients so we take over immediately
      self.clients.claim(),
    ]).then(() => {
      console.log("[SW EMERGENCY] Caches cleared, now unregistering self");

      // Unregister this service worker
      self.registration.unregister().then(() => {
        console.log("[SW EMERGENCY] ✅ Successfully unregistered");

        // Tell all clients to reload
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            console.log("[SW EMERGENCY] Telling client to reload");
            client.postMessage({ type: "SW_UNREGISTERED", message: "Reload required" });
          });
        });
      });
    })
  );
});

// DO NOT INTERCEPT FETCHES - let them go through normally
// This is critical - we must not block any requests
self.addEventListener("fetch", (_event) => {
  // Do nothing - let requests pass through to network
  return;
});
