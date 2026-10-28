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
  UserPlus,
  Plus,
} from "lucide-react"
import { toast } from "sonner"
import type {
  Activity,
  Beneficiary,
  AttendanceRecord,
} from "@/lib/firestore-collections"
import { attendanceCollection } from "@/lib/firestore-collections"
import { AddBeneficiaryDialog } from "@/components/beneficiaries/add-beneficiary-dialog"

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
  const [addBeneficiaryOpen, setAddBeneficiaryOpen] = useState(false)

  const handleBeneficiaryAdded = useCallback((newBeneficiary: Beneficiary) => {
    setBeneficiaries((prev) => {
      const exists = prev.some((b) => b.id === newBeneficiary.id)
      if (exists) return prev
      const updated = [...prev, newBeneficiary]
      return updated.sort((a, b) => a.name.localeCompare(b.name))
    })

    // Automatically mark the newly created member as present / selected
    setAttendance((prev) => ({
      ...prev,
      [newBeneficiary.id]: true,
    }))

    setSearchTerm("")
    toast.success(`"${newBeneficiary.name}" added and selected for attendance!`)
  }, [])

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

  // ─── Filter Tabs & Selection State ─────────────────────────
  const [filterTab, setFilterTab] = useState<"all" | "selected" | "not_present" | "present">("all")

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

  const selectedBeneficiaryList = useMemo(() => {
    return beneficiaries.filter((b) => attendance[b.id] && !alreadyPresentIds.has(b.id))
  }, [beneficiaries, attendance, alreadyPresentIds])

  const displayedNewBeneficiaries = useMemo(() => {
    if (filterTab === "selected") {
      return filteredNewBeneficiaries.filter((b) => attendance[b.id])
    }
    if (filterTab === "present") {
      return []
    }
    return filteredNewBeneficiaries
  }, [filteredNewBeneficiaries, filterTab, attendance])

  const displayedAlreadyPresent = useMemo(() => {
    if (filterTab === "selected" || filterTab === "not_present") {
      return []
    }
    return filteredAlreadyPresent
  }, [filteredAlreadyPresent, filterTab])

  const allVisibleNewSelected = useMemo(
    () =>
      displayedNewBeneficiaries.length > 0 &&
      displayedNewBeneficiaries.every((b) => attendance[b.id]),
    [displayedNewBeneficiaries, attendance]
  )

  // ─── Render ──────────────────────────────────────────────────

  return (
    <>
      <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogTrigger asChild>{children}</ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="max-w-xl p-0 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Sticky Top Header with Instant Save */}
        <ResponsiveDialogHeader className="px-6 py-4 border-b bg-background/95 backdrop-blur shrink-0 sticky top-0 z-20">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <ResponsiveDialogTitle className="flex items-center gap-2 text-base font-semibold">
                <Users className="h-5 w-5 text-primary shrink-0" />
                <span className="truncate">Log Attendance</span>
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription className="text-xs truncate mt-0.5">
                &ldquo;{activity.name}&rdquo; • {alreadyPresentIds.size} already present
              </ResponsiveDialogDescription>
            </div>

            {/* Quick Save button right in the header */}
            {newSelectedCount > 0 && (
              <Button
                size="sm"
                onClick={handleSaveAttendance}
                disabled={saving || loading}
                className="gap-1.5 h-8 px-3 text-xs shrink-0 font-medium shadow-xs"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5" />
                )}
                Save ({newSelectedCount})
              </Button>
            )}
          </div>
        </ResponsiveDialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-4 sm:p-5 gap-3">
          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Search Bar */}
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 pl-10 h-10 text-sm"
              autoFocus={false}
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

          {/* Selected Attendees Quick Chips Tray */}
          {selectedBeneficiaryList.length > 0 && (
            <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 shrink-0 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-primary">
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Selected to Save ({selectedBeneficiaryList.length}):
                </span>
                <button
                  type="button"
                  onClick={() => setAttendance({})}
                  className="text-[11px] text-muted-foreground hover:text-destructive underline cursor-pointer"
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {selectedBeneficiaryList.map((b) => (
                  <span
                    key={b.id}
                    className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full bg-background border border-primary/30 text-xs font-medium text-foreground shadow-2xs"
                  >
                    <span className="max-w-[140px] truncate">{b.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAttendanceChange(b.id, false)
                      }}
                      className="text-muted-foreground hover:text-destructive p-0.5 rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* View Filter Tabs & Selection Toggle */}
          {!loading && (
            <div className="flex items-center justify-between gap-2 shrink-0 pt-1">
              <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-lg text-xs overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setFilterTab("all")}
                  className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                    filterTab === "all"
                      ? "bg-background text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({beneficiaries.length})
                </button>

                {newSelectedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterTab("selected")}
                    className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1 ${
                      filterTab === "selected"
                        ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                        : "text-primary hover:bg-primary/10"
                    }`}
                  >
                    Selected ({newSelectedCount})
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setFilterTab("not_present")}
                  className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                    filterTab === "not_present"
                      ? "bg-background text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Unmarked ({filteredNewBeneficiaries.length})
                </button>

                {alreadyPresentIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterTab("present")}
                    className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                      filterTab === "present"
                        ? "bg-background text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Present ({alreadyPresentIds.size})
                  </button>
                )}
              </div>

              {displayedNewBeneficiaries.length > 0 && filterTab !== "present" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs h-7 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setAttendance((prev) => {
                      const updated = { ...prev }
                      displayedNewBeneficiaries.forEach((b) => {
                        updated[b.id] = !allVisibleNewSelected
                      })
                      return updated
                    })
                  }}
                >
                  {allVisibleNewSelected ? (
                    <>
                      <Square className="h-3 w-3" />
                      Deselect
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

          {/* Scrollable Beneficiary List Container */}
          <div className="flex-1 overflow-y-auto max-h-[380px] sm:max-h-[420px] space-y-1 pr-1 border rounded-xl p-2 bg-muted/20">
            {loading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-card border">
                    <Skeleton className="h-4 w-4 rounded" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : displayedNewBeneficiaries.length === 0 && displayedAlreadyPresent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-3">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  <UserPlus className="h-6 w-6" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <p className="text-sm font-semibold text-foreground">
                    {filterTab === "selected"
                      ? "No beneficiaries selected"
                      : searchTerm
                      ? `"${searchTerm}" not found in database`
                      : "No beneficiaries found"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {filterTab === "selected"
                      ? "Search and tap any member to mark them present."
                      : searchTerm
                      ? "This member is not in the system yet. You can add them now directly to this session."
                      : "Add a new beneficiary to start logging attendance."}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    className="gap-2 shadow-xs cursor-pointer"
                    onClick={() => setAddBeneficiaryOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    <span>
                      {searchTerm.trim()
                        ? `Add "${searchTerm.trim()}" as Beneficiary`
                        : "Add New Beneficiary"}
                    </span>
                  </Button>
                  {searchTerm && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                      onClick={() => setSearchTerm("")}
                    >
                      Clear Search
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Already Present Section */}
                {displayedAlreadyPresent.length > 0 && (
                  <div className="mb-2">
                    <div className="flex items-center gap-2 mb-1.5 px-1">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-[11px] text-muted-foreground font-medium">
                        Already Marked Present ({displayedAlreadyPresent.length})
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    {displayedAlreadyPresent.map((beneficiary) => (
                      <div
                        key={beneficiary.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg opacity-60 bg-muted/40 mb-1"
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

                {/* Unmarked / Selected Beneficiaries Section */}
                {displayedNewBeneficiaries.length > 0 && (
                  <div className="space-y-1">
                    {displayedAlreadyPresent.length > 0 && (
                      <div className="flex items-center gap-2 my-2 px-1">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-[11px] text-muted-foreground font-medium">
                          Available Members ({displayedNewBeneficiaries.length})
                        </span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                    )}
                    {displayedNewBeneficiaries.map((beneficiary) => {
                      const isChecked = !!attendance[beneficiary.id]
                      return (
                        <div
                          key={beneficiary.id}
                          className={`
                            flex items-center gap-3 p-2.5 rounded-lg cursor-pointer
                            transition-all duration-150 select-none
                            ${
                              isChecked
                                ? "bg-primary/10 border border-primary/30 shadow-2xs"
                                : "bg-card hover:bg-muted/80 border border-border/60"
                            }
                          `}
                          onClick={() =>
                            handleAttendanceChange(beneficiary.id, !isChecked)
                          }
                        >
                          <Checkbox
                            id={`att-${activity.id}-${beneficiary.id}`}
                            checked={isChecked}
                            onCheckedChange={(checked) =>
                              handleAttendanceChange(beneficiary.id, !!checked)
                            }
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-sm truncate text-foreground">
                                <SafeHighlightText
                                  text={beneficiary.name}
                                  highlight={searchTerm}
                                />
                              </span>
                              {isChecked && (
                                <Badge className="text-[10px] gap-1 h-5 px-1.5 bg-primary text-primary-foreground">
                                  Selected
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <SafeHighlightText
                                text={beneficiary.phone}
                                highlight={searchTerm}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sticky Bottom Footer Bar: NEVER scrolls away */}
        <ResponsiveDialogFooter className="sticky bottom-0 z-20 px-6 py-3.5 border-t bg-background/95 backdrop-blur flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-muted-foreground font-medium flex-1 truncate">
            {newSelectedCount > 0 ? (
              <span className="text-primary font-semibold">
                {newSelectedCount} {newSelectedCount === 1 ? "member" : "members"} ready to save
              </span>
            ) : (
              <span>Search or tap members above to mark attendance</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={saving}
              className="h-9 px-3.5"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAttendance}
              disabled={saving || loading || newSelectedCount === 0}
              className="gap-2 h-9 px-4 font-semibold"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Save Attendance ({newSelectedCount})
                </>
              )}
            </Button>
          </div>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>

    {/* Add New Beneficiary Dialog */}
    <AddBeneficiaryDialog
      open={addBeneficiaryOpen}
      onOpenChange={setAddBeneficiaryOpen}
      initialName={searchTerm.trim()}
      onBeneficiaryAdded={handleBeneficiaryAdded}
    />
  </>
  )
}
