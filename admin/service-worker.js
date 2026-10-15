/* StudentHubHelp Admin PWA service worker.
   Cache only public app-shell assets; never cache authenticated/API responses. */
const CACHE_NAME = "studenthubhelp-admin-shell-v2";
const OFFLINE_URL = "/admin/index.html";
const STATIC_ASSETS = [
  OFFLINE_URL,
  "/admin/logo.png",
  "/admin/assets/index-6msJztRy.js",
  "/admin/assets/index-CqaV_UpX.css",
  "/icon-192x192.png",
  "/icon-512x512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const asset of STATIC_ASSETS) {
      try {
        const response = await fetch(asset);
        if (response.ok) await cache.put(asset, response);
      } catch (_) {
        // A missing optional asset must not block installation.
      }
    }
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

  // Never cache Supabase, auth, REST, functions, or GraphQL traffic.
  if (/supabase|\/auth\/|\/rest\/|\/functions\/|\/graphql/i.test(url.hostname + url.pathname)) return;

  if (request.mode === "navigate" && url.pathname.startsWith("/admin/")) {
    event.respondWith(fetch(request).catch(async () => {
      const cached = await caches.match(OFFLINE_URL);
      return cached || new Response(
        "<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>StudentHubHelp Admin offline</title><body><h1>You're offline</h1><p>Reconnect to use the secure admin dashboard.</p></body></html>",
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }));
    return;
  }

  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
  }
});
