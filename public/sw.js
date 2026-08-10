/**
 * Minimal service worker. It makes the app installable, shows something other
 * than the browser's offline page when there's no signal, and keeps label
 * photos so the log doesn't repaint from scratch every time you open it.
 *
 * Wine data is deliberately never cached — a stale log would be worse than an
 * error, since the whole point is trusting what it says while you're in a shop.
 * Photos are the exception, and a safe one: a photo is written once under an
 * ID that never points at anything else, so a cached copy can't go stale.
 */

const CACHE = "cellar-shell-v1";
const PHOTOS = "cellar-photos-v1";
const KEEP = [CACHE, PHOTOS];
const OFFLINE_URL = "/offline.html";

/** Roughly a few hundred label photos — far more than the log will hold. */
const MAX_PHOTOS = 200;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_URL])),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !KEEP.includes(key)).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/photos/")) {
    event.respondWith(photoFromCache(request));
    return;
  }

  if (request.mode !== "navigate") return;

  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(OFFLINE_URL);
      return cached ?? Response.error();
    }),
  );
});

async function photoFromCache(request) {
  const cache = await caches.open(PHOTOS);

  const hit = await cache.match(request);
  if (hit) return hit;

  const response = await fetch(request);

  // Only ever store an actual image. When the passcode session has expired the
  // request is redirected to the login page, and fetch follows that quietly —
  // caching the resulting HTML would leave a permanently broken picture.
  if (response.ok && (response.headers.get("content-type") ?? "").startsWith("image/")) {
    await cache.put(request, response.clone());
    await trim(cache);
  }

  return response;
}

/** Drops the oldest entries once the cache grows past its cap. */
async function trim(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_PHOTOS) return;
  await Promise.all(keys.slice(0, keys.length - MAX_PHOTOS).map((key) => cache.delete(key)));
}
