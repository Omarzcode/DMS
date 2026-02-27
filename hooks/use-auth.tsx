// hooks/use-auth.tsx - FINAL VERSION
"use client"

import { useState, useEffect, createContext, useContext } from "react"
import { 
  type User, 
  onAuthStateChanged, 
  signInWithRedirect,  // ← CHANGE popup to redirect!
  signOut,
  GoogleAuthProvider
} from "firebase/auth"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { auth, googleProvider, db } from "@/lib/firebase"
import type { Preacher, UserRole } from "@/lib/firestore-collections"

interface AuthContextType {
  user: User | null
  userRole: UserRole | null
  userProfile: Preacher | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [userProfile, setUserProfile] = useState<Preacher | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, "preachers", user.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const userData = userDoc.data() as Preacher
          setUser(user)
          setUserProfile(userData)
          setUserRole(userData.role)
        } else {
          const newPreacher: Preacher = {
            id: user.uid,
            name: user.displayName || user.email || "Unknown",
            email: user.email || "",
            role: "pending",
            created_at: serverTimestamp() as any,
          }
          await setDoc(userDocRef, newPreacher)
          setUser(user)
          setUserProfile(newPreacher)
          setUserRole("pending")
        }
      } else {
        setUser(null)
        setUserProfile(null)
        setUserRole(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signInWithGoogle = async () => {
    try {
      // ✅ Use REDIRECT instead of POPUP for Android TWA
      await signInWithRedirect(auth, googleProvider)
    } catch (error: any) {
      console.error("Error signing in:", error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error("Error signing out:", error)
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, userRole, userProfile,
      loading, signInWithGoogle, logout 
    }}>
      {children}
    </AuthContext.Provider>
  )
}