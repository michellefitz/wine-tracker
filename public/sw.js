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
const PHOTOS = "cellar-photos-v2";
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

/**
 * Every step here is optional except the fetch.
 *
 * This handler owns the response for every photo in the app, so anything it
 * throws becomes a network error and the browser draws a broken image — even
 * though the server answered perfectly and the bytes were in hand. Cache
 * Storage throws for ordinary reasons: a full quota on iOS, eviction
 * mid-write, a private window. None of those are reasons to lose the picture.
 */
async function photoFromCache(request) {
  let cache = null;
  try {
    cache = await caches.open(PHOTOS);
    const hit = await cache.match(request);
    if (hit) return hit;
  } catch (error) {
    cache = null; // Read straight from the network instead.
  }

  const response = await fetch(request);

  // Only ever store an actual image. When the passcode session has expired the
  // request is redirected to the login page, and fetch follows that quietly —
  // caching the resulting HTML would leave a permanently broken picture.
  if (
    cache &&
    response.ok &&
    (response.headers.get("content-type") ?? "").startsWith("image/")
  ) {
    // Deliberately not awaited into the response path: a failed write costs
    // the caching, never the photo.
    const copy = response.clone();
    inBackground(async () => {
      await cache.put(request, copy);
      await trim(cache);
    });
  }

  return response;
}

/** Runs cache housekeeping without letting it reach the response. */
function inBackground(work) {
  work().catch(() => {});
}

/** Drops the oldest entries once the cache grows past its cap. */
async function trim(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_PHOTOS) return;
  await Promise.all(keys.slice(0, keys.length - MAX_PHOTOS).map((key) => cache.delete(key)));
}
