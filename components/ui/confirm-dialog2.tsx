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

  const cleanup = useCallback(() => {
    requestAnimationFrame(() => {
      const openDialogs = document.querySelectorAll(
        '[role="dialog"][data-state="open"]'
      )
      if (openDialogs.length > 0) {
        document.body.style.pointerEvents = "none"
      }
    })
  }, [])

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true)
    resolveRef.current = null
    setOpen(false)
    cleanup()
  }, [cleanup])

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false)
    resolveRef.current = null
    setOpen(false)
    cleanup()
  }, [cleanup])

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        resolveRef.current?.(false)
        resolveRef.current = null
        setOpen(false)
        cleanup()
      }
    },
    [cleanup]
  )

  const ConfirmDialog = (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent
        dir="ltr"
        onCloseAutoFocus={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.stopPropagation()}
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