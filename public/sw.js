/**
 * EMERGENCY SERVICE WORKER - SELF DESTRUCT MODE
 * This service worker immediately unregisters itself and clears all caches
 * to fix production outage caused by broken fetch handler
 */

// Install: Immediately skip waiting and activate
self.addEventListener("install", () => {
  self.skipWaiting();
});

// Activate: Unregister self and clear all caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      // Clear all caches
      caches.keys().then((cacheNames) => {
        return Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      }),
      // Claim all clients so we take over immediately
      self.clients.claim(),
    ]).then(() => {
      // Unregister this service worker
      self.registration.unregister().then(() => {
        // Tell all clients to reload
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: "SW_UNREGISTERED", message: "Reload required" });
          });
        });
      });
    })
  );
});

// DO NOT INTERCEPT FETCHES - let them go through normally
// This is critical - we must not block any requests
self.addEventListener("fetch", () => {
  // Do nothing - let requests pass through to network
  return;
});
