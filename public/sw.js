/* Only public installation assets belong in this cache. Journal data stays online. */
const CACHE_PREFIX = "pill-happens-public-";
const CACHE_NAME = `${CACHE_PREFIX}v2`;
const OFFLINE_URL = "/offline.html";
const PUBLIC_FILES = [
  OFFLINE_URL,
  "/icons/app/icon-192.png",
  "/icons/app/icon-512.png",
  "/icons/app/icon-maskable-512.png",
  "/icons/app/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(
        PUBLIC_FILES.map(
          (path) =>
            new Request(new URL(path, self.location.origin), {
              credentials: "omit",
              cache: "reload",
            }),
        ),
      ),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// An open app explicitly accepts an update; a new worker never reloads a form.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    request.mode !== "navigate" ||
    url.origin !== self.location.origin ||
    url.pathname === "/api" ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  event.respondWith(
    fetch(request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      const offline = await cache.match(OFFLINE_URL);
      return (
        offline ??
        new Response("You’re offline. Reconnect and try again.", {
          status: 503,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
          },
        })
      );
    }),
  );
});
