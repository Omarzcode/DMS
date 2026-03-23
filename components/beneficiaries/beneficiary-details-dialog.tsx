"use client"

import { useState, useEffect, useCallback, useRef, ElementType } from "react"
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  writeBatch,
  deleteDoc,
  getCountFromServer,   // Fix 2
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Loader2,
  Phone,
  Layers,
  BarChart,
  StickyNote,
  CalendarCheck,
  BookOpen,
  Calendar as CalendarIcon,
  Activity as ActivityIcon,
  Users as UsersIcon,
  Trash2,
  AlertTriangle,
} from "lucide-react"
import type {
  Beneficiary,
  AttendanceRecord,
  Preacher,
} from "@/lib/firestore-collections"
import { Timestamp } from "firebase/firestore"
import { format } from "date-fns"
import { EditBeneficiaryDialog } from "./edit-beneficiary-dialog"
import { TransferBeneficiaryDialog } from "./transfer-beneficiary-dialog"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

// ─── Types ───────────────────────────────────────────────────────

interface AttendanceStats {
  maqari:   { attended: number; total: number }
  events:   { attended: number; total: number }
  lessons:  { attended: number; total: number }
  sections: { attended: number; total: number }
}

interface GroupedAttendance {
  maqari?:   AttendanceRecord[]
  events?:   AttendanceRecord[]
  lessons?:  AttendanceRecord[]
  sections?: AttendanceRecord[]
}

interface BeneficiaryDetailsDialogProps {
  beneficiaryId: string
  children: React.ReactNode
  onUpdate?: () => void
}

// ─── Constants ───────────────────────────────────────────────────

const FIRESTORE_BATCH_LIMIT = 500

// ─── Fix 15: Type-safe logged_at formatter ────────────────────────

function formatLoggedAt(logged_at: Timestamp | Date | unknown): string {
  if (!logged_at) return ""
  // Firestore Timestamp
  if (logged_at instanceof Timestamp) return format(logged_at.toDate(), "PP")
  // Plain JS Date
  if (logged_at instanceof Date) return format(logged_at, "PP")
  // Firestore Timestamp-like (from serialized data)
  if (typeof logged_at === "object" && "toDate" in (logged_at as object)) {
    return format((logged_at as Timestamp).toDate(), "PP")
  }
  return ""
}

// ─── Fix 1: StatItem moved outside component ─────────────────────

const StatItem = ({
  title,
  attended,
  total,
}: {
  title: string
  attended: number
  total: number
}) => {
  if (total === 0) return null
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <span className="text-xs font-semibold">
          {attended} / {total}
        </span>
      </div>
      <Progress value={(attended / total) * 100} className="h-2" />
    </div>
  )
}

// ─── Fix 10: AttendanceCategory uses ElementType (not React.ElementType) ──

const AttendanceCategory = ({
  title,
  records,
  icon: Icon,
}: {
  title: string
  records: AttendanceRecord[]
  icon: ElementType
}) => (
  <div>
    <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
      <Icon className="h-4 w-4 text-primary" />
      {title}
      <Badge variant="secondary" className="text-[10px] mr-1">
        {records.length}
      </Badge>
    </h4>
    <div className="space-y-1.5 mr-6 border-r-2 border-border pr-3">
      {records.map((att) => (
        // Fix 8: Use att.id alone — it's a unique Firestore doc ID
        <div
          key={att.id}
          className="text-muted-foreground flex justify-between items-center text-xs hover:text-foreground transition-colors"
        >
          <span className="truncate ml-2">{att.activity_name}</span>
          {/* Fix 15: Use type-safe formatter */}
          <span className="flex-shrink-0 text-muted-foreground/70">
            {formatLoggedAt(att.logged_at)}
          </span>
        </div>
      ))}
    </div>
  </div>
)

// ─── Component ───────────────────────────────────────────────────

