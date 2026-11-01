"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Capacitor } from "@capacitor/core"
import { App as CapApp } from "@capacitor/app"
import { Network } from "@capacitor/network"
import { StatusBar, Style } from "@capacitor/status-bar"
import { WifiOff } from "lucide-react"

export function NativeMobileProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isOffline, setIsOffline] = useState(false)
  const isNative = Capacitor.isNativePlatform()

  useEffect(() => {
    // Only configure native plugins when running inside the Android APK / native shell
    if (isNative) {
      // 1. Android Status Bar styling
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
      StatusBar.setBackgroundColor({ color: "#1c2111" }).catch(() => {})

      // 2. Hardware Back Button handler
      const backListener = CapApp.addListener("backButton", ({ canGoBack }) => {
        // If on the root dashboard, exit or stay; otherwise go back
        if (pathname === "/dashboard" || pathname === "/" || pathname === "/admin") {
          CapApp.exitApp()
        } else if (canGoBack) {
          router.back()
        } else {
          router.push("/dashboard")
        }
      })

      return () => {
        backListener.then((h) => h.remove()).catch(() => {})
      }
    }
  }, [isNative, pathname, router])

  useEffect(() => {
    // Network status listener (works in both native Android and browser)
    const checkNetwork = async () => {
      try {
        const status = await Network.getStatus()
        setIsOffline(!status.connected)
      } catch {
        setIsOffline(!navigator.onLine)
      }
    }

    checkNetwork()

    const networkListener = Network.addListener("networkStatusChange", (status) => {
      setIsOffline(!status.connected)
    })

    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      networkListener.then((h) => h.remove()).catch(() => {})
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return (
    <>
      {isOffline && (
        <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-600/95 text-white px-3 py-1.5 text-xs font-medium backdrop-blur-sm shadow-xs transition-all">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span>Offline Mode — All changes are saved locally and will sync once connected.</span>
        </div>
      )}
      {children}
    </>
  )
}
