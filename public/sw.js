/* Minimal app-shell cache so the app keeps working offline after the first load.
   Google API calls are deliberately never cached — they need a live token. */

const CACHE_PREFIX = 'bgt-shell-'
// registerServiceWorker appends ?v=<build id>, so each deploy gets its own cache.
const BUILD = new URLSearchParams(self.location.search).get('v') || 'dev'
const CACHE = `${CACHE_PREFIX}${BUILD}`
const INDEX_URL = `${self.registration.scope}index.html`

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([self.registration.scope, INDEX_URL]))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            // Drop every previous build's shell, so a stale index.html can never
            // be served pointing at asset hashes that no longer exist.
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Navigations: prefer the network so a redeploy is picked up immediately.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(INDEX_URL, copy))
          return response
        })
        .catch(() => caches.match(INDEX_URL)),
    )
    return
  }

  // Hashed build assets are immutable, so cache-first is safe and fast.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        }),
    ),
  )
})
