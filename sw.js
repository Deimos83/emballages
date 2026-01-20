const CACHE_VERSION = "v3";
const APP_CACHE = `emb-app-${CACHE_VERSION}`;
const IMG_CACHE = `emb-img-${CACHE_VERSION}`;

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./sw.js"
];

// Install : cache le core
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Activate : clean anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (![APP_CACHE, IMG_CACHE].includes(k)) return caches.delete(k);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // ✅ Images dans /img/ : cache-first (offline)
  if (url.pathname.includes("/img/")) {
    event.respondWith(cacheFirst(req, IMG_CACHE));
    return;
  }

  // ✅ Le reste : network-first (pour que les updates passent)
  event.respondWith(networkFirst(req, APP_CACHE));
});

// ------- helpers -------
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const fresh = await fetch(request);
  cache.put(request, fresh.clone());
  return fresh;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(request);
    cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}
