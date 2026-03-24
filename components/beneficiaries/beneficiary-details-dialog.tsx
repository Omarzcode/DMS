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
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  getCountFromServer,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog"
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
  Archive,
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
import { DialogFooter } from "../ui/dialog"

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

// ─── Helpers ─────────────────────────────────────────────────────

function formatLoggedAt(logged_at: Timestamp | Date | unknown): string {
  if (!logged_at) return ""
  if (logged_at instanceof Timestamp) return format(logged_at.toDate(), "PP")
  if (logged_at instanceof Date)      return format(logged_at, "PP")
  if (typeof logged_at === "object" && "toDate" in (logged_at as object)) {
    return format((logged_at as Timestamp).toDate(), "PP")
  }
  return ""
}

// ─── Sub-components ──────────────────────────────────────────────

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
        <div
          key={att.id}
          className="text-muted-foreground flex justify-between items-center
                     text-xs hover:text-foreground transition-colors"
        >
          <span className="truncate ml-2">{att.activity_name}</span>
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
  const { userRole } = useAuth()

  const [open, setOpen]                             = useState(false)
  const [loading, setLoading]                       = useState(false)
  const [busy, setBusy]                             = useState(false)
  const [busyLabel, setBusyLabel]                   = useState("")
  const [beneficiary, setBeneficiary]               = useState<Beneficiary | null>(null)
  const [preacher, setPreacher]                     = useState<Preacher | null>(null)
  const [attendanceStats, setAttendanceStats]       = useState<AttendanceStats | null>(null)
  const [groupedAttendance, setGroupedAttendance]   = useState<GroupedAttendance>({})
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm]   = useState(false)
  const [fetchError, setFetchError]                 = useState<string | null>(null)

  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  // ─── Fetch ────────────────────────────────────────────────────

  const fetchBeneficiaryData = useCallback(async () => {
    if (!beneficiaryId) return

    setLoading(true)
    setFetchError(null)
    setBeneficiary(null)
    setPreacher(null)
    setAttendanceStats(null)
    setGroupedAttendance({})

    try {
      const beneficiaryDoc = await getDoc(
        doc(db, "beneficiaries", beneficiaryId)
      )

      if (!beneficiaryDoc.exists()) {
        setFetchError(
          "Beneficiary not found. They may have been archived or deleted."
        )
        return
      }

      const beneficiaryData = {
        id: beneficiaryDoc.id,
        ...beneficiaryDoc.data(),
      } as Beneficiary
      setBeneficiary(beneficiaryData)

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
        setPreacher({
          id: preacherDoc.id,
          ...preacherDoc.data(),
        } as Preacher)
      }

      const attendanceHistory = attendanceSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as AttendanceRecord)
      )

      setAttendanceStats({
        maqari:   { total: maqariCount.data().count,   attended: attendanceHistory.filter((r) => r.activity_type === "maqari").length   },
        events:   { total: eventsCount.data().count,   attended: attendanceHistory.filter((r) => r.activity_type === "events").length   },
        lessons:  { total: lessonsCount.data().count,  attended: attendanceHistory.filter((r) => r.activity_type === "lessons").length  },
        sections: { total: sectionsCount.data().count, attended: attendanceHistory.filter((r) => r.activity_type === "sections").length },
      })

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
  }, [beneficiaryId])

  useEffect(() => {
    if (open) fetchBeneficiaryData()
  }, [open, fetchBeneficiaryData])

  // ─── Handlers ────────────────────────────────────────────────

  const handleEditComplete = useCallback((updated: Beneficiary) => {
    setBeneficiary(updated)
    onUpdateRef.current?.()
  }, [])

  const handleTransferComplete = useCallback(() => {
    setOpen(false)
    requestAnimationFrame(() => onUpdateRef.current?.())
  }, [])

  // ── Soft delete (archive) ──────────────────────────────────────

  const handleArchive = useCallback(async () => {
    if (!beneficiary) return
    setShowArchiveConfirm(false)
    setBusy(true)
    setBusyLabel("Archiving beneficiary…")

    try {
      await updateDoc(doc(db, "beneficiaries", beneficiary.id), {
        deleted:   true,
        deletedAt: serverTimestamp(),
      })

      toast.success("Beneficiary archived", {
        description: `"${beneficiary.name}" has been archived and can be restored later.`,
      })

      setBusy(false)
      setOpen(false)
      requestAnimationFrame(() => onUpdateRef.current?.())
    } catch (err) {
      console.error("Failed to archive beneficiary:", err)
      toast.error("Archive failed", {
        description: "An error occurred. Please try again.",
      })
      setBusy(false)
    }
  }, [beneficiary])

  // ── Hard delete (admin only) ───────────────────────────────────

  const handlePermanentDelete = useCallback(async () => {
    if (!beneficiary) return
    const targetId   = beneficiary.id
    const targetName = beneficiary.name

    setShowDeleteConfirm(false)
    setBusy(true)
    setBusyLabel("Permanently deleting beneficiary…")

    try {
      // 1 — attendance records
      const attendanceSnap = await getDocs(
        query(
          collection(db, "attendance"),
          where("beneficiary_id", "==", targetId)
        )
      )
      if (attendanceSnap.size > 0) {
        const docs = attendanceSnap.docs
        for (let i = 0; i < docs.length; i += FIRESTORE_BATCH_LIMIT) {
          const batch = writeBatch(db)
          docs
            .slice(i, i + FIRESTORE_BATCH_LIMIT)
            .forEach((d) => batch.delete(d.ref))
          await batch.commit()
        }
      }

      // 2 — progress_logs subcollection
      const logsSnap = await getDocs(
        collection(db, "beneficiaries", targetId, "progress_logs")
      )
      if (logsSnap.size > 0) {
        const docs = logsSnap.docs
        for (let i = 0; i < docs.length; i += FIRESTORE_BATCH_LIMIT) {
          const batch = writeBatch(db)
          docs
            .slice(i, i + FIRESTORE_BATCH_LIMIT)
            .forEach((d) => batch.delete(d.ref))
          await batch.commit()
        }
      }

      // 3 — beneficiary document
      await deleteDoc(doc(db, "beneficiaries", targetId))

      toast.success("Beneficiary permanently deleted", {
        description: `"${targetName}" and all related data have been removed.`,
      })

      setBusy(false)
      setOpen(false)
      requestAnimationFrame(() => onUpdateRef.current?.())
    } catch (err) {
      console.error("Failed to delete beneficiary:", err)
      toast.error("Delete failed", {
        description: "An error occurred. Please try again.",
      })
      setBusy(false)
    }
  }, [beneficiary])

  // ─── Render ──────────────────────────────────────────────────

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (busy && !next) return
        setOpen(next)
      }}
    >
      <ResponsiveDialogTrigger asChild>{children}</ResponsiveDialogTrigger>

      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {loading ? "Loading…" : beneficiary?.name || "Beneficiary Not Found"}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {beneficiary
              ? `Assigned to: ${preacher?.name || "Unassigned"}`
              : "Details about the beneficiary will appear here."}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="flex-1 overflow-y-auto relative">
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Error */}
          {!loading && fetchError && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-muted-foreground mb-4">{fetchError}</p>
              <Button
                type="button"
                variant="outline"
                onClick={fetchBeneficiaryData}
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Busy overlay */}
          {busy && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm
                            z-50 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{busyLabel}</p>
            </div>
          )}

          {/* Content */}
          {!loading && !fetchError && beneficiary && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              {/* Left */}
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
                    <StatItem title="Maqari"   attended={attendanceStats.maqari.attended}   total={attendanceStats.maqari.total}   />
                    <StatItem title="Events"   attended={attendanceStats.events.attended}   total={attendanceStats.events.total}   />
                    <StatItem title="Lessons"  attended={attendanceStats.lessons.attended}  total={attendanceStats.lessons.total}  />
                    <StatItem title="Sections" attended={attendanceStats.sections.attended} total={attendanceStats.sections.total} />
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

              {/* Right */}
              <div className="space-y-4">
                <h3 className="font-semibold border-b pb-2 flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5" />
                  Attendance History
                </h3>
                <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
                  {Object.keys(groupedAttendance).length > 0 ? (
                    <>
                      {groupedAttendance.maqari   && <AttendanceCategory title="Maqari"   records={groupedAttendance.maqari}   icon={BookOpen}    />}
                      {groupedAttendance.events   && <AttendanceCategory title="Events"   records={groupedAttendance.events}   icon={CalendarIcon}/>}
                      {groupedAttendance.lessons  && <AttendanceCategory title="Lessons"  records={groupedAttendance.lessons}  icon={ActivityIcon}/>}
                      {groupedAttendance.sections && <AttendanceCategory title="Sections" records={groupedAttendance.sections} icon={UsersIcon}   />}
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

          {/* Not found */}
          {!loading && !fetchError && !beneficiary && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <UsersIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Could not find beneficiary data.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !fetchError && beneficiary && (
          <ResponsiveDialogFooter className="flex-wrap justify-start gap-2 pt-4 border-t">
            <EditBeneficiaryDialog
              beneficiary={beneficiary}
              onBeneficiaryUpdated={handleEditComplete}
            >
              <Button type="button" disabled={busy}>
                Edit Details
              </Button>
            </EditBeneficiaryDialog>

            <TransferBeneficiaryDialog
              beneficiary={beneficiary}
              onTransferComplete={handleTransferComplete}
            >
              <Button type="button" variant="secondary" disabled={busy}>
                Transfer
              </Button>
            </TransferBeneficiaryDialog>

            {/* Archive (soft delete) — everyone */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowArchiveConfirm(true)}
              disabled={busy}
              className="gap-2"
            >
              <Archive className="h-4 w-4" />
              Archive
            </Button>

            <ConfirmDialog
              open={showArchiveConfirm}
              onOpenChange={setShowArchiveConfirm}
              onConfirm={handleArchive}
              title="Archive this beneficiary?"
              description={`"${beneficiary.name}" will be hidden from the active list. All data is preserved and can be restored at any time.`}
              confirmText="Yes, Archive"
              cancelText="Cancel"
            />

            {/* Permanent delete — admin only */}
            {userRole === "admin" && (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={busy}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Permanently
                </Button>

                <ConfirmDialog
                  open={showDeleteConfirm}
                  onOpenChange={setShowDeleteConfirm}
                  onConfirm={handlePermanentDelete}
                  title="Permanently delete this beneficiary?"
                  description={`This cannot be undone. "${beneficiary.name}" and ALL related attendance and progress data will be erased forever.`}
                  confirmText="Yes, Delete Forever"
                  cancelText="Cancel"
                />
              </>
            )}

            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              Close
            </Button>
          </ResponsiveDialogFooter>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}