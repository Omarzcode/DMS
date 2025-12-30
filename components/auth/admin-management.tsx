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
import { Loader2, Users, Shield, Trash2, AlertCircle, Check, X } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

export function AdminManagement() {
  const { userRole } = useAuth()
  const [preachers, setPreachers] = useState<Preacher[]>([])
  const [pendingUsers, setPendingUsers] = useState<Preacher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingUser, setProcessingUser] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (userRole !== "admin") return
    fetchUsers()
  }, [userRole])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const q = query(collection(db, "preachers"))
      const querySnapshot = await getDocs(q)
      const usersData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Preacher[]
      
      setPreachers(usersData.filter(u => u.role === 'admin' || u.role === 'da\'i'))
      setPendingUsers(usersData.filter(u => u.role === 'pending'))
    } catch (error) {
      console.error("Error fetching users:", error)
      setError("Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      setProcessingUser(userId)
      await updateDoc(doc(db, "preachers", userId), { role: newRole })
      
      // Optimistic update
      if (newRole === 'pending') {
        setPreachers(prev => prev.filter(user => user.id !== userId))
        setPendingUsers(prev => {
          const updatedUser = preachers.find(u => u.id === userId)
          return updatedUser ? [...prev, { ...updatedUser, role: newRole }] : prev
        })
      } else {
        setPendingUsers(prev => prev.filter(user => user.id !== userId))
        setPreachers(prev => prev.map(user => 
          user.id === userId ? { ...user, role: newRole } : user
        ))
      }
      
      setSuccessMessage("User role updated successfully")
    } catch (error) {
      console.error("Error updating user role:", error)
      setError("Failed to update user role")
      fetchUsers() // Fallback refresh on error
    } finally {
      setProcessingUser(null)
    }
  }
  
  const deleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return
    }
    try {
      setProcessingUser(userId)
      await deleteDoc(doc(db, "preachers", userId))
      
      // Optimistic update
      setPreachers(prev => prev.filter(user => user.id !== userId))
      setPendingUsers(prev => prev.filter(user => user.id !== userId))
      
      setSuccessMessage("User deleted successfully")
    } catch (error) {
      console.error("Error deleting user:", error)
      setError("Failed to delete user")
      fetchUsers() // Fallback refresh on error
    } finally {
      setProcessingUser(null)
    }
  }

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  if (userRole !== "admin") {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to access this page.
        </AlertDescription>
      </Alert>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading users...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {successMessage && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Pending Users Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Users className="h-6 w-6" /> Pending Approval
        </h2>
        {pendingUsers.length > 0 ? (
          <div className="grid gap-4">
            {pendingUsers.map(user => (
              <Card key={user.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{user.name}</CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                  <Button 
                    size="sm" 
                    onClick={() => updateUserRole(user.id, 'da\'i')} 
                    disabled={processingUser === user.id}
                  >
                    {processingUser === user.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Approve
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => deleteUser(user.id)} 
                    disabled={processingUser === user.id}
                  >
                    {processingUser === user.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <X className="h-4 w-4 mr-2" />
                    )}
                    Reject
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mb-4 opacity-50" />
              <p>No new users are awaiting approval.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Approved Users Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Shield className="h-6 w-6" /> Approved Users
        </h2>
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
                    {preacher.role}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Role:</label>
                  <Select
                    value={preacher.role}
                    onValueChange={(value: UserRole) => updateUserRole(preacher.id, value)}
                    disabled={processingUser === preacher.id}
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
                  size="icon" 
                  onClick={() => deleteUser(preacher.id)} 
                  disabled={processingUser === preacher.id}
                >
                  {processingUser === preacher.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}