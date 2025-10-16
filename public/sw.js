/**
 * Service Worker for Lock.in PWA
 * Handles push notifications and offline functionality
 */

// IMPORTANT: Increment this version whenever you deploy changes
// This forces users to get the latest app version
const VERSION = "v1.0.1";
const CACHE_NAME = `lockin-${VERSION}`;
const urlsToCache = ["/", "/site.webmanifest"];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log(`[Service Worker] Installing ${VERSION}...`);
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[Service Worker] Caching app shell");
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log("[Service Worker] Skip waiting to activate immediately");
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log(`[Service Worker] Activating ${VERSION}...`);
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("[Service Worker] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("[Service Worker] Claiming clients");
        return self.clients.claim();
      })
      .then(() => {
        // Notify all clients about the update
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: "SW_UPDATED",
              version: VERSION,
            });
          });
        });
      })
  );
});

// Push event - handle push notifications
self.addEventListener("push", (event) => {
  console.log("[Service Worker] Push received:", event);

  if (!event.data) {
    console.log("[Service Worker] Push event but no data");
    return;
  }

  let notification;
  try {
    notification = event.data.json();
  } catch (e) {
    notification = {
      title: "Lock.in",
      body: event.data.text(),
    };
  }

  const options = {
    body: notification.body || notification.message || "New notification",
    icon: notification.icon || "/icon-192.png",
    badge: notification.badge || "/icon-192.png",
    tag: notification.tag || "lockin-notification",
    requireInteraction: notification.requireInteraction || false,
    data: notification.data || {},
    actions: notification.actions || [],
    vibrate: notification.vibrate || [200, 100, 200],
    timestamp: Date.now(),
  };

  event.waitUntil(self.registration.showNotification(notification.title || "Lock.in", options));
});

// Notification click event - handle notification actions
self.addEventListener("notificationclick", (event) => {
  console.log("[Service Worker] Notification click:", event);

  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  let url = "/";

  // Handle different actions
  if (action === "start-break") {
    url = "/?action=start-break";
  } else if (action === "start-next") {
    url = "/?action=start-next&autostart=true";
  } else if (action === "view-profile") {
    url = "/profile";
  } else if (data && data.url) {
    url = data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Background sync event (for future offline support)
self.addEventListener("sync", (event) => {
  console.log("[Service Worker] Background sync:", event.tag);

  if (event.tag === "sync-pomodoros") {
    event.waitUntil(
      // Future: sync offline pomodoros
      Promise.resolve()
    );
  }
});

// Message event - handle messages from clients
self.addEventListener("message", (event) => {
  console.log("[Service Worker] Message received:", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Fetch event - network-first strategy for API calls
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Skip Convex and Clerk requests (always fresh)
  if (event.request.url.includes("convex.cloud") || event.request.url.includes("clerk.")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache successful responses (not partial content or errors)
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }

        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(event.request);
      })
  );
});
