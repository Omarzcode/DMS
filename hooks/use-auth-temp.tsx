"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"

interface User {
  uid: string
  email: string
  displayName: string
  role: "admin" | "da'i"
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  const signInWithGoogle = async () => {
    // Mock sign in - create a demo user
    const mockUser: User = {
      uid: "demo-user-123",
      email: "demo@example.com",
      displayName: "Demo User",
      role: "admin", // Default to admin for demo
    }
    setUser(mockUser)
  }

  const signOut = async () => {
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
