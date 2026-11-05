// Bump these on any caching-logic change so activate() purges stale caches —
// e.g. address-search responses that the previous version wrongly stored as tiles.
const CACHE_NAME = "topoprint-v3";
const TILE_CACHE = "topoprint-tiles-v3";
// One A4 print at 300 dpi needs 88-98 tiles, so 3,000 covers roughly 30 prints
// or a long browsing session while staying within a few hundred MB.
const MAX_TILE_ENTRIES = 3000;
// Cached tiles are revalidated at most once per this interval.
const TILE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const FETCHED_AT_HEADER = "x-sw-fetched-at";

const APP_SHELL = ["/", "/om", "/offline.html", "/icon.svg"];

// Install: pre-cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // Cache each resource individually so one failing entry (e.g. a 500
      // mid-deploy) does not abort the whole install like cache.addAll would.
      .then((cache) =>
        Promise.allSettled([
          ...APP_SHELL.map((u) => cache.add(u)),
          precacheStaticAssets(cache),
        ])
      )
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

  // DAWA address/place search: network-first.
  // Must be checked BEFORE the tile branch — DAWA and the tile services share
  // the api.dataforsyningen.dk host, so distinguish them by path. Otherwise
  // search responses get cached with the tile strategy and never revalidate.
  if (
    (url.hostname === "api.dataforsyningen.dk" &&
      (url.pathname.startsWith("/adresser") ||
        url.pathname.startsWith("/stednavne"))) ||
    url.hostname === "dawa.aws.dk"
  ) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Map tiles: cache-first, revalidated at most once per 24 h
  if (
    url.hostname === "api.dataforsyningen.dk" ||
    url.hostname === "tile.openstreetmap.org" ||
    url.hostname === "cdn.dataforsyningen.dk"
  ) {
    event.respondWith(tileStrategy(event.request, event));
    return;
  }

  // App navigation: network-first, then the cached page, and only then the
  // offline page. ignoreSearch lets deep links (?lat=...) use the cached shell.
  if (event.request.mode === "navigate") {
    event.respondWith(navigationStrategy(event.request, url));
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

  // Other same-origin files (icons, manifest): serve precached copies, else network.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((r) => r || fetch(event.request))
    );
  }
});

async function navigationStrategy(request, url) {
  try {
    const response = await fetch(request);
    if (response.ok && url.origin === self.location.origin) {
      const cache = await caches.open(CACHE_NAME);
      // Query strings (deep links) share the page's entry.
      cache.put(url.pathname, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(url.pathname, { ignoreSearch: true });
    return (
      cached ||
      (await caches.match("/offline.html")) ||
      new Response("Offline", { status: 503 })
    );
  }
}

// Hashed build assets are only requested before the worker controls the page
// on first visit, so fetch them from the shell HTML (and its CSS) at install.
async function precacheStaticAssets(cache) {
  const html = await (await fetch("/")).text();
  const found = new Set(
    html.match(/\/_next\/static\/[^"'\\\s)<>]+/g) || []
  );
  const css = [...found].filter((u) => u.endsWith(".css"));
  for (const href of css) {
    try {
      const text = await (await fetch(href)).text();
      for (const m of text.match(/\/_next\/static\/media\/[^"')\s]+/g) || []) {
        found.add(m);
      }
    } catch {}
  }
  await Promise.allSettled([...found].map((u) => cache.add(u)));
}

// The page reports the same-origin assets it loaded (fonts, lazy chunks).
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "CACHE_URLS" || !Array.isArray(data.urls)) return;
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        data.urls
          .filter((u) => typeof u === "string" && u.startsWith("/_next/static/"))
          .map(async (u) => {
            if (!(await cache.match(u))) await cache.add(u);
          })
      )
    )
  );
});

// Cache-first; entries older than 24 h are refreshed in the background.
async function tileStrategy(request, event) {
  const cache = await caches.open(TILE_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    const fetchedAt = Number(cached.headers.get(FETCHED_AT_HEADER)) || 0;
    if (Date.now() - fetchedAt > TILE_MAX_AGE_MS) {
      event.waitUntil(fetchAndStoreTile(cache, request).catch(() => null));
    }
    return cached;
  }

  try {
    return await fetchAndStoreTile(cache, request);
  } catch {
    return new Response("Tile unavailable", { status: 503 });
  }
}

let tilesSinceTrim = 0;

async function fetchAndStoreTile(cache, request) {
  const response = await fetch(request);
  if (response.ok) {
    const headers = new Headers(response.headers);
    headers.set(FETCHED_AT_HEADER, String(Date.now()));
    const stamped = new Response(await response.clone().blob(), {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
    await cache.put(request, stamped);
    if (++tilesSinceTrim >= 50) {
      tilesSinceTrim = 0;
      await trimCache(cache, MAX_TILE_ENTRIES);
    }
  }
  return response;
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

async function networkFirst(request) {
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
