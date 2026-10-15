/* StudentHubHelp PWA service worker.
   Cache only the public homepage and logo for a basic offline shell.
   Supabase/API/auth responses and dynamic listing data are never cached. */
const CACHE_NAME = "studenthubhelp-static-v2";
const OFFLINE_URL = "/index.html";
const STATIC_ASSETS = [OFFLINE_URL, "/logo.png"];

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

  // Do not intercept API/auth or Supabase requests.
  if (url.pathname.startsWith("/rest/") || url.pathname.startsWith("/auth/") ||
      url.pathname.startsWith("/functions/")) return;

  // Navigation: network-first, then cached homepage when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(OFFLINE_URL);
        return cached || new Response(
          "<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>StudentHubHelp offline</title><body><h1>You're offline</h1><p>Reconnect to the internet to load live listings and account features.</p></body></html>",
          { headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      })
    );
    return;
  }

  // Cache only the explicitly allow-listed public static assets.
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }
});
