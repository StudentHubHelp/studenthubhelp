/* StudentHubHelp PWA service worker.
   HTML/API requests remain network-first; dynamic listings and private data are not cached. */
const CACHE_NAME = "studenthubhelp-static-v1";
const STATIC_ASSETS = ["/logo.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Never cache HTML documents, Supabase data, authentication, or API responses.
  if (request.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.startsWith("/rest/")) return;

  // Cache only the explicitly allow-listed static logo; other requests pass through normally.
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }
});
