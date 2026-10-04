const CACHE_NAME = "casemind-shell-v1"
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/paklaw-logo-embedded.png",
  "/paklaw-logo.png",
  "/paklaw-logo-transparent.png",
  "/casewallpaper.jpg",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key === CACHE_NAME ? Promise.resolve() : caches.delete(key))))
    )
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET" || new URL(request.url).pathname.startsWith("/api/")) {
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(() => caches.match("/index.html"))
    })
  )
})
