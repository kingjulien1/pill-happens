/* Only public installation assets belong in this cache. Journal data stays online. */
const CACHE_PREFIX = "pill-happens-public-";
const CACHE_NAME = `${CACHE_PREFIX}v135`;
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

// Shared report bytes stay in a separate short-lived inbox, never the public cache.
// Keep this record contract aligned with src/lib/shared-sleep-image.ts.
const SLEEP_IMAGE_DB = "pill-happens-sleep-image-inbox-v1";
const SLEEP_IMAGE_STORE = "images";
const SLEEP_IMAGE_LIMIT = 20 * 1024 * 1024;
const SLEEP_IMAGE_TTL = 30 * 60 * 1000;

async function storeSharedSleepImage(file, id) {
  if (typeof indexedDB === "undefined")
    throw new Error("Local image storage unavailable");
  const database = await new Promise((resolve, reject) => {
    let settled = false;
    const opening = indexedDB.open(SLEEP_IMAGE_DB, 1);
    opening.onupgradeneeded = () =>
      opening.result.createObjectStore(SLEEP_IMAGE_STORE, { keyPath: "id" });
    opening.onsuccess = () => {
      if (settled) {
        opening.result.close();
        return;
      }
      settled = true;
      resolve(opening.result);
    };
    opening.onerror = opening.onblocked = () => {
      if (settled) return;
      settled = true;
      reject(new Error("Local image storage unavailable"));
    };
  });
  try {
    await new Promise((resolve, reject) => {
      const tx = database.transaction(SLEEP_IMAGE_STORE, "readwrite");
      const store = tx.objectStore(SLEEP_IMAGE_STORE);
      const existing = store.getAll();
      const now = Date.now();
      existing.onsuccess = () => {
        const live = existing.result
          .filter((record) => {
            const valid =
              Number.isFinite(record.receivedAt) &&
              record.receivedAt <= now &&
              now - record.receivedAt < SLEEP_IMAGE_TTL;
            if (!valid) store.delete(record.id);
            return valid;
          })
          .sort((a, b) => b.receivedAt - a.receivedAt);
        // At most three reports (60 MB total), including the incoming one.
        for (const record of live.slice(2)) store.delete(record.id);
        store.put({
          id,
          blob: file,
          name: file.name.slice(0, 200),
          receivedAt: now,
        });
      };
      tx.oncomplete = resolve;
      tx.onerror = tx.onabort = () =>
        reject(new Error("Could not keep shared image"));
    });
  } finally {
    database.close();
  }
}

async function receiveSleepImage(request) {
  const destination = new URL("/sleep-import", self.location.origin);
  try {
    const length = Number(request.headers.get("content-length"));
    if (
      !/^multipart\/form-data(?:;|$)/i.test(
        request.headers.get("content-type") ?? "",
      ) ||
      (Number.isFinite(length) && length > SLEEP_IMAGE_LIMIT + 65536)
    ) {
      destination.searchParams.set("error", "invalid");
      return Response.redirect(destination, 303);
    }
    const form = await request.formData();
    const files = form.getAll("sleep-report");
    const file = files[0];
    if (
      files.length !== 1 ||
      !(file instanceof Blob) ||
      !/^image\/(?:png|jpeg|webp|gif|avif|heic|heif|bmp)$/i.test(file.type) ||
      file.size <= 0 ||
      file.size > SLEEP_IMAGE_LIMIT ||
      typeof file.name !== "string"
    ) {
      destination.searchParams.set("error", "invalid");
      return Response.redirect(destination, 303);
    }
    const id = crypto.randomUUID();
    await storeSharedSleepImage(file, id);
    destination.searchParams.set("token", id);
  } catch {
    destination.searchParams.set("error", "unavailable");
  }
  return Response.redirect(destination, 303);
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method === "POST" &&
    request.mode === "navigate" &&
    url.origin === self.location.origin &&
    url.pathname === "/share-sleep-report"
  ) {
    event.respondWith(receiveSleepImage(request));
    return;
  }
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
