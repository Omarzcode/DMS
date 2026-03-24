// public/sw.js
const CACHE_NAME = 'ems-v2'
const OFFLINE_URL = '/offline'

const STATIC_ASSETS = [
  '/offline',
  '/manifest.json',
  '/ic_launcher-web.png',
  '/mipmap-mdpi/ic_launcher.png',
  '/mipmap-hdpi/ic_launcher.png',
  '/mipmap-xhdpi/ic_launcher.png',
  '/mipmap-xxhdpi/ic_launcher.png',
  '/mipmap-xxxhdpi/ic_launcher.png',
  '/mipmap-xxxhdpi/ic_launcher_round.png'
]

// ─── Install ──────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// ─── Activate ─────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// ─── Fetch ────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = event.request.url

  // Never intercept Next.js internal chunks — they are hashed and must
  // always come fresh from the server to avoid stale-chunk errors.
  if (url.includes('/_next/')) return

  // Skip Firebase & Google Auth requests
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('firebase') ||
    url.includes('google.com/o/oauth2') ||
    url.includes('accounts.google.com')
  ) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (event.request.method === 'GET' && response.status === 200) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL)
          }
        })
      })
  )
})