export function BeneficiaryDetailsDialog({
  beneficiaryId,
  children,
  onUpdate,
}: BeneficiaryDetailsDialogProps) {
  const { userRole }  = useAuth()
  const [open, setOpen]                           = useState(false)
  const [loading, setLoading]                     = useState(false)
  const [deleting, setDeleting]                   = useState(false)
  const [beneficiary, setBeneficiary]             = useState<Beneficiary | null>(null)
  const [preacher, setPreacher]                   = useState<Preacher | null>(null)
  const [attendanceStats, setAttendanceStats]     = useState<AttendanceStats | null>(null)
  const [groupedAttendance, setGroupedAttendance] = useState<GroupedAttendance>({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [fetchError, setFetchError]               = useState<string | null>(null)

  // Stable ref so callbacks never go stale
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  // ─── Fetch Data ──────────────────────────────────────────────

  // Fix 7: fetchBeneficiaryData only depends on beneficiaryId.
  // The `open` guard lives in the useEffect, not inside the callback,
  // so the function stays stable and can be called manually (e.g. after edit).
  const fetchBeneficiaryData = useCallback(async () => {
    if (!beneficiaryId) return

    setLoading(true)
    setFetchError(null)
    setBeneficiary(null)
    setPreacher(null)
    setAttendanceStats(null)
    setGroupedAttendance({})

    try {
      const beneficiaryDoc = await getDoc(doc(db, "beneficiaries", beneficiaryId))

      if (!beneficiaryDoc.exists()) {
        setFetchError("Beneficiary not found. They may have been deleted.")
        return
      }

      const beneficiaryData = {
        id: beneficiaryDoc.id,
        ...beneficiaryDoc.data(),
      } as Beneficiary
      setBeneficiary(beneficiaryData)

      // Fix 2: Use getCountFromServer instead of fetching all documents
      // Fix 4: Fetch attendance first, derive totals from actual records
      const [
        preacherDoc,
        maqariCount,
        eventsCount,
        lessonsCount,
        sectionsCount,
        attendanceSnap,
      ] = await Promise.all([
        beneficiaryData.da_i_id
          ? getDoc(doc(db, "preachers", beneficiaryData.da_i_id))
          : Promise.resolve(null),
        getCountFromServer(collection(db, "maqari")),
        getCountFromServer(collection(db, "events")),
        getCountFromServer(collection(db, "lessons")),
        getCountFromServer(collection(db, "sections")),
        getDocs(
          query(
            collection(db, "attendance"),
            where("beneficiary_id", "==", beneficiaryId),
            orderBy("logged_at", "desc")
          )
        ),
      ])

      if (preacherDoc?.exists()) {
        setPreacher({ id: preacherDoc.id, ...preacherDoc.data() } as Preacher)
      }

      const attendanceHistory = attendanceSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as AttendanceRecord)
      )

      // Fix 2: Use .data().count from getCountFromServer
      const stats: AttendanceStats = {
        maqari: {
          total:    maqariCount.data().count,
          attended: attendanceHistory.filter((r) => r.activity_type === "maqari").length,
        },
        events: {
          total:    eventsCount.data().count,
          attended: attendanceHistory.filter((r) => r.activity_type === "events").length,
        },
        lessons: {
          total:    lessonsCount.data().count,
          attended: attendanceHistory.filter((r) => r.activity_type === "lessons").length,
        },
        sections: {
          total:    sectionsCount.data().count,
          attended: attendanceHistory.filter((r) => r.activity_type === "sections").length,
        },
      }
      setAttendanceStats(stats)

      // Group attendance by type
      // Fix 14: Remove unnecessary optional chain on push
      const grouped: GroupedAttendance = {}
      for (const rec of attendanceHistory) {
        const type = rec.activity_type as keyof GroupedAttendance
        if (!grouped[type]) grouped[type] = []
        grouped[type]!.push(rec)
      }
      setGroupedAttendance(grouped)
    } catch (err) {
      console.error("Error fetching beneficiary details:", err)
      setFetchError("Failed to load beneficiary details. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [beneficiaryId]) // Fix 7: removed `open` from deps

  // Fix 7: open guard lives here, not inside the callback
  useEffect(() => {
    if (open) fetchBeneficiaryData()
  }, [open, fetchBeneficiaryData])

  // ─── Handlers ────────────────────────────────────────────────

  const handleEditComplete = useCallback((updatedBeneficiary: Beneficiary) => {
    // Update local state directly — no need to re-fetch everything
    setBeneficiary(updatedBeneficiary)
    onUpdateRef.current?.()
  }, [])

  // Fix 9: Use a ref-based callback instead of hardcoded setTimeout
  const handleTransferComplete = useCallback(() => {
    setOpen(false)
    // requestAnimationFrame waits for paint — more reliable than arbitrary 150ms
    requestAnimationFrame(() => {
      onUpdateRef.current?.()
    })
  }, [])

  const handleDeleteBeneficiary = useCallback(async () => {
    if (!beneficiary) return

    // Fix 12: Rename local variable to avoid shadowing the prop `beneficiaryId`
    const targetId   = beneficiary.id
    const targetName = beneficiary.name

    setShowDeleteConfirm(false)
    setDeleting(true)

    try {
      // Step 1: Delete attendance records in batches
      const attendanceSnap = await getDocs(
        query(collection(db, "attendance"), where("beneficiary_id", "==", targetId))
      )

      if (attendanceSnap.size > 0) {
        const docs = attendanceSnap.docs
        for (let i = 0; i < docs.length; i += FIRESTORE_BATCH_LIMIT) {
          const batch = writeBatch(db)
          docs.slice(i, i + FIRESTORE_BATCH_LIMIT).forEach((d) => batch.delete(d.ref))
          await batch.commit()
        }
      }

      // Fix 6: Delete progress_logs subcollection
      const progressLogsSnap = await getDocs(
        collection(db, "beneficiaries", targetId, "progress_logs")
      )
      if (progressLogsSnap.size > 0) {
        const docs = progressLogsSnap.docs
        for (let i = 0; i < docs.length; i += FIRESTORE_BATCH_LIMIT) {
          const batch = writeBatch(db)
          docs.slice(i, i + FIRESTORE_BATCH_LIMIT).forEach((d) => batch.delete(d.ref))
          await batch.commit()
        }
      }

      // Step 3: Delete the beneficiary document itself
      await deleteDoc(doc(db, "beneficiaries", targetId))

      toast.success("Beneficiary deleted", {
        description: `${targetName} and all related data have been permanently removed.`,
      })

      // Fix 3: Reset deleting before closing
      setDeleting(false)
      setOpen(false)

      requestAnimationFrame(() => {
        onUpdateRef.current?.()
      })
    } catch (err) {
      console.error("Failed to delete beneficiary:", err)
      toast.error("Delete failed", {
        description: "An error occurred while deleting. Please try again.",
      })
      // finally handles this — but explicit here for clarity in the success path too
      setDeleting(false)
    }
  }, [beneficiary])

  // ─── Render ──────────────────────────────────────────────────

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (deleting && !newOpen) return  // Block close while deleting
        setOpen(newOpen)
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {loading
              ? "Loading..."
              : beneficiary?.name || "Beneficiary Not Found"}
          </DialogTitle>
          <DialogDescription>
            {beneficiary
              ? `Assigned to: ${preacher?.name || "Unassigned"}`
              : "Details about the beneficiary will appear here."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto relative">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Error State */}
          {!loading && fetchError && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-muted-foreground mb-4">{fetchError}</p>
              <Button type="button" variant="outline" onClick={fetchBeneficiaryData}>
                Try Again
              </Button>
            </div>
          )}

          {/* Deleting Overlay */}
          {deleting && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-destructive" />
              <p className="text-sm text-muted-foreground">
                Deleting beneficiary and related data...
              </p>
            </div>
          )}

          {/* Content */}
          {!loading && !fetchError && beneficiary && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              {/* Left Column */}
              <div className="space-y-4">
                <h3 className="font-semibold border-b pb-2">Beneficiary Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span dir="ltr">{beneficiary.phone}</span>
                  </div>
                  {beneficiary.batch && (
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <Badge variant="outline">{beneficiary.batch}</Badge>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <BarChart className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Badge>{beneficiary.da_wa_stage}</Badge>
                  </div>
                </div>

                {beneficiary.notes && (
                  <div className="flex items-start gap-2 pt-2">
                    <StickyNote className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <p className="text-sm text-muted-foreground bg-muted p-2 rounded-md flex-1">
                      {beneficiary.notes}
                    </p>
                  </div>
                )}

                {attendanceStats && (
                  <div className="space-y-3 pt-4 border-t">
                    <h3 className="font-semibold">Quick Stats</h3>
                    <StatItem
                      title="Maqari"
                      attended={attendanceStats.maqari.attended}
                      total={attendanceStats.maqari.total}
                    />
                    <StatItem
                      title="Events"
                      attended={attendanceStats.events.attended}
                      total={attendanceStats.events.total}
                    />
                    <StatItem
                      title="Lessons"
                      attended={attendanceStats.lessons.attended}
                      total={attendanceStats.lessons.total}
                    />
                    <StatItem
                      title="Sections"
                      attended={attendanceStats.sections.attended}
                      total={attendanceStats.sections.total}
                    />
                    {/* Fix 11: Clearer empty state message */}
                    {attendanceStats.maqari.total   === 0 &&
                     attendanceStats.events.total   === 0 &&
                     attendanceStats.lessons.total  === 0 &&
                     attendanceStats.sections.total === 0 && (
                      <p className="text-xs text-muted-foreground italic">
                        No activities have been created in the system yet.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column — Attendance History */}
              <div className="space-y-4">
                <h3 className="font-semibold border-b pb-2 flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5" />
                  Attendance History
                </h3>
                <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
                  {Object.keys(groupedAttendance).length > 0 ? (
                    <>
                      {groupedAttendance.maqari && (
                        <AttendanceCategory
                          title="Maqari"
                          records={groupedAttendance.maqari}
                          icon={BookOpen}
                        />
                      )}
                      {groupedAttendance.events && (
                        <AttendanceCategory
                          title="Events"
                          records={groupedAttendance.events}
                          icon={CalendarIcon}
                        />
                      )}
                      {groupedAttendance.lessons && (
                        <AttendanceCategory
                          title="Lessons"
                          records={groupedAttendance.lessons}
                          icon={ActivityIcon}
                        />
                      )}
                      {groupedAttendance.sections && (
                        <AttendanceCategory
                          title="Sections"
                          records={groupedAttendance.sections}
                          icon={UsersIcon}
                        />
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <CalendarCheck className="h-10 w-10 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        No attendance records found.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Not Found State */}
          {!loading && !fetchError && !beneficiary && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <UsersIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Could not find beneficiary data.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !fetchError && beneficiary && (
          <DialogFooter className="flex-wrap justify-start gap-2 pt-4 border-t">
            <EditBeneficiaryDialog
              beneficiary={beneficiary}
              onBeneficiaryUpdated={handleEditComplete}
            >
              {/* Fix 16: type="button" on all footer buttons */}
              <Button type="button" disabled={deleting}>
                Edit Details
              </Button>
            </EditBeneficiaryDialog>

            {/* {userRole === "admin" && ()} */}
              <>
                <TransferBeneficiaryDialog
                  beneficiary={beneficiary}
                  onTransferComplete={handleTransferComplete}
                >
                  <Button type="button" variant="secondary" disabled={deleting}>
                    Transfer
                  </Button>
                </TransferBeneficiaryDialog>

                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleting}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Beneficiary
                </Button>

                <ConfirmDialog
                  open={showDeleteConfirm}
                  onOpenChange={setShowDeleteConfirm}
                  onConfirm={handleDeleteBeneficiary}
                  title="Are you sure you want to delete this beneficiary?"
                  description={`This action cannot be undone. All data associated with "${beneficiary.name}" will be permanently deleted, including attendance records and progress logs.`}
                  confirmText="Yes, Delete"
                  cancelText="Cancel"
                />
              </>
            

            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={deleting}
            >
              Close
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}