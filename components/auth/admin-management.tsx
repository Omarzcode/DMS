"use client"

import { useState, useEffect } from "react"
import { collection, query, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Preacher, UserRole } from "@/lib/firestore-collections"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Loader2, Users, Shield, Trash2, AlertCircle, Check, X, UserX, AlertTriangle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

export function AdminManagement() {
  const { userRole } = useAuth()
  const [preachers, setPreachers] = useState<Preacher[]>([])
  const [pendingUsers, setPendingUsers] = useState<Preacher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingUser, setProcessingUser] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogConfig, setDialogConfig] = useState<{
    title: string
    description: string
    action: () => void
    variant: "approve" | "reject" | "delete" | "changeRole"
    userName?: string
    newRole?: UserRole
  } | null>(null)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const q = query(collection(db, "preachers"))
      const querySnapshot = await getDocs(q)
      const usersData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Preacher[]
      
      setPreachers(usersData.filter(u => u.role === 'admin' || u.role === 'da\'i'))
      setPendingUsers(usersData.filter(u => u.role === 'pending'))
    } catch (err) {
      setError("Failed to load users. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      setProcessingUser(userId)
      setError(null)
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
    } catch (err) {
      setError("Failed to update user role. Please try again.")
      fetchUsers() // Refresh on error
    } finally {
      setProcessingUser(null)
    }
  }
  
  const deleteUser = async (userId: string) => {
    try {
      setProcessingUser(userId)
      setError(null)
      await deleteDoc(doc(db, "preachers", userId))
      
      // Optimistic update
      setPreachers(prev => prev.filter(user => user.id !== userId))
      setPendingUsers(prev => prev.filter(user => user.id !== userId))
      
      setSuccessMessage("User deleted successfully")
    } catch (err) {
      setError("Failed to delete user. Please try again.")
      fetchUsers() // Refresh on error
    } finally {
      setProcessingUser(null)
    }
  }

  // Dialog handlers
  const showApproveDialog = (user: Preacher) => {
    setDialogConfig({
      title: "Approve User",
      description: `Are you sure you want to approve ${user.name} as a Preacher?`,
      action: () => updateUserRole(user.id, 'da\'i'),
      variant: "approve",
      userName: user.name
    })
    setDialogOpen(true)
  }

  const showRejectDialog = (user: Preacher) => {
    setDialogConfig({
      title: "Reject User",
      description: `Are you sure you want to reject ${user.name}'s registration? This action cannot be undone.`,
      action: () => deleteUser(user.id),
      variant: "reject",
      userName: user.name
    })
    setDialogOpen(true)
  }

  const showDeleteDialog = (user: Preacher) => {
    setDialogConfig({
      title: "Delete User",
      description: `Are you sure you want to permanently delete ${user.name}? All their data will be removed. This action cannot be undone.`,
      action: () => deleteUser(user.id),
      variant: "delete",
      userName: user.name
    })
    setDialogOpen(true)
  }

  const showRoleChangeDialog = (user: Preacher, newRole: UserRole) => {
    const roleName = newRole === 'admin' ? 'Administrator' : 'Preacher'
    setDialogConfig({
      title: "Change User Role",
      description: `Change ${user.name}'s role to ${roleName}?`,
      action: () => updateUserRole(user.id, newRole),
      variant: "changeRole",
      userName: user.name,
      newRole
    })
    setDialogOpen(true)
  }

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError(null)
        setSuccessMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, successMessage])

  if (userRole !== "admin") {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Access Denied
          </CardTitle>
          <CardDescription>You need administrator privileges to access this page</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your current role: <Badge variant="outline">{userRole || "unknown"}</Badge>
          </p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <CardTitle className="text-lg mb-2">Loading Users</CardTitle>
          <CardDescription>Please wait while we fetch user data...</CardDescription>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Confirmation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogConfig?.variant === "delete" || dialogConfig?.variant === "reject" ? (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              {dialogConfig?.title}
            </DialogTitle>
            <DialogDescription>{dialogConfig?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={processingUser === dialogConfig?.userName}
            >
              Cancel
            </Button>
            <Button
              variant={
                dialogConfig?.variant === "delete" || dialogConfig?.variant === "reject" 
                  ? "destructive" 
                  : "default"
              }
              onClick={() => {
                if (dialogConfig?.action) {
                  dialogConfig.action()
                }
                setDialogOpen(false)
              }}
              disabled={processingUser === dialogConfig?.userName}
            >
              {processingUser === dialogConfig?.userName ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {dialogConfig?.variant === "approve" && <Check className="mr-2 h-4 w-4" />}
                  {dialogConfig?.variant === "reject" && <X className="mr-2 h-4 w-4" />}
                  {dialogConfig?.variant === "delete" && <Trash2 className="mr-2 h-4 w-4" />}
                  {dialogConfig?.variant === "changeRole" && "Change Role"}
                  {!["changeRole", "approve", "reject", "delete"].includes(dialogConfig?.variant || "") && "Confirm"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-8">
        {/* Messages */}
        {error && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6">
              <Alert variant="destructive" className="border-none bg-transparent p-0">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="font-semibold">Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
        
        {successMessage && (
          <Card className="border-green-500/50 bg-green-500/5">
            <CardContent className="pt-6">
              <Alert className="border-none bg-transparent p-0 text-green-600">
                <Check className="h-4 w-4" />
                <AlertTitle className="font-semibold">Success</AlertTitle>
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Pending Users Section */}
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Users className="h-6 w-6" /> Pending Approval
          </h2>
          {pendingUsers.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingUsers.map(user => (
                <Card key={user.id} className="relative overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      {user.name}
                      <Badge variant="outline" className="animate-pulse">
                        Pending
                      </Badge>
                    </CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                    
                  </CardHeader>
                  <CardFooter className="flex justify-between gap-2 pt-2">
                    <Button 
                      size="sm" 
                      onClick={() => showApproveDialog(user)} 
                      disabled={processingUser === user.id}
                      className="flex-1"
                    >
                      {processingUser === user.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Approve as Preacher
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => showRejectDialog(user)} 
                      disabled={processingUser === user.id}
                      className="flex-1"
                    >
                      {processingUser === user.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <X className="h-4 w-4 mr-2" />
                      )}
                      Reject
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed opacity-75">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 mb-4 text-muted-foreground" />
                <CardTitle className="text-lg mb-2 text-muted-foreground">No Pending Approvals</CardTitle>
                <CardDescription>All user requests have been processed</CardDescription>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Approved Users Section */}
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Shield className="h-6 w-6" /> Approved Users
          </h2>
          {preachers.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {preachers.map((preacher) => (
                <Card key={preacher.id} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{preacher.name}</CardTitle>
                        <CardDescription>{preacher.email}</CardDescription>
                      </div>
                      <Badge 
                        variant={preacher.role === "admin" ? "default" : "secondary"}
                        className="ml-2"
                      >
                        {preacher.role === "admin" ? "Administrator" : "Preacher"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Role Assignment</label>
                      <Select
                        value={preacher.role}
                        onValueChange={(value: UserRole) => {
                          showRoleChangeDialog(preacher, value)
                        }}
                        disabled={processingUser === preacher.id}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="da'i">Preacher</SelectItem>
                          <SelectItem value="admin">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-2">
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => showDeleteDialog(preacher)} 
                      disabled={processingUser === preacher.id}
                    >
                      {processingUser === preacher.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Remove User
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed opacity-75">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <UserX className="h-12 w-12 mb-4 text-muted-foreground" />
                <CardTitle className="text-lg mb-2 text-muted-foreground">No Approved Users</CardTitle>
                <CardDescription>No users have been approved yet</CardDescription>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}