"use client"

import type React from "react"

import { useAuth } from "@/hooks/use-auth"
import type { UserRole } from "@/lib/firestore-collections"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Image from "next/image"
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
        <div className="animate-breathe">
          <Image
            src="/zeta.png"
            alt="Logo"
            width={64}
            height={64}
            className="object-contain"
            priority
          />
        </div>
        <div className="h-1 w-24 rounded-full bg-muted overflow-hidden">
          <div className="h-full w-1/2 rounded-full bg-primary animate-slide" />
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
