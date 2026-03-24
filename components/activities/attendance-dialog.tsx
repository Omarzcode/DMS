"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
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
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Loader2,
  Search,
  CheckCircle,
  AlertCircle,
  Users,
  UserCheck,
  X,
  CheckSquare,
  Square,
} from "lucide-react"
import { toast } from "sonner"
import type {
  Activity,
  Beneficiary,
  AttendanceRecord,
} from "@/lib/firestore-collections"
import { attendanceCollection } from "@/lib/firestore-collections"

// ─── Types ───────────────────────────────────────────────────────

interface AttendanceDialogProps {
  activity: Activity & { type: string }
  children: React.ReactNode
  onAttendanceSaved?: (activityId: string, newCount: number) => void
}

// ─── Constants ───────────────────────────────────────────────────

const FIRESTORE_BATCH_LIMIT = 500

// ─── Utilities ───────────────────────────────────────────────────

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function SafeHighlightText({
  text,
  highlight,
  className,
}: {
  text: string
  highlight: string
  className?: string
}) {
  if (!highlight || !highlight.trim() || !text) {
    return <span className={className}>{text}</span>
  }

  try {
    const escaped = escapeRegExp(highlight.trim())
    const regex = new RegExp(`(${escaped})`, "gi")
    const parts = text.split(regex)

    return (
      <span className={className}>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.trim().toLowerCase() ? (
            <mark
              key={i}
              className="bg-primary/20 text-primary rounded-sm px-0.5"
            >
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    )
  } catch {
    return <span className={className}>{text}</span>
  }
}

// ─── Component ───────────────────────────────────────────────────

export function AttendanceDialog({
  activity,
  children,
  onAttendanceSaved,
}: AttendanceDialogProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [attendance, setAttendance] = useState<Record<string, boolean>>({})
  const [alreadyPresentIds, setAlreadyPresentIds] = useState<Set<string>>(
    new Set()
  )

  // ─── Data Fetching ───────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      // Fetch existing attendance and all beneficiaries in parallel
      const [attendanceSnapshot, beneficiariesSnapshot] = await Promise.all([
        getDocs(
          query(
            collection(db, "attendance"),
            where("activity_id", "==", activity.id),
            where("present", "==", true)
          )
        ),
        getDocs(collection(db, "beneficiaries")),
      ])

      // Track already-present beneficiaries
      const presentIds = new Set(
        attendanceSnapshot.docs.map((doc) => doc.data().beneficiary_id)
      )
      setAlreadyPresentIds(presentIds)

      // Parse beneficiaries and sort alphabetically
      const beneficiariesData = beneficiariesSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as Beneficiary))
        .sort((a, b) => a.name.localeCompare(b.name))
      setBeneficiaries(beneficiariesData)

      // Initialize attendance checkboxes (only for those not already present)
      const initialAttendance: Record<string, boolean> = {}
      beneficiariesData.forEach((ben) => {
        if (!presentIds.has(ben.id)) {
          initialAttendance[ben.id] = false
        }
      })
      setAttendance(initialAttendance)
    } catch (e) {
      console.error("Error fetching attendance data:", e)
      setError("Failed to load data. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [user, activity.id])

  // Fetch when dialog opens
  useEffect(() => {
    if (open && user) {
      fetchData()
    }
  }, [open, user, fetchData])

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setSearchTerm("")
      setError(null)
      setAttendance({})
      setAlreadyPresentIds(new Set())
      setBeneficiaries([])
    }
  }

  // ─── Attendance Handlers ─────────────────────────────────────

  const handleAttendanceChange = useCallback(
    (beneficiaryId: string, present: boolean) => {
      if (alreadyPresentIds.has(beneficiaryId)) return
      setAttendance((prev) => ({ ...prev, [beneficiaryId]: present }))
    },
    [alreadyPresentIds]
  )

  const handleSelectAllVisible = useCallback(() => {
    const allVisibleSelected = filteredNewBeneficiaries.every(
      (b) => attendance[b.id]
    )

    setAttendance((prev) => {
      const updated = { ...prev }
      filteredNewBeneficiaries.forEach((b) => {
        updated[b.id] = !allVisibleSelected
      })
      return updated
    })
  }, []) // Will be updated below with proper deps

  const handleSaveAttendance = async () => {
    if (!user) return

    const newlyPresent = Object.entries(attendance).filter(
      ([_, present]) => present
    )

    if (newlyPresent.length === 0) {
      setError("Please mark at least one new beneficiary as present.")
      return
    }

    setSaving(true)
    setError(null)

    try {
      // Chunk into batches to respect Firestore's 500-write limit
      const timestamp = new Date()

      for (let i = 0; i < newlyPresent.length; i += FIRESTORE_BATCH_LIMIT) {
        const chunk = newlyPresent.slice(i, i + FIRESTORE_BATCH_LIMIT)
        const batch = writeBatch(db)

        chunk.forEach(([beneficiaryId]) => {
          const beneficiary = beneficiaries.find(
            (b) => b.id === beneficiaryId
          )
          if (!beneficiary) return

          const attendanceRef = doc(attendanceCollection)
          const newRecord: Omit<AttendanceRecord, "id"> = {
            activity_id: activity.id,
            activity_type: activity.type,
            activity_name: activity.name,
            beneficiary_id: beneficiaryId,
            beneficiary_name: beneficiary.name,
            present: true,
            logged_by_id: user.uid,
            logged_by_name: user.displayName || "Unknown",
            logged_at: timestamp,
          }

          batch.set(attendanceRef, newRecord)
        })

        await batch.commit()
      }

      // Calculate new total and notify parent
      const totalPresent = alreadyPresentIds.size + newlyPresent.length
      onAttendanceSaved?.(activity.id, totalPresent)

      toast.success("Attendance saved", {
        description: `${newlyPresent.length} new ${
          newlyPresent.length === 1 ? "attendee" : "attendees"
        } recorded for "${activity.name}".`,
      })

      setOpen(false)
    } catch (e: unknown) {
      console.error("Firebase Error:", e)
      const message =
        e instanceof Error ? e.message : "An unknown error occurred"
      setError(`Failed to save attendance: ${message}`)
      toast.error("Failed to save attendance")
    } finally {
      setSaving(false)
    }
  }

  // ─── Computed Values ─────────────────────────────────────────

  const filteredBeneficiaries = useMemo(() => {
    if (!searchTerm.trim()) return beneficiaries

    const lowered = searchTerm.toLowerCase().trim()
    return beneficiaries.filter(
      (b) =>
        b.name.toLowerCase().includes(lowered) ||
        b.phone?.toLowerCase().includes(lowered)
    )
  }, [beneficiaries, searchTerm])

  // Split into already-present and new
  const filteredAlreadyPresent = useMemo(
    () => filteredBeneficiaries.filter((b) => alreadyPresentIds.has(b.id)),
    [filteredBeneficiaries, alreadyPresentIds]
  )

  const filteredNewBeneficiaries = useMemo(
    () => filteredBeneficiaries.filter((b) => !alreadyPresentIds.has(b.id)),
    [filteredBeneficiaries, alreadyPresentIds]
  )

  const newSelectedCount = useMemo(
    () => Object.values(attendance).filter(Boolean).length,
    [attendance]
  )

  const allVisibleNewSelected = useMemo(
    () =>
      filteredNewBeneficiaries.length > 0 &&
      filteredNewBeneficiaries.every((b) => attendance[b.id]),
    [filteredNewBeneficiaries, attendance]
  )

  // ─── Render ──────────────────────────────────────────────────

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogTrigger asChild>{children}</ResponsiveDialogTrigger>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader className="px-6 pt-6 pb-4 border-b">
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Log Attendance
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Mark attendance for &ldquo;{activity.name}&rdquo;.
            {alreadyPresentIds.size > 0 && (
              <span className="block mt-1 text-xs">
                {alreadyPresentIds.size} already marked as present.
              </span>
            )}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col px-6 py-4 gap-4">
          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 pl-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchTerm("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Summary Bar */}
          {!loading && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="secondary" className="gap-1">
                  <Users className="h-3 w-3" />
                  Total: {beneficiaries.length}
                </Badge>
                {alreadyPresentIds.size > 0 && (
                  <Badge
                    variant="outline"
                    className="gap-1 text-green-700 border-green-300 bg-green-50"
                  >
                    <UserCheck className="h-3 w-3" />
                    Present: {alreadyPresentIds.size}
                  </Badge>
                )}
                {newSelectedCount > 0 && (
                  <Badge className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    New: {newSelectedCount}
                  </Badge>
                )}
              </div>

              {/* Select All Toggle */}
              {filteredNewBeneficiaries.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs h-7"
                  onClick={() => {
                    setAttendance((prev) => {
                      const updated = { ...prev }
                      filteredNewBeneficiaries.forEach((b) => {
                        updated[b.id] = !allVisibleNewSelected
                      })
                      return updated
                    })
                  }}
                >
                  {allVisibleNewSelected ? (
                    <>
                      <Square className="h-3 w-3" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <CheckSquare className="h-3 w-3" />
                      Select All
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Beneficiary List */}
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg"
                >
                  <Skeleton className="h-4 w-4 rounded" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredBeneficiaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchTerm
                  ? "No beneficiaries match your search."
                  : "No beneficiaries found."}
              </p>
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => setSearchTerm("")}
                >
                  Clear Search
                </Button>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-1 -mx-1 px-1">
              {/* Already Present Section */}
              {filteredAlreadyPresent.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground font-medium">
                      Already Present ({filteredAlreadyPresent.length})
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  {filteredAlreadyPresent.map((beneficiary) => (
                    <div
                      key={beneficiary.id}
                      className="flex items-center gap-3 p-3 rounded-lg opacity-50"
                    >
                      <Checkbox
                        checked={true}
                        disabled={true}
                        className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm truncate">
                            <SafeHighlightText
                              text={beneficiary.name}
                              highlight={searchTerm}
                            />
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-[10px] gap-1 flex-shrink-0"
                          >
                            <UserCheck className="h-3 w-3" />
                            Present
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <SafeHighlightText
                            text={beneficiary.phone}
                            highlight={searchTerm}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* New Beneficiaries Section */}
              {filteredNewBeneficiaries.length > 0 && (
                <div>
                  {filteredAlreadyPresent.length > 0 && (
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs text-muted-foreground font-medium">
                        Not Yet Present ({filteredNewBeneficiaries.length})
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  {filteredNewBeneficiaries.map((beneficiary) => (
                    <div
                      key={beneficiary.id}
                      className={`
                        flex items-center gap-3 p-3 rounded-lg cursor-pointer
                        transition-colors duration-150
                        ${
                          attendance[beneficiary.id]
                            ? "bg-primary/5 border border-primary/20"
                            : "hover:bg-muted border border-transparent"
                        }
                      `}
                      onClick={() =>
                        handleAttendanceChange(
                          beneficiary.id,
                          !attendance[beneficiary.id]
                        )
                      }
                    >
                      <Checkbox
                        id={`att-${activity.id}-${beneficiary.id}`}
                        checked={attendance[beneficiary.id] || false}
                        onCheckedChange={(checked) =>
                          handleAttendanceChange(beneficiary.id, !!checked)
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          <SafeHighlightText
                            text={beneficiary.name}
                            highlight={searchTerm}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <SafeHighlightText
                            text={beneficiary.phone}
                            highlight={searchTerm}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <ResponsiveDialogFooter className="px-6 py-4 border-t bg-muted/30 gap-2">
          <div className="flex-1 text-sm text-muted-foreground">
            {newSelectedCount > 0 && (
              <span>
                {newSelectedCount} new{" "}
                {newSelectedCount === 1 ? "attendee" : "attendees"} selected
              </span>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveAttendance}
            disabled={saving || loading || newSelectedCount === 0}
            className="gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Save ({newSelectedCount})
              </>
            )}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
