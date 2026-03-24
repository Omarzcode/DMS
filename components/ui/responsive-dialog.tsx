"use client"

import * as React from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

interface ResponsiveDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

interface ResponsiveDialogContentProps {
  className?: string
  children: React.ReactNode
}

const ResponsiveDialogContext = React.createContext<{ isMobile: boolean }>({
  isMobile: false,
})

function ResponsiveDialog({ open, onOpenChange, children }: ResponsiveDialogProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <ResponsiveDialogContext.Provider value={{ isMobile: true }}>
        <Sheet open={open} onOpenChange={onOpenChange}>
          {children}
        </Sheet>
      </ResponsiveDialogContext.Provider>
    )
  }

  return (
    <ResponsiveDialogContext.Provider value={{ isMobile: false }}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {children}
      </Dialog>
    </ResponsiveDialogContext.Provider>
  )
}

function ResponsiveDialogTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode
  asChild?: boolean
}) {
  const { isMobile } = React.useContext(ResponsiveDialogContext)
  if (isMobile) return <SheetTrigger asChild={asChild}>{children}</SheetTrigger>
  return <DialogTrigger asChild={asChild}>{children}</DialogTrigger>
}

function ResponsiveDialogContent({ className, children }: ResponsiveDialogContentProps) {
  const { isMobile } = React.useContext(ResponsiveDialogContext)
  if (isMobile) {
    return (
      <SheetContent
        side="bottom"
        className={`max-h-[92dvh] overflow-y-auto rounded-t-2xl ${className ?? ""}`}
      >
        {children}
      </SheetContent>
    )
  }
  return (
    <DialogContent className={`max-h-[90dvh] overflow-y-auto ${className ?? ""}`}>
      {children}
    </DialogContent>
  )
}

function ResponsiveDialogHeader({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const { isMobile } = React.useContext(ResponsiveDialogContext)
  if (isMobile) return <SheetHeader className={className}>{children}</SheetHeader>
  return <DialogHeader className={className}>{children}</DialogHeader>
}

function ResponsiveDialogTitle({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const { isMobile } = React.useContext(ResponsiveDialogContext)
  if (isMobile) return <SheetTitle className={className}>{children}</SheetTitle>
  return <DialogTitle className={className}>{children}</DialogTitle>
}

function ResponsiveDialogDescription({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const { isMobile } = React.useContext(ResponsiveDialogContext)
  if (isMobile) return <SheetDescription className={className}>{children}</SheetDescription>
  return <DialogDescription className={className}>{children}</DialogDescription>
}

function ResponsiveDialogFooter({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const { isMobile } = React.useContext(ResponsiveDialogContext)
  if (isMobile) return <SheetFooter className={className}>{children}</SheetFooter>
  return <DialogFooter className={className}>{children}</DialogFooter>
}

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
}
