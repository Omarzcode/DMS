"use client"

import type React from "react"

import { useAuth } from "@/hooks/use-auth"
import type { UserRole } from "@/lib/firestore-collections"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: UserRole
  redirectTo?: string
}

export function AuthGuard({ children, requiredRole, redirectTo = "/" }: AuthGuardProps) {
  const { user, userRole, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      // Redirect to login if not authenticated
      if (!user) {
        router.push(redirectTo)
        return
      }

      // Check role requirements
      if (requiredRole && userRole !== requiredRole) {
        // Redirect based on actual role
        if (userRole === "admin") {
          router.push("/admin")
        } else if (userRole === "da'i") {
          router.push("/dashboard")
        } else {
          router.push("/")
        }
        return
      }
    }
  }, [user, userRole, loading, requiredRole, redirectTo, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Authenticating...</span>
        </div>
      </div>
    )
  }

  // Don't render children if not authenticated or wrong role
  if (!user || (requiredRole && userRole !== requiredRole)) {
    return null
  }

  return <>{children}</>
}
