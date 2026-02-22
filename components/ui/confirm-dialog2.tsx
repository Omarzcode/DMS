// components/ui/confirm-dialog.tsx
"use client"

import { useState, useCallback, useRef } from "react"
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
import { AlertTriangle, Trash2, Wrench, HelpCircle } from "lucide-react"

type ConfirmVariant = "danger" | "warning" | "info" | "default"

interface ConfirmOptions {
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: ConfirmVariant
}

const VARIANT_CONFIG: Record<
  ConfirmVariant,
  {
    icon: React.ElementType
    iconClassName: string
    iconBgClassName: string
    confirmClassName: string
  }
> = {
  danger: {
    icon: Trash2,
    iconClassName: "text-destructive",
    iconBgClassName: "bg-destructive/10",
    confirmClassName:
      "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  },
  warning: {
    icon: AlertTriangle,
    iconClassName: "text-warning",
    iconBgClassName: "bg-warning/10",
    confirmClassName:
      "bg-warning text-warning-foreground hover:bg-warning/90",
  },
  info: {
    icon: Wrench,
    iconClassName: "text-info",
    iconBgClassName: "bg-info/10",
    confirmClassName:
      "bg-info text-info-foreground hover:bg-info/90",
  },
  default: {
    icon: HelpCircle,
    iconClassName: "text-primary",
    iconBgClassName: "bg-primary/10",
    confirmClassName:
      "bg-primary text-primary-foreground hover:bg-primary/90",
  },
}

let confirmFn: ((options: ConfirmOptions) => Promise<boolean>) | null = null

export function useConfirm() {
  const resolveRef = useRef<((value: boolean) => void) | null>(null)
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions>({
    title: "",
    description: "",
  })

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setOptions(opts)
      setOpen(true)
    })
  }, [])

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true)
    resolveRef.current = null
    setOpen(false)
  }, [])

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false)
    resolveRef.current = null
    setOpen(false)
  }, [])

  const variant = options.variant || "default"
  const config = VARIANT_CONFIG[variant]
  const IconComponent = config.icon

  const ConfirmDialog = (
    <AlertDialog open={open} onOpenChange={(o) => !o && handleCancel()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${config.iconBgClassName}`}
            >
              <IconComponent className={`h-6 w-6 ${config.iconClassName}`} />
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-lg">
                {options.title}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm leading-relaxed">
                {options.description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel
            onClick={handleCancel}
            className="mt-0"
          >
            {options.cancelText || "إلغاء"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={config.confirmClassName}
          >
            {options.confirmText || "تأكيد"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return { confirm, ConfirmDialog }
}