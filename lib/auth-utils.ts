import type { User } from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "./firebase"
import type { Preacher, UserRole } from "./firestore-collections"

export async function createUserProfile(user: User): Promise<Preacher> {
  const userEmail = (user.email || "").toLowerCase().trim()
  const adminList = [
    "omar.mo3031@gmail.com",
    "mos.20122003@gmail.com",
    (process.env.NEXT_PUBLIC_INITIAL_ADMIN_EMAIL || "").toLowerCase().trim(),
  ].filter(Boolean)
  const isInitialAdmin = adminList.includes(userEmail)

  const userProfile: Preacher = {
    id: user.uid,
    name: user.displayName || user.email || "Unknown User",
    email: user.email || "",
    role: isInitialAdmin ? "admin" : "da'i",
    created_at: new Date(),
  }

  await setDoc(doc(db, "preachers", user.uid), userProfile)
  return userProfile
}

export async function getUserProfile(userId: string): Promise<Preacher | null> {
  try {
    const userDoc = await getDoc(doc(db, "preachers", userId))
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() } as Preacher
    }
    return null
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return null
  }
}

export async function updateUserRole(userId: string, newRole: UserRole): Promise<void> {
  await setDoc(doc(db, "preachers", userId), { role: newRole }, { merge: true })
}

export function isAdmin(userRole: UserRole | null): boolean {
  return userRole === "admin"
}

export function isPreacher(userRole: UserRole | null): boolean {
  return userRole === "da'i"
}

export function canAccessAdminFeatures(userRole: UserRole | null): boolean {
  return isAdmin(userRole)
}

export function canManageBeneficiaries(userRole: UserRole | null): boolean {
  return isAdmin(userRole) || isPreacher(userRole)
}
