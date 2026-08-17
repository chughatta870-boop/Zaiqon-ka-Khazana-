const CACHE_NAME = "zaiqa-khazana-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./data.json?v=3",
  "./manifest.json",
  "./icon-96.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./icon-180.png",
  "./screenshot-narrow.png",
  "./screenshot-wide.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache each asset individually so ONE missing/failed file
      // (e.g. a screenshot not yet uploaded) can't block the whole
      // install and leave an old, stale service worker in control.
      return Promise.allSettled(
        ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn("SW: could not cache", url, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResp) => {
          if (networkResp && networkResp.status === 200) {
            const respClone = networkResp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, respClone));
          }
          return networkResp;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
