// Bump these on any caching-logic change so activate() purges stale caches —
// e.g. address-search responses that the previous version wrongly stored as tiles.
const CACHE_NAME = "topoprint-v3";
const TILE_CACHE = "topoprint-tiles-v3";
// Areas saved on purpose ("Gem området"). Kept apart from TILE_CACHE so the
// 3,000-entry trim never evicts them, and never revalidated: the user chose them.
const OFFLINE_CACHE = "topoprint-offline-v1";
const OFFLINE_CONCURRENCY = 6;
const OFFLINE_MAX_BATCH = 24;
// Only Dataforsyningen tiles may be bulk-fetched (OSM's policy forbids it).
const OFFLINE_HOSTS = ["api.dataforsyningen.dk"];
// One A4 print at 300 dpi needs 88-98 tiles, so 3,000 covers roughly 30 prints
// or a long browsing session while staying within a few hundred MB.
const MAX_TILE_ENTRIES = 3000;
// Cached tiles are revalidated at most once per this interval.
const TILE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const FETCHED_AT_HEADER = "x-sw-fetched-at";

const APP_SHELL = ["/", "/om", "/offline.html", "/icon.svg"];
const STATIC_PREFIX = "/_next/static/";
// Cache entry listing the /_next/static/ files the current build's shell uses.
const BUILD_KEY = "/__build-assets";

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
          fetch("/")
            .then((r) => r.text())
            .then((html) => syncStaticAssets(cache, html)),
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
            .filter((key) => key !== CACHE_NAME && key !== TILE_CACHE && key !== OFFLINE_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => caches.open(TILE_CACHE))
      .then((cache) => trimCache(cache, MAX_TILE_ENTRIES))
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
    event.respondWith(navigationStrategy(event, url));
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

async function navigationStrategy(event, url) {
  const request = event.request;
  try {
    const response = await fetch(request);
    if (response.ok && url.origin === self.location.origin) {
      const cache = await caches.open(CACHE_NAME);
      // Query strings (deep links) share the page's entry.
      cache.put(url.pathname, response.clone());
      // sw.js is byte-identical across deploys and so never reinstalls: every
      // online visit of the shell re-syncs the build's static assets instead.
      if (url.pathname === "/") {
        const html = response.clone().text();
        event.waitUntil(
          html.then((text) => syncStaticAssets(cache, text)).catch(() => null)
        );
      }
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
// on first visit, so fetch them from the shell HTML (and its CSS). When the set
// differs from the one stored last time (a new deploy), drop the old build's
// files so the cache doesn't grow by one bundle generation per deploy.
async function syncStaticAssets(cache, html) {
  const found = new Set(
    html.match(/\/_next\/static\/[^"'\\\s)<>]+/g) || []
  );
  if (found.size === 0) return;
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

  const signature = JSON.stringify([...found].sort());
  const previous = await cache.match(BUILD_KEY);
  if (previous && (await previous.text()) === signature) return;
  const keys = await cache.keys();
  await Promise.all(
    keys
      .filter((req) => {
        const u = new URL(req.url);
        return (
          u.pathname.startsWith(STATIC_PREFIX) &&
          !found.has(u.pathname + u.search)
        );
      })
      .map((req) => cache.delete(req))
  );
  await cache.put(BUILD_KEY, new Response(signature));
}

// The page reports the same-origin assets it loaded (fonts, lazy chunks).
self.addEventListener("message", (event) => {
  const data = event.data;
  if (data && (data.type === "OFFLINE_FETCH" || data.type === "OFFLINE_DELETE")) {
    const port = event.ports && event.ports[0];
    event.waitUntil(
      (data.type === "OFFLINE_FETCH"
        ? offlineFetch(data.urls)
        : offlineDelete(data.urls)
      )
        .catch((err) => ({ error: String(err) }))
        .then((result) => port && port.postMessage(result))
    );
    return;
  }
  if (!data || data.type !== "CACHE_URLS" || !Array.isArray(data.urls)) return;
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        data.urls
          .map((u) => {
            if (typeof u !== "string") return null;
            // Resolve first: "/_next/static/../x" must not slip past the prefix.
            const parsed = new URL(u, self.location.origin);
            return parsed.origin === self.location.origin &&
              parsed.pathname.startsWith(STATIC_PREFIX)
              ? parsed.pathname + parsed.search
              : null;
          })
          .filter(Boolean)
          .map(async (u) => {
            if (!(await cache.match(u))) await cache.add(u);
          })
      )
    )
  );
});

function offlineUrls(urls, limit) {
  if (!Array.isArray(urls)) return [];
  return urls
    .filter((u) => typeof u === "string")
    .map((u) => {
      try {
        return new URL(u);
      } catch {
        return null;
      }
    })
    .filter((u) => u && u.protocol === "https:" && OFFLINE_HOSTS.includes(u.hostname))
    .slice(0, limit)
    .map((u) => u.href);
}

// Fetch a small batch of tiles (at most OFFLINE_CONCURRENCY in flight) into the
// offline cache. The page sends batches one at a time, so the total stays
// within the limit and it can pause/cancel between batches.
async function offlineFetch(urls) {
  const list = offlineUrls(urls, OFFLINE_MAX_BATCH);
  const cache = await caches.open(OFFLINE_CACHE);
  const stored = [];
  const failed = [];
  let next = 0;
  async function worker() {
    while (next < list.length) {
      const url = list[next++];
      try {
        const response = await fetch(url, { mode: "cors" });
        const type = response.headers.get("content-type") || "";
        // WMS errors come back as 200 + XML: only keep real images.
        if (!response.ok || !type.startsWith("image/")) throw new Error("bad");
        const blob = await response.blob();
        await cache.put(
          url,
          new Response(blob, { status: 200, headers: { "content-type": type } })
        );
        stored.push({ url, bytes: blob.size });
      } catch {
        failed.push(url);
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(OFFLINE_CONCURRENCY, list.length) }, worker)
  );
  return { stored, failed };
}

async function offlineDelete(urls) {
  const cache = await caches.open(OFFLINE_CACHE);
  let deleted = 0;
  for (const u of offlineUrls(urls, 5000)) if (await cache.delete(u)) deleted++;
  return { deleted };
}

// Cache-first; entries older than 24 h are refreshed in the background.
async function tileStrategy(request, event) {
  const saved = await (await caches.open(OFFLINE_CACHE)).match(request);
  if (saved) return saved;
  const cache = await caches.open(TILE_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    const fetchedAt = Number(cached.headers.get(FETCHED_AT_HEADER)) || 0;
    if (navigator.onLine && Date.now() - fetchedAt > TILE_MAX_AGE_MS) {
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
