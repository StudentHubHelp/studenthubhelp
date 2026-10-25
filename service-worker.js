/* StudentHubHelp PWA service worker.
   Offline shell caching is limited to the public homepage and existing logo.
   Supabase/API/auth data is never cached.
   Background/periodic sync refresh only the public shell.
   Push events display notifications when a configured push service sends them. */
const CACHE_NAME = "studenthubhelp-static-v4";
const OFFLINE_URL = "/index.html";
const STATIC_ASSETS = [OFFLINE_URL, "/logo.png", "/hostel-banner.png", "/tiffin-banner.png", "/cafe-banner.png", "/library-banner.png", "/bookstore-banner.png"];
const SYNC_TAG = "studenthubhelp-refresh-shell";

async function refreshPublicShell() {
  const cache = await caches.open(CACHE_NAME);
  for (const asset of STATIC_ASSETS) {
    try {
      const response = await fetch(asset, { cache: "no-cache" });
      if (response.ok && response.type === "basic") {
        await cache.put(asset, response);
      }
    } catch (_) {
      // Keep the last cached copy when the network is unavailable.
    }
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        // Cache individually so a missing optional asset does not break worker install.
        for (const asset of STATIC_ASSETS) {
          try {
            const response = await fetch(asset);
            if (response.ok) await cache.put(asset, response);
          } catch (_) {}
        }
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith("studenthubhelp-static-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Never cache Supabase, authentication, functions, or API responses.
  if (url.pathname.startsWith("/rest/") || url.pathname.startsWith("/auth/") ||
      url.pathname.startsWith("/functions/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(OFFLINE_URL, copy));
        }
        return response;
      }).catch(async () => {
        const cached = await caches.match(OFFLINE_URL);
        return cached || new Response(
          "<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>StudentHubHelp offline</title><body><h1>You're offline</h1><p>Reconnect to the internet to load live listings and account features.</p></body></html>",
          { headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      })
    );
    return;
  }

  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }
});

// Background Sync: refresh the public shell when the browser schedules this tag.
self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) event.waitUntil(refreshPublicShell());
});

// Periodic Background Sync: browser/permission dependent; refresh only public assets.
self.addEventListener("periodicsync", (event) => {
  if (event.tag === SYNC_TAG) event.waitUntil(refreshPublicShell());
});

// Push: receives notifications from a configured push server/subscription.
self.addEventListener("push", (event) => {
  let data = { title: "StudentHubHelp", body: "You have a new update.", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) {
    if (event.data) data.body = event.data.text();
  }
  const target = typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/";
  event.waitUntil(
    self.registration.showNotification(data.title || "StudentHubHelp", {
      body: data.body || "You have a new update.",
      icon: "/logo.png",
      badge: "/logo.png",
      data: { url: target }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data && event.notification.data.url
    ? event.notification.data.url : "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (new URL(client.url).origin === self.location.origin) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
