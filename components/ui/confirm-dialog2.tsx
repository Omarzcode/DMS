// components/ui/confirm-dialog2.tsx
"use client"

import { useCallback, useRef, useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ConfirmOptions {
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: "danger" | "info" | "default"
}

export function useConfirm() {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions>({
    title: "",
    description: "",
  })
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts)
    setOpen(true)

    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
    })
  }, [])

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true)
    resolveRef.current = null
    setOpen(false)

    // KEY FIX: Clean up body styles after closing
    requestAnimationFrame(() => {
      // Don't remove pointer-events if another dialog is still open
      const openDialogs = document.querySelectorAll('[role="dialog"][data-state="open"]')
      if (openDialogs.length > 0) {
        // Another dialog is still open, re-apply pointer-events: none
        document.body.style.pointerEvents = "none"
      }
    })
  }, [])

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false)
    resolveRef.current = null
    setOpen(false)

    // KEY FIX: Same cleanup
    requestAnimationFrame(() => {
      const openDialogs = document.querySelectorAll('[role="dialog"][data-state="open"]')
      if (openDialogs.length > 0) {
        document.body.style.pointerEvents = "none"
      }
    })
  }, [])

  // KEY FIX: Handle the case where dialog is dismissed via escape/overlay
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      resolveRef.current?.(false)
      resolveRef.current = null
      setOpen(false)

      requestAnimationFrame(() => {
        const openDialogs = document.querySelectorAll('[role="dialog"][data-state="open"]')
        if (openDialogs.length > 0) {
          document.body.style.pointerEvents = "none"
        }
      })
    }
  }, [])

  const ConfirmDialog = (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent
        // KEY FIX: Prevent this dialog from stealing focus cleanup from parent
        onCloseAutoFocus={(e) => {
          e.preventDefault()
        }}
        // KEY FIX: Prevent overlay click from propagating to parent dialog
        onEscapeKeyDown={(e) => {
          e.stopPropagation()
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{options.title}</AlertDialogTitle>
          <AlertDialogDescription>{options.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {options.cancelText || "Cancel"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={cn(
              options.variant === "danger" &&
                buttonVariants({ variant: "destructive" }),
              options.variant === "info" &&
                "bg-info text-info-foreground hover:bg-info/90"
            )}
          >
            {options.confirmText || "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return { confirm, ConfirmDialog }
}
