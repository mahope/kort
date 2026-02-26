const CACHE_NAME = "topoprint-v1";
const TILE_CACHE = "topoprint-tiles-v1";
const MAX_TILE_ENTRIES = 500;

const APP_SHELL = ["/", "/offline.html"];

// Install: pre-cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== TILE_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch strategies
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Map tiles: stale-while-revalidate
  if (
    url.hostname === "api.dataforsyningen.dk" ||
    url.hostname === "tile.openstreetmap.org" ||
    url.hostname === "cdn.dataforsyningen.dk"
  ) {
    event.respondWith(tileStrategy(event.request));
    return;
  }

  // DAWA API: network-first with short cache
  if (url.hostname === "api.dataforsyningen.dk" || url.hostname === "dawa.aws.dk") {
    event.respondWith(networkFirst(event.request, 5 * 60));
    return;
  }

  // App navigation: network-first with cache fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match("/offline.html").then((r) => r || caches.match("/"))
      )
    );
    return;
  }

  // JS/CSS assets: cache-first (hashed filenames)
  if (
    url.pathname.match(/\/_next\/static\//) ||
    url.pathname.match(/\.(?:js|css|woff2?)$/)
  ) {
    event.respondWith(cacheFirst(event.request));
    return;
  }
});

async function tileStrategy(request) {
  const cache = await caches.open(TILE_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
        trimCache(cache, MAX_TILE_ENTRIES);
      }
      return response;
    })
    .catch(() => null);

  return cached || (await fetchPromise) || new Response("Tile unavailable", { status: 503 });
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, maxAgeSec) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response("Offline", { status: 503 });
  }
}

async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    // Delete oldest entries
    const toDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}
