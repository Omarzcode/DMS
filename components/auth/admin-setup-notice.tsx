"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield } from "lucide-react"

interface AdminSetupNoticeProps {
  userEmail: string | null
}

export function AdminSetupNotice({ userEmail }: AdminSetupNoticeProps) {
  const initialAdminEmail = process.env.NEXT_PUBLIC_INITIAL_ADMIN_EMAIL

  // Only show if there's an initial admin email configured and user matches
  if (!initialAdminEmail || userEmail !== initialAdminEmail) {
    return null
  }

  return (
    <Alert className="mb-6 border-emerald-200 bg-emerald-50">
      <Shield className="h-4 w-4 text-emerald-600" />
      <AlertDescription className="text-emerald-800">
        <strong>Admin Account Created:</strong> You have been automatically assigned admin privileges as the initial
        system administrator.
      </AlertDescription>
    </Alert>
  )
}
