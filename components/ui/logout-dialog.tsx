// components/ui/logout-dialog.tsx

"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { LogOut, Loader2 } from "lucide-react"

interface LogoutDialogProps {
  onLogout: () => Promise<void>
  className?: string
}

export function LogoutDialog({ onLogout, className }: LogoutDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      await onLogout()
    } catch (error) {
      console.error("Logout failed:", error)
      setIsLoading(false)
      setOpen(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className ?? "h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive group-data-[collapsible=icon]:hidden"}
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent className="max-w-[320px] p-0 overflow-hidden border-border" dir="ltr">
        {/* Top accent line */}
        <div className="h-1 w-full bg-destructive/80" />

        <AlertDialogHeader className="p-6 pb-4 text-center sm:text-center">
          {/* Icon */}
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <LogOut className="h-5 w-5 text-destructive" />
          </div>

          <AlertDialogTitle className="text-lg font-semibold text-foreground">
            Sign out?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            You'll need to sign in again to access your account.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Actions */}
        <div className="flex border-t border-border">
          <button
            onClick={() => setOpen(false)}
            disabled={isLoading}
            className="flex-1 py-3 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors border-r border-border disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleLogout}
            disabled={isLoading}
            className="flex-1 py-3 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Signing out…
              </>
            ) : (
              "Sign out"
            )}
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}