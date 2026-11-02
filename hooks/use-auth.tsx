"use client"

import type React from "react"
import { useState, useEffect, createContext, useContext } from "react"
import {
  type User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
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
  signInWithEmail: (email: string, password: string) => Promise<any>
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<any>
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, "preachers", firebaseUser.uid)
          const userDoc = await getDoc(userDocRef)

          const userEmail = (firebaseUser.email || "").toLowerCase().trim()
          const adminList = [
            "omar.mo3031@gmail.com",
            "mos.20122003@gmail.com",
            (process.env.NEXT_PUBLIC_INITIAL_ADMIN_EMAIL || "").toLowerCase().trim(),
          ].filter(Boolean)
          const isDesignatedAdmin = adminList.includes(userEmail)

          if (userDoc.exists()) {
            const userData = userDoc.data() as Preacher
            let effectiveRole = userData.role

            // Auto-upgrade if designated admin or if stuck in pending
            if (isDesignatedAdmin && effectiveRole !== "admin") {
              effectiveRole = "admin"
              await setDoc(userDocRef, { role: "admin" }, { merge: true }).catch(console.warn)
            } else if (effectiveRole === "pending") {
              effectiveRole = "da'i"
              await setDoc(userDocRef, { role: "da'i" }, { merge: true }).catch(console.warn)
            }

            setUser(firebaseUser)
            setUserProfile({ ...userData, role: effectiveRole })
            setUserRole(effectiveRole)
          } else {
            const assignedRole: UserRole = isDesignatedAdmin ? "admin" : "da'i"

            const newPreacher: Preacher = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email || "Unknown",
              email: firebaseUser.email || "",
              role: assignedRole,
              created_at: serverTimestamp() as any,
            }
            await setDoc(userDocRef, newPreacher)
            setUser(firebaseUser)
            setUserProfile(newPreacher)
            setUserRole(assignedRole)
          }
        } catch (err) {
          console.error("Error setting up user profile in Firestore:", err)
          setUser(firebaseUser)
          // Default to da'i so user is not locked out with missing permissions
          setUserRole("da'i")
        }
      } else {
        setUser(null)
        setUserProfile(null)
        setUserRole(null)
      }

      setLoading(false)
    })

    // Process redirect result if coming back from OAuth redirect
    getRedirectResult(auth).catch((err) => {
      if (err?.code !== "auth/null-user") {
        console.warn("OAuth redirect result:", err)
      }
    })

    return unsubscribe
  }, [])

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (error: any) {
      if (
        error?.code === "auth/popup-closed-by-user" ||
        error?.code === "auth/cancelled-popup-request"
      ) {
        return
      }
      // If popup is blocked or unsupported in Android WebView, try redirect
      if (
        error?.code === "auth/popup-blocked" ||
        error?.code === "auth/operation-not-supported-in-this-environment"
      ) {
        console.warn("Popup blocked or unsupported, falling back to redirect...")
        await signInWithRedirect(auth, googleProvider)
        return
      }
      console.error("Error signing in with Google:", error)
      throw error
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    return await signInWithEmailAndPassword(auth, email.trim(), password)
  }

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
    if (name && cred.user) {
      await updateProfile(cred.user, { displayName: name.trim() }).catch(console.warn)
    }
    return cred
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
    signInWithEmail,
    signUpWithEmail,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}