"use client"

import { useEffect } from "react"

/**
 * Global failsafe for Radix UI / Next.js pointer-events locking.
 * When modals, sheets, or dropdowns close or unmount (e.g. clicking Cancel, backdrop,
 * or especially browser "back" navigation), Radix UI can leave `pointer-events: none`
 * on `document.body`, freezing all click responses.
 *
 * This component continuously ensures pointer-events and scroll locks are cleanly
 * released whenever no modal or overlay is active.
 */
export function PointerLockFix() {
  useEffect(() => {
    const unlockPointerEvents = () => {
      if (typeof document === "undefined" || !document.body) return

      // Check if any open modal / dialog / sheet / alert-dialog actually exists in DOM
      const hasOpenOverlay = document.querySelector(
        '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [data-radix-portal] [data-state="open"]'
      )

      if (!hasOpenOverlay) {
        if (document.body.style.pointerEvents === "none") {
          document.body.style.pointerEvents = ""
        }
      }
    }

    // 1. Listen for browser back/forward navigation (popstate)
    const handlePopState = () => {
      if (typeof document !== "undefined" && document.body) {
        document.body.style.pointerEvents = ""
      }
      setTimeout(unlockPointerEvents, 50)
    }

    // 2. Observe style mutations on document.body to catch leftover pointer-events: none
    const observer = new MutationObserver(() => {
      if (document.body && document.body.style.pointerEvents === "none") {
        setTimeout(unlockPointerEvents, 50)
        setTimeout(unlockPointerEvents, 150)
      }
    })

    if (document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["style"],
      })
    }

    window.addEventListener("popstate", handlePopState)

    return () => {
      observer.disconnect()
      window.removeEventListener("popstate", handlePopState)
      if (typeof document !== "undefined" && document.body) {
        document.body.style.pointerEvents = ""
      }
    }
  }, [])

  return null
}
