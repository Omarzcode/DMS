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
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Loader2,
  Users,
  Shield,
  Trash2,
  AlertCircle,
  Check,
  X,
  UserX,
  AlertTriangle,
  UserCog,
  Clock,
  ShieldCheck,
  RefreshCw,
  Mail,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import Image from "next/image"
/* ── Reusable Section Header ── */
function SectionHeader({
  icon: Icon,
  title,
  description,
  count,
  countVariant = "default",
}: {
  icon: React.ElementType
  title: string
  description: string
  count?: number
  countVariant?: "default" | "warning" | "success"
}) {
  const countColors = {
    default: "bg-primary/10 text-primary border-primary/20",
    warning: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    success: "bg-green-500/10 text-green-600 border-green-500/20",
  }

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {count !== undefined && (
        <Badge variant="outline" className={`text-sm px-3 py-1 font-medium ${countColors[countVariant]}`}>
          {count} {count === 1 ? "user" : "users"}
        </Badge>
      )}
    </div>
  )
}

/* ── Stat Card ── */
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: string
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export function AdminManagement() {
  const { userRole } = useAuth()
  const [preachers, setPreachers] = useState<Preacher[]>([])
  const [pendingUsers, setPendingUsers] = useState<Preacher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingUser, setProcessingUser] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

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

      setPreachers(usersData.filter((u) => u.role === "admin" || u.role === "da'i"))
      setPendingUsers(usersData.filter((u) => u.role === "pending"))
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

      if (newRole === "pending") {
        setPreachers((prev) => prev.filter((user) => user.id !== userId))
        setPendingUsers((prev) => {
          const updatedUser = preachers.find((u) => u.id === userId)
          return updatedUser ? [...prev, { ...updatedUser, role: newRole }] : prev
        })
      } else {
        setPendingUsers((prev) => prev.filter((user) => user.id !== userId))
        setPreachers((prev) => {
          const existingUser = prev.find((u) => u.id === userId)
          if (existingUser) {
            return prev.map((user) => (user.id === userId ? { ...user, role: newRole } : user))
          }
          const pendingUser = pendingUsers.find((u) => u.id === userId)
          return pendingUser ? [...prev, { ...pendingUser, role: newRole }] : prev
        })
      }

      setSuccessMessage("User role updated successfully")
    } catch (err) {
      setError("Failed to update user role. Please try again.")
      fetchUsers()
    } finally {
      setProcessingUser(null)
    }
  }

  const deleteUser = async (userId: string) => {
    try {
      setProcessingUser(userId)
      setError(null)
      await deleteDoc(doc(db, "preachers", userId))

      setPreachers((prev) => prev.filter((user) => user.id !== userId))
      setPendingUsers((prev) => prev.filter((user) => user.id !== userId))

      setSuccessMessage("User deleted successfully")
    } catch (err) {
      setError("Failed to delete user. Please try again.")
      fetchUsers()
    } finally {
      setProcessingUser(null)
    }
  }

  const showApproveDialog = (user: Preacher) => {
    setDialogConfig({
      title: "Approve User",
      description: `Are you sure you want to approve ${user.name} as a Preacher?`,
      action: () => updateUserRole(user.id, "da'i"),
      variant: "approve",
      userName: user.name,
    })
    setDialogOpen(true)
  }

  const showRejectDialog = (user: Preacher) => {
    setDialogConfig({
      title: "Reject User",
      description: `Are you sure you want to reject ${user.name}'s registration? This action cannot be undone.`,
      action: () => deleteUser(user.id),
      variant: "reject",
      userName: user.name,
    })
    setDialogOpen(true)
  }

  const showDeleteDialog = (user: Preacher) => {
    setDialogConfig({
      title: "Delete User",
      description: `Are you sure you want to permanently delete ${user.name}? All their data will be removed. This action cannot be undone.`,
      action: () => deleteUser(user.id),
      variant: "delete",
      userName: user.name,
    })
    setDialogOpen(true)
  }

  const showRoleChangeDialog = (user: Preacher, newRole: UserRole) => {
    const roleName = newRole === "admin" ? "Administrator" : "Preacher"
    setDialogConfig({
      title: "Change User Role",
      description: `Change ${user.name}'s role to ${roleName}?`,
      action: () => updateUserRole(user.id, newRole),
      variant: "changeRole",
      userName: user.name,
      newRole,
    })
    setDialogOpen(true)
  }

  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError(null)
        setSuccessMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, successMessage])

  // ── Access Denied ──
  if (userRole !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <Card className="border-destructive/30 max-w-md w-full shadow-sm">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-destructive text-xl">Access Denied</CardTitle>
            <CardDescription className="text-base">
              You need administrator privileges to access this page
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center pb-6">
            <p className="text-sm text-muted-foreground">
              Your current role:{" "}
              <Badge variant="outline" className="ml-2">
                {userRole || "unknown"}
              </Badge>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Loading ──
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

  const adminCount = preachers.filter((p) => p.role === "admin").length
  const preacherCount = preachers.filter((p) => p.role === "da'i").length

  return (
    <>
      {/* ── Confirmation Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md [&>button]:hidden">
          <DialogHeader className="pr-2">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  dialogConfig?.variant === "delete" || dialogConfig?.variant === "reject"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {dialogConfig?.variant === "delete" || dialogConfig?.variant === "reject" ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : dialogConfig?.variant === "approve" ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <UserCog className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <DialogTitle className="text-lg font-semibold">{dialogConfig?.title}</DialogTitle>
                <DialogDescription className="text-sm leading-relaxed">
                  {dialogConfig?.description}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={processingUser === dialogConfig?.userName}
              className="flex-1 sm:flex-none order-2 sm:order-1"
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
              className="flex-1 order-1 sm:order-2"
            >
              {processingUser === dialogConfig?.userName ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {dialogConfig?.variant === "approve" && (
                    <>
                      <Check className="ml-2 h-4 w-4" /> Approve
                    </>
                  )}
                  {dialogConfig?.variant === "reject" && (
                    <>
                      <X className="ml-2 h-4 w-4" /> Reject
                    </>
                  )}
                  {dialogConfig?.variant === "delete" && (
                    <>
                      <Trash2 className="ml-2 h-4 w-4" /> Delete
                    </>
                  )}
                  {dialogConfig?.variant === "changeRole" && (
                    <>
                      <UserCog className="ml-2 h-4 w-4" /> Change Role
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Main Content ── */}
      <div className="flex flex-col gap-8 p-6 max-w-[1400px] mx-auto w-full">
        {/* ── Page Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 shadow-sm">
              <UserCog className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">User Management</h1>
              <p className="text-sm text-muted-foreground">
                Manage user accounts, roles, and approval requests
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading} className="gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* ── Notifications ── */}
        {error && (
          <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">Error</p>
                <p className="text-sm text-destructive/80">{error}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUsers}
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {successMessage && (
          <Card className="border-green-500/30 bg-green-500/5 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                <Check className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-green-600">Success</p>
                <p className="text-sm text-green-600/80">{successMessage}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Overview Stats ── */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              icon={Clock}
              label="Pending Approval"
              value={pendingUsers.length}
              color="bg-yellow-500/10 text-yellow-600"
            />
            <StatCard
              icon={Users}
              label="Active Preachers"
              value={preacherCount}
              color="bg-blue-500/10 text-blue-600"
            />
            <StatCard
              icon={ShieldCheck}
              label="Administrators"
              value={adminCount}
              color="bg-primary/10 text-primary"
            />
          </div>
        </section>

        <Separator className="bg-border/60" />

        {/* ── Section: Pending Approval ── */}
        <section>
          <SectionHeader
            icon={Clock}
            title="Pending Approval"
            description="Users waiting for account verification and role assignment"
            count={pendingUsers.length}
            countVariant="warning"
          />

          {pendingUsers.length > 0 ? (
            <div className="flex flex-col gap-4">
              {pendingUsers.map((user) => (
                <Card
                  key={user.id}
                  className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-yellow-500"
                >
                  <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-yellow-500/10">
                        <Users className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{user.name}</p>
                          <Badge
                            variant="outline"
                            className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs"
                          >
                            Pending
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <Mail className="h-3.5 w-3.5" />
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        size="sm"
                        onClick={() => showApproveDialog(user)}
                        disabled={processingUser === user.id}
                        className="flex-1 sm:flex-none gap-2"
                      >
                        {processingUser === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => showRejectDialog(user)}
                        disabled={processingUser === user.id}
                        className="flex-1 sm:flex-none gap-2"
                      >
                        {processingUser === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed shadow-none">
              <CardContent className="flex flex-col items-center justify-center py-14">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50 mb-4">
                  <Check className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-base font-medium text-muted-foreground mb-1">No Pending Approvals</p>
                <p className="text-sm text-muted-foreground/70">
                  All registration requests have been processed
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        <Separator className="bg-border/60" />

        {/* ── Section: Approved Users ── */}
        <section className="pb-6">
          <SectionHeader
            icon={ShieldCheck}
            title="Approved Users"
            description="Active users with assigned roles and permissions"
            count={preachers.length}
            countVariant="success"
          />

          {preachers.length > 0 ? (
            <div className="flex flex-col gap-4">
              {preachers.map((preacher) => (
                <Card
                  key={preacher.id}
                  className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-primary"
                >
                  <CardContent className="p-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                      {/* User Info */}
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          {preacher.role === "admin" ? (
                            <Shield className="h-5 w-5 text-primary" />
                          ) : (
                            <Users className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground">{preacher.name}</p>
                            <Badge
                              variant={preacher.role === "admin" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {preacher.role === "admin" ? "Administrator" : "Preacher"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <Mail className="h-3.5 w-3.5" />
                            {preacher.email}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3 w-full lg:w-auto">
                        <div className="flex-1 lg:w-48">
                          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                            Role Assignment
                          </label>
                          <Select
                            value={preacher.role}
                            onValueChange={(value: UserRole) => {
                              showRoleChangeDialog(preacher, value)
                            }}
                            disabled={processingUser === preacher.id}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="da'i">Preacher</SelectItem>
                              <SelectItem value="admin">Administrator</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="pt-5">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => showDeleteDialog(preacher)}
                            disabled={processingUser === preacher.id}
                            className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                          >
                            {processingUser === preacher.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed shadow-none">
              <CardContent className="flex flex-col items-center justify-center py-14">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50 mb-4">
                  <UserX className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-base font-medium text-muted-foreground mb-1">No Approved Users</p>
                <p className="text-sm text-muted-foreground/70">No users have been approved yet</p>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </>
  )
}
