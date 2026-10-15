/* StudentHubHelp Admin PWA service worker.
   Only cache the public admin shell. Never cache authenticated/API responses.
   Background/periodic sync refresh only shell assets. Push display requires a configured
   push subscription and server-side VAPID sender. */
const CACHE_NAME = "studenthubhelp-admin-shell-v4";
const OFFLINE_URL = "/admin/index.html";
const SYNC_TAG = "studenthubhelp-admin-refresh-shell";
const STATIC_ASSETS = [
  OFFLINE_URL,
  "/admin/icons/icon-192x192.png",
  "/admin/icons/icon-512x512.png",
  "/admin/assets/index-6msJztRy.js",
  "/admin/assets/index-CqaV_UpX.css"
];

async function refreshAdminShell() {
  const cache = await caches.open(CACHE_NAME);
  for (const asset of STATIC_ASSETS) {
    try {
      const response = await fetch(asset, { cache: "no-cache" });
      if (response.ok && response.type === "basic") await cache.put(asset, response);
    } catch (_) {
      // Keep the last cached public shell copy when offline.
    }
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    await refreshAdminShell();
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith("studenthubhelp-admin-shell-") && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  // Never cache Supabase, authentication, REST, functions, or GraphQL traffic.
  if (/supabase|\/auth\/|\/rest\/|\/functions\/|\/graphql/i.test(url.hostname + url.pathname)) return;

  if (request.mode === "navigate" && url.pathname.startsWith("/admin/")) {
    event.respondWith(fetch(request).catch(async () => {
      const cached = await caches.match(OFFLINE_URL);
      return cached || new Response(
        "<!doctype html><html lang=\\"en\\"><meta charset=\\"utf-8\\"><meta name=\\"viewport\\" content=\\"width=device-width,initial-scale=1\\"><title>StudentHubHelp Admin offline</title><body><h1>You're offline</h1><p>Reconnect to use the secure admin dashboard.</p></body></html>",
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }));
    return;
  }
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
  }
});

// Background Sync: browser schedules this after connectivity returns.
self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) event.waitUntil(refreshAdminShell());
});

// Periodic Background Sync: browser, device, and permission dependent.
self.addEventListener("periodicsync", (event) => {
  if (event.tag === SYNC_TAG) event.waitUntil(refreshAdminShell());
});

// Push display is ready for a configured push sender/subscription; no sender is implied here.
self.addEventListener("push", (event) => {
  let data = { title: "StudentHubHelp Admin", body: "You have a new admin update.", url: "/admin/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) {
    if (event.data) data.body = event.data.text();
  }
  const target = typeof data.url === "string" && data.url.startsWith("/admin/") ? data.url : "/admin/";
  event.waitUntil(self.registration.showNotification(data.title || "StudentHubHelp Admin", {
    body: data.body || "You have a new admin update.",
    icon: "/admin/icons/icon-192x192.png",
    badge: "/admin/icons/icon-192x192.png",
    data: { url: target }
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data && typeof event.notification.data.url === "string" &&
    event.notification.data.url.startsWith("/admin/") ? event.notification.data.url : "/admin/";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      if (new URL(client.url).origin === self.location.origin && new URL(client.url).pathname.startsWith("/admin/")) {
        client.navigate(target);
        return client.focus();
      }
    }
    return self.clients.openWindow(target);
  }));
});
