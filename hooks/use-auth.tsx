"use client"

import type React from "react"

import { useState, useEffect, createContext, useContext } from "react"
import { type User, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
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
      setUser(user)

      if (user) {
        // Check if user exists in Firestore
        const userDoc = await getDoc(doc(db, "preachers", user.uid))

        if (userDoc.exists()) {
          const userData = userDoc.data() as Preacher
          setUserProfile(userData)
          setUserRole(userData.role)
        } else {
          const initialAdminEmail = process.env.NEXT_PUBLIC_INITIAL_ADMIN_EMAIL
          const isInitialAdmin = initialAdminEmail && user.email === initialAdminEmail

          // Create new preacher profile with appropriate role
          const newPreacher: Preacher = {
            id: user.uid,
            name: user.displayName || user.email || "Unknown",
            email: user.email || "",
            role: isInitialAdmin ? "admin" : "da'i", // Assign admin role to initial admin email
            created_at: new Date(),
          }

          await setDoc(doc(db, "preachers", user.uid), newPreacher)
          setUserProfile(newPreacher)
          setUserRole(newPreacher.role)

          if (isInitialAdmin) {
            console.log("[v0] Initial admin account created for:", user.email)
          }
        }
      } else {
        setUserProfile(null)
        setUserRole(null)
      }

      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (error: any) {
      console.error("Error signing in with Google:", error)

      if (error.code === "auth/unauthorized-domain") {
        const currentDomain = window.location.hostname
        console.error(`
🔒 FIREBASE CONFIGURATION REQUIRED:

The domain "${currentDomain}" is not authorized for Firebase Authentication.

TO FIX THIS:
1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project: d-m-s-e87c0
3. Go to Authentication > Settings > Authorized domains
4. Click "Add domain" and add: ${currentDomain}
5. Save and try signing in again

Current unauthorized domain: ${currentDomain}
        `)

        alert(
          `Domain authorization required!\n\nAdd "${currentDomain}" to Firebase Console > Authentication > Settings > Authorized domains`,
        )
      }

      if (error.code === "auth/operation-not-allowed") {
        console.error(`
🔒 GOOGLE SIGN-IN NOT ENABLED:

Google Sign-In provider is not enabled in Firebase Console.

TO FIX THIS:
1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project: d-m-s-e87c0
3. Go to Authentication > Sign-in method
4. Click on "Google" provider
5. Click "Enable" toggle
6. Add your email to "Authorized domains" if needed
7. Save and try signing in again
        `)

        alert(
          `Google Sign-In not enabled!\n\nGo to Firebase Console > Authentication > Sign-in method and enable Google provider`,
        )
      }

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

  const value = {
    user,
    userRole,
    userProfile,
    loading,
    signInWithGoogle,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
