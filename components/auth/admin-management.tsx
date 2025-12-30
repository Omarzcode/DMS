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
      setError("فشل في تحميل المستخدمين. الرجاء المحاولة مرة أخرى لاحقًا.")
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

      setSuccessMessage("تم تحديث صلاحية المستخدم بنجاح")
    } catch (err) {
      setError("فشل في تحديث صلاحية المستخدم. الرجاء المحاولة مرة أخرى.")
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

      setSuccessMessage("تم حذف المستخدم بنجاح")
    } catch (err) {
      setError("فشل في حذف المستخدم. الرجاء المحاولة مرة أخرى.")
      fetchUsers() // Refresh on error
    } finally {
      setProcessingUser(null)
    }
  }

  // Dialog handlers
  const showApproveDialog = (user: Preacher) => {
    setDialogConfig({
      title: "الموافقة على المستخدم",
      description: `هل أنت متأكد من أنك تريد الموافقة على ${user.name} كداعية؟`,
      action: () => updateUserRole(user.id, 'da\'i'),
      variant: "approve",
      userName: user.name
    })
    setDialogOpen(true)
  }

  const showRejectDialog = (user: Preacher) => {
    setDialogConfig({
      title: "رفض المستخدم",
      description: `هل أنت متأكد من أنك تريد رفض تسجيل ${user.name}؟ لا يمكن التراجع عن هذا الإجراء.`,
      action: () => deleteUser(user.id),
      variant: "reject",
      userName: user.name
    })
    setDialogOpen(true)
  }

  const showDeleteDialog = (user: Preacher) => {
    setDialogConfig({
      title: "حذف المستخدم",
      description: `هل أنت متأكد من أنك تريد حذف ${user.name} نهائيًا؟ سيتم إزالة جميع بياناته. لا يمكن التراجع عن هذا الإجراء.`,
      action: () => deleteUser(user.id),
      variant: "delete",
      userName: user.name
    })
    setDialogOpen(true)
  }

  const showRoleChangeDialog = (user: Preacher, newRole: UserRole) => {
    const roleName = newRole === 'admin' ? 'مدير' : 'داعية'
    setDialogConfig({
      title: "تغيير صلاحية المستخدم",
      description: `تغيير صلاحية ${user.name} إلى ${roleName}؟`,
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
      <Card className="border-destructive/50 mx-auto max-w-md mt-8">
        <CardHeader className="text-center">
          <CardTitle className="text-destructive flex items-center justify-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5" />
            دخول غير مصرح به
          </CardTitle>
          <CardDescription className="text-right">
            تحتاج إلى صلاحيات المدير للوصول إلى هذه الصفحة
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            صلاحيتك الحالية: <Badge variant="outline" className="mr-2">{userRole || "غير معروف"}</Badge>
          </p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="mx-auto max-w-md mt-8">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <CardTitle className="text-lg mb-2 text-center">جاري تحميل المستخدمين</CardTitle>
          <CardDescription className="text-center">الرجاء الانتظار أثناء جلب بيانات المستخدمين...</CardDescription>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Confirmation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="sm:max-w-md [&>button]:hidden"
          dir="rtl"
        >         
         {/* Exit button moved to LEFT side (top-left in RTL) */}
          <button
            onClick={() => setDialogOpen(false)}
            className="absolute left-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            dir="ltr"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">إغلاق</span>
          </button>

          <DialogHeader className="text-right pt-6">
            <DialogTitle className="flex items-center gap-2 justify-end">
              {dialogConfig?.variant === "delete" || dialogConfig?.variant === "reject" ? (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              {dialogConfig?.title}
            </DialogTitle>
            <DialogDescription className="text-right">{dialogConfig?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 flex flex-row-reverse">
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
              className="ml-2"
            >
              {processingUser === dialogConfig?.userName ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري المعالجة...
                </>
              ) : (
                <>
                  {dialogConfig?.variant === "approve" && <Check className="ml-2 h-4 w-4" />}
                  {dialogConfig?.variant === "reject" && <X className="ml-2 h-4 w-4" />}
                  {dialogConfig?.variant === "delete" && <Trash2 className="ml-2 h-4 w-4" />}
                  {dialogConfig?.variant === "changeRole" && "تغيير الصلاحية"}
                  {!["changeRole", "approve", "reject", "delete"].includes(dialogConfig?.variant || "") && "تأكيد"}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={processingUser === dialogConfig?.userName}
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-8 p-4 md:p-6" dir="rtl">
        {/* Messages */}
        {error && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6">
              <Alert variant="destructive" className="border-none bg-transparent p-0 text-right">
                <AlertCircle className="h-4 w-4 ml-2" />
                <div className="flex-1">
                  <AlertTitle className="font-semibold">خطأ</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </div>
              </Alert>
            </CardContent>
          </Card>
        )}

        {successMessage && (
          <Card className="border-green-500/50 bg-green-500/5">
            <CardContent className="pt-6">
              <Alert className="border-none bg-transparent p-0 text-green-600 text-right">
                <Check className="h-4 w-4 ml-2" />
                <div className="flex-1">
                  <AlertTitle className="font-semibold">نجاح</AlertTitle>
                  <AlertDescription>{successMessage}</AlertDescription>
                </div>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Pending Users Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 justify-end">
            <Users className="h-6 w-6" /> المستخدمين المنتظرين الموافقة
          </h2>
          {pendingUsers.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingUsers.map(user => (
                <Card key={user.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="animate-pulse bg-yellow-50 text-yellow-700 border-yellow-200">
                        في الانتظار
                      </Badge>
                      <CardTitle className="text-lg text-left">{user.name}</CardTitle>
                    </div>
                    <CardDescription className="text-right text-muted-foreground">{user.email}</CardDescription>
                    {user.created_at && (
                      <p className="text-xs text-muted-foreground text-right mt-2">
                        تاريخ الطلب: {new Date(user.created_at).toLocaleDateString('ar-EG')}
                      </p>
                    )}
                  </CardHeader>
                  <CardFooter className="flex flex-col gap-3 pt-3 border-t">
                    <div className="flex gap-2 w-full">
                      <Button
                        size="sm"
                        onClick={() => showApproveDialog(user)}
                        disabled={processingUser === user.id}
                        className="flex-1"
                      >
                        {processingUser === user.id ? (
                          <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 ml-2" />
                        )}
                        الموافقة كداعية
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => showRejectDialog(user)}
                        disabled={processingUser === user.id}
                        className="flex-1"
                      >
                        {processingUser === user.id ? (
                          <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                        ) : (
                          <X className="h-4 w-4 ml-2" />
                        )}
                        رفض
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed opacity-75">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 mb-4 text-muted-foreground" />
                <CardTitle className="text-lg mb-2 text-muted-foreground text-center">لا توجد طلبات انتظار</CardTitle>
                <CardDescription className="text-center">تمت معالجة جميع طلبات التسجيل</CardDescription>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Approved Users Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 justify-end">
            <Shield className="h-6 w-6" /> المستخدمين المعتمدين
          </h2>
          {preachers.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {preachers.map((preacher) => (
                <Card key={preacher.id} className="relative hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <CardTitle className="text-lg text-right">{preacher.name}</CardTitle>
                        <CardDescription className="text-right text-muted-foreground mt-1">{preacher.email}</CardDescription>
                      </div>
                      <Badge
                        variant={preacher.role === "admin" ? "default" : "secondary"}
                        className="whitespace-nowrap"
                      >
                        {preacher.role === "admin" ? "مدير" : "داعية"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-right block">تغيير الصلاحية</label>
                      <div className="flex items-center gap-2 justify-end">
                        <Select
                          value={preacher.role}
                          onValueChange={(value: UserRole) => {
                            showRoleChangeDialog(preacher, value)
                          }}
                          disabled={processingUser === preacher.id}
                        >
                          <SelectTrigger className="w-full text-right" dir="rtl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent dir="rtl">
                            <SelectItem value="da'i">داعية</SelectItem>
                            <SelectItem value="admin">مدير</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-4 border-t">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => showDeleteDialog(preacher)}
                      disabled={processingUser === preacher.id}
                      className="w-full"
                    >
                      {processingUser === preacher.id ? (
                        <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 ml-2" />
                      )}
                      حذف المستخدم
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed opacity-75">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <UserX className="h-12 w-12 mb-4 text-muted-foreground" />
                <CardTitle className="text-lg mb-2 text-muted-foreground text-center">لا يوجد مستخدمين معتمدين</CardTitle>
                <CardDescription className="text-center">لم يتم الموافقة على أي مستخدمين بعد</CardDescription>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}