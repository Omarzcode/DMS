// components/service-worker-register.tsx
"use client"

import { useEffect } from "react"
import { Capacitor } from "@capacitor/core"

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return

    // In native Capacitor APK (Android/iOS), unregister any service worker and clear CacheStorage
    // to guarantee the app always renders the newly bundled assets from the APK
    if (Capacitor.isNativePlatform()) {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) {
            reg.unregister().catch(() => {})
          }
        })
      }
      if ("caches" in window) {
        caches.keys().then((names) => {
          for (const name of names) {
            caches.delete(name).catch(() => {})
          }
        })
      }
      return
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          registration.update().catch(() => {})
        })
        .catch(() => {})
    }
  }, [])

  return null
}