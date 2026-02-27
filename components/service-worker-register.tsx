// components/service-worker-register.tsx
"use client"

import { useEffect } from "react"

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("✅ SW registered:", registration.scope)
        })
        .catch((error) => {
          console.error("❌ SW failed:", error)
        })
    }
  }, [])

  return null
}