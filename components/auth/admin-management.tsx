"use client"

import { useState, useEffect } from "react"
import { collection, query, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Preacher, UserRole } from "@/lib/firestore-collections"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Users, Shield, Trash2, AlertCircle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

export function AdminManagement() {
  const { userRole } = useAuth()
  const [preachers, setPreachers] = useState<Preacher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingUser, setUpdatingUser] = useState<string | null>(null)

  useEffect(() => {
    fetchPreachers()
  }, [])

  const fetchPreachers = async () => {
    try {
      setLoading(true)
      const q = query(collection(db, "preachers"))
      const querySnapshot = await getDocs(q)
      const preachersData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Preacher[]
      setPreachers(preachersData)
    } catch (error) {
      console.error("Error fetching preachers:", error)
      setError("Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      setUpdatingUser(userId)
      await updateDoc(doc(db, "preachers", userId), { role: newRole })

      // Update local state
      setPreachers((prev) =>
        prev.map((preacher) => (preacher.id === userId ? { ...preacher, role: newRole } : preacher)),
      )

      setError(null)
    } catch (error) {
      console.error("Error updating user role:", error)
      setError("Failed to update user role")
    } finally {
      setUpdatingUser(null)
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return
    }

    try {
      setUpdatingUser(userId)
      await deleteDoc(doc(db, "preachers", userId))

      // Update local state
      setPreachers((prev) => prev.filter((preacher) => preacher.id !== userId))

      setError(null)
    } catch (error) {
      console.error("Error deleting user:", error)
      setError("Failed to delete user")
    } finally {
      setUpdatingUser(null)
    }
  }

  if (userRole !== "admin") {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>You don't have permission to access user management.</AlertDescription>
      </Alert>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading users...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6" />
        <h2 className="text-2xl font-bold">User Management</h2>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        {preachers.map((preacher) => (
          <Card key={preacher.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{preacher.name}</CardTitle>
                  <CardDescription>{preacher.email}</CardDescription>
                </div>
                <Badge variant={preacher.role === "admin" ? "default" : "secondary"}>
                  {preacher.role === "admin" ? (
                    <>
                      <Shield className="w-3 h-3 mr-1" />
                      Admin
                    </>
                  ) : (
                    "Preacher"
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">Role:</label>
                  <Select
                    value={preacher.role}
                    onValueChange={(value: UserRole) => updateUserRole(preacher.id, value)}
                    disabled={updatingUser === preacher.id}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="da'i">Preacher</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteUser(preacher.id)}
                  disabled={updatingUser === preacher.id}
                >
                  {updatingUser === preacher.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="mt-2 text-sm text-muted-foreground">
                Joined: {preacher.created_at?.toLocaleDateString() || "Unknown"}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {preachers.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No users found</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
