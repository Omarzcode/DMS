"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
import { format } from "date-fns"
import { EditBeneficiaryDialog } from "./edit-beneficiary-dialog"
import { TransferBeneficiaryDialog } from "./transfer-beneficiary-dialog"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

// ─── Types ───────────────────────────────────────────────────────

interface AttendanceStats {
  maqari: { attended: number; total: number }
  events: { attended: number; total: number }
  lessons: { attended: number; total: number }
  sections: { attended: number; total: number }
}

interface GroupedAttendance {
  maqari?: AttendanceRecord[]
  events?: AttendanceRecord[]
  lessons?: AttendanceRecord[]
  sections?: AttendanceRecord[]
}

interface BeneficiaryDetailsDialogProps {
  beneficiaryId: string
  children: React.ReactNode
  onUpdate?: () => void
}

// ─── Constants ───────────────────────────────────────────────────

const FIRESTORE_BATCH_LIMIT = 500

// ─── Component ───────────────────────────────────────────────────

export function BeneficiaryDetailsDialog({
  beneficiaryId,
  children,
  onUpdate,
}: BeneficiaryDetailsDialogProps) {
  const { userRole } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null)
  const [preacher, setPreacher] = useState<Preacher | null>(null)
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null)
  const [groupedAttendance, setGroupedAttendance] = useState<GroupedAttendance>({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Use ref to always have latest onUpdate without stale closures
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  // ─── Fetch Data ──────────────────────────────────────────────

  const fetchBeneficiaryData = useCallback(async () => {
    if (!open || !beneficiaryId) return

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
        setLoading(false)
        return
      }

      const beneficiaryData = {
        id: beneficiaryDoc.id,
        ...beneficiaryDoc.data(),
      } as Beneficiary
      setBeneficiary(beneficiaryData)

      // Fetch related data in parallel
      const [
        preacherDoc,
        maqariSnap,
        eventsSnap,
        lessonsSnap,
        sectionsSnap,
        attendanceSnap,
      ] = await Promise.all([
        beneficiaryData.da_i_id
          ? getDoc(doc(db, "preachers", beneficiaryData.da_i_id))
          : Promise.resolve(null),
        getDocs(collection(db, "maqari")),
        getDocs(collection(db, "events")),
        getDocs(collection(db, "lessons")),
        getDocs(collection(db, "sections")),
        getDocs(
          query(
            collection(db, "attendance"),
            where("beneficiary_id", "==", beneficiaryId),
            orderBy("logged_at", "desc")
          )
        ),
      ])

      if (preacherDoc && preacherDoc.exists()) {
        setPreacher(preacherDoc.data() as Preacher)
      }

      const attendanceHistory = attendanceSnap.docs.map(
        (d) => ({ ...d.data(), id: d.id } as AttendanceRecord)
      )

      // Calculate stats
      const stats: AttendanceStats = {
        maqari: {
          total: maqariSnap.size,
          attended: attendanceHistory.filter((r) => r.activity_type === "maqari").length,
        },
        events: {
          total: eventsSnap.size,
          attended: attendanceHistory.filter((r) => r.activity_type === "events").length,
        },
        lessons: {
          total: lessonsSnap.size,
          attended: attendanceHistory.filter((r) => r.activity_type === "lessons").length,
        },
        sections: {
          total: sectionsSnap.size,
          attended: attendanceHistory.filter((r) => r.activity_type === "sections").length,
        },
      }
      setAttendanceStats(stats)

      // Group attendance by type
      const grouped: GroupedAttendance = {}
      attendanceHistory.forEach((rec) => {
        const type = rec.activity_type as keyof GroupedAttendance
        if (!grouped[type]) grouped[type] = []
        grouped[type]?.push(rec)
      })
      setGroupedAttendance(grouped)
    } catch (error) {
      console.error("Error fetching beneficiary details:", error)
      setFetchError("Failed to load beneficiary details. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [open, beneficiaryId])

  useEffect(() => {
    fetchBeneficiaryData()
  }, [fetchBeneficiaryData])

  // ─── Handlers ────────────────────────────────────────────────

  const handleEditComplete = useCallback(() => {
    // Re-fetch data to show updated info without closing dialog
    fetchBeneficiaryData()
    onUpdateRef.current?.()
  }, [fetchBeneficiaryData])

  const handleTransferComplete = useCallback(() => {
    setOpen(false)
    // Small delay to let dialog close animation finish before parent re-fetches
    setTimeout(() => {
      onUpdateRef.current?.()
    }, 150)
  }, [])

  const handleDeleteBeneficiary = useCallback(async () => {
    if (!beneficiary) return

    // Capture values before async operations to avoid stale closures
    const beneficiaryId = beneficiary.id
    const beneficiaryName = beneficiary.name

    setShowDeleteConfirm(false)
    setDeleting(true)

    try {
      // Step 1: Find all attendance records for this beneficiary
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("beneficiary_id", "==", beneficiaryId)
      )
      const attendanceSnapshot = await getDocs(attendanceQuery)

      // Step 2: Delete attendance records in batches (Firestore limit is 500 per batch)
      if (attendanceSnapshot.size > 0) {
        const docs = attendanceSnapshot.docs
        for (let i = 0; i < docs.length; i += FIRESTORE_BATCH_LIMIT) {
          const batch = writeBatch(db)
          const chunk = docs.slice(i, i + FIRESTORE_BATCH_LIMIT)
          chunk.forEach((docSnap) => batch.delete(docSnap.ref))
          await batch.commit()
        }
      }

      // Step 3: Delete the beneficiary document
      await deleteDoc(doc(db, "beneficiaries", beneficiaryId))

      toast.success("Beneficiary deleted", {
        description: `${beneficiaryName} and all related data have been permanently removed.`,
      })

      // Step 4: Close dialog, then notify parent
      setOpen(false)
      setTimeout(() => {
        onUpdateRef.current?.()
      }, 150)
    } catch (error) {
      console.error("Failed to delete beneficiary:", error)
      toast.error("Delete failed", {
        description: "An error occurred while deleting the beneficiary. Please try again.",
      })
      setDeleting(false)
    }
  }, [beneficiary])

  // ─── Sub-components ──────────────────────────────────────────

  const StatItem = ({
    title,
    attended,
    total,
  }: {
    title: string
    attended: number
    total: number
  }) =>
    total > 0 ? (
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          <span className="text-xs font-semibold">
            {attended} / {total}
          </span>
        </div>
        <Progress value={(attended / total) * 100} className="h-2" />
      </div>
    ) : null

  // ─── Render ──────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      // Prevent closing while delete is in progress
      if (deleting && !newOpen) return
      setOpen(newOpen)
    }}>
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

        <div className="flex-1 overflow-y-auto">
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
              <Button variant="outline" onClick={fetchBeneficiaryData}>
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
              {/* Left Column - Details */}
              <div className="space-y-4">
                <h3 className="font-semibold border-b pb-2">
                  Beneficiary Details
                </h3>
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
                    {/* Show message if all totals are 0 */}
                    {attendanceStats.maqari.total === 0 &&
                      attendanceStats.events.total === 0 &&
                      attendanceStats.lessons.total === 0 &&
                      attendanceStats.sections.total === 0 && (
                        <p className="text-xs text-muted-foreground italic">
                          No activities available yet.
                        </p>
                      )}
                  </div>
                )}
              </div>

              {/* Right Column - Attendance History */}
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
              <p className="text-muted-foreground">
                Could not find beneficiary data.
              </p>
            </div>
          )}
        </div>

        {/* Footer - Only show when beneficiary is loaded */}
        {!loading && !fetchError && beneficiary && (
          <DialogFooter className="flex-wrap justify-start gap-2 pt-4 border-t">
            <EditBeneficiaryDialog
              beneficiary={beneficiary}
              onBeneficiaryUpdated={handleEditComplete}
            >
              <Button disabled={deleting}>Edit Details</Button>
            </EditBeneficiaryDialog>

            {userRole === "admin" && (
              <>
                <TransferBeneficiaryDialog
                  beneficiary={beneficiary}
                  onTransferComplete={handleTransferComplete}
                >
                  <Button variant="secondary" disabled={deleting}>
                    Transfer
                  </Button>
                </TransferBeneficiaryDialog>

                <Button
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
                  description={`This action cannot be undone. All data associated with "${beneficiary.name}" will be permanently deleted, including attendance records.`}
                  confirmText="Yes, Delete"
                  cancelText="Cancel"
                />
              </>
            )}

            <Button
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

// ─── Attendance Category Sub-component ─────────────────────────

const AttendanceCategory = ({
  title,
  records,
  icon: Icon,
}: {
  title: string
  records: AttendanceRecord[]
  icon: React.ElementType
}) => (
  <div>
    <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
      <Icon className="h-4 w-4 text-primary" />
      {title}
      <Badge variant="secondary" className="text-[10px] ml-1">
        {records.length}
      </Badge>
    </h4>
    <div className="space-y-1.5 ml-6 border-l-2 border-border pl-3">
      {records.map((att, index) => (
        <div
          key={`${att.id}-${index}`}
          className="text-muted-foreground flex justify-between items-center text-xs hover:text-foreground transition-colors"
        >
          <span className="truncate mr-2">{att.activity_name}</span>
          <span className="flex-shrink-0 text-muted-foreground/70">
            {(att.logged_at as any)?.toDate
              ? format((att.logged_at as any).toDate(), "PP")
              : ""}
          </span>
        </div>
      ))}
    </div>
  </div>
)