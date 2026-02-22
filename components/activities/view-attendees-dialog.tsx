"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  deleteDoc,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
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
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  Loader2,
  UserCheck,
  Trash2,
  Search,
  X,
  Users,
  Calendar,
  AlertCircle,
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import type { Activity, AttendanceRecord } from "@/lib/firestore-collections"

// ─── Types ───────────────────────────────────────────────────────

interface ViewAttendeesDialogProps {
  activity: Activity & { type: string }
  children: React.ReactNode
  onAttendanceUpdated?: (activityId: string, newCount: number) => void
}

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

function formatTimestamp(timestamp: unknown): string {
  if (!timestamp) return "Unknown"
  try {
    if (
      typeof timestamp === "object" &&
      timestamp !== null &&
      "toDate" in timestamp &&
      typeof (timestamp as any).toDate === "function"
    ) {
      return format((timestamp as any).toDate(), "PP")
    }
    if (
      typeof timestamp === "object" &&
      timestamp !== null &&
      "seconds" in timestamp
    ) {
      return format(
        new Date((timestamp as { seconds: number }).seconds * 1000),
        "PP"
      )
    }
    const date = new Date(timestamp as string | number)
    return isNaN(date.getTime()) ? "Unknown" : format(date, "PP")
  } catch {
    return "Unknown"
  }
}

// ─── Component ───────────────────────────────────────────────────

export function ViewAttendeesDialog({
  activity,
  children,
  onAttendanceUpdated,
}: ViewAttendeesDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [attendees, setAttendees] = useState<AttendanceRecord[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [removeConfirm, setRemoveConfirm] = useState<{
    open: boolean
    id: string
    name: string
  }>({ open: false, id: "", name: "" })

  // Keep latest callback ref to avoid stale closures
  const onAttendanceUpdatedRef = useRef(onAttendanceUpdated)
  onAttendanceUpdatedRef.current = onAttendanceUpdated

  // ─── Data Fetching ───────────────────────────────────────────

  const fetchAttendees = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("activity_id", "==", activity.id),
        where("present", "==", true)
      )
      const snapshot = await getDocs(attendanceQuery)
      const attendeesData = snapshot.docs
        .map(
          (doc) =>
            ({ ...doc.data(), id: doc.id } as AttendanceRecord)
        )
        .sort((a, b) =>
          (a.beneficiary_name || "").localeCompare(
            b.beneficiary_name || ""
          )
        )

      setAttendees(attendeesData)
    } catch (err) {
      console.error("Error fetching attendees:", err)
      setError("Failed to load attendees.")
    } finally {
      setLoading(false)
    }
  }, [activity.id])

  useEffect(() => {
    if (open) {
      fetchAttendees()
    }
  }, [open, fetchAttendees])

  // Reset on close
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setSearchTerm("")
      setError(null)
      setRemovingId(null)
      setRemoveConfirm({ open: false, id: "", name: "" })
    }
  }

  // ─── Remove Attendance ───────────────────────────────────────

  const handleRemoveAttendance = useCallback(async () => {
    const { id, name } = removeConfirm
    if (!id) return

    setRemoveConfirm((prev) => ({ ...prev, open: false }))
    setRemovingId(id)

    try {
      await deleteDoc(doc(db, "attendance", id))

      const updatedAttendees = attendees.filter((att) => att.id !== id)
      setAttendees(updatedAttendees)

      onAttendanceUpdatedRef.current?.(activity.id, updatedAttendees.length)

      toast.success("Attendance removed", {
        description: `${name} has been removed from attendees.`,
      })
    } catch (err) {
      console.error("Error removing attendance:", err)
      toast.error("Failed to remove attendance record.")
    } finally {
      setRemovingId(null)
    }
  }, [removeConfirm, attendees, activity.id])

  // ─── Filtered List ───────────────────────────────────────────

  const filteredAttendees = useMemo(() => {
    if (!searchTerm.trim()) return attendees

    const lowered = searchTerm.toLowerCase().trim()
    return attendees.filter((att) =>
      att.beneficiary_name?.toLowerCase().includes(lowered)
    )
  }, [attendees, searchTerm])

  // ─── Render ──────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90dvh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Attendees
          </DialogTitle>
          <DialogDescription>
            {loading
              ? "Loading attendees..."
              : `${attendees.length} ${
                  attendees.length === 1 ? "person" : "people"
                } attended "${activity.name}"`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col px-6 py-4 gap-4">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive flex-1">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchAttendees}
              >
                Retry
              </Button>
            </div>
          )}

          {/* Search (only show if there are attendees) */}
          {!loading && attendees.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search attendees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 h-9"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}

          {/* Count indicator */}
          {!loading && searchTerm && (
            <p className="text-xs text-muted-foreground">
              {filteredAttendees.length} of {attendees.length} attendees
              match
            </p>
          )}

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-2 -mx-1 px-1">
            {loading ? (
              // Skeleton loading
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-md bg-muted"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-6 w-6 rounded" />
                  </div>
                </div>
              ))
            ) : filteredAttendees.length > 0 ? (
              filteredAttendees.map((record) => {
                const isRemoving = removingId === record.id

                return (
                  <div
                    key={record.id}
                    className={`
                      flex items-center justify-between p-3 rounded-md border
                      transition-all duration-200
                      ${
                        isRemoving
                          ? "opacity-50 bg-destructive/5 border-destructive/20"
                          : "bg-muted/50 border-transparent hover:bg-muted hover:border-border"
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <UserCheck className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="font-medium text-sm truncate">
                        <SafeHighlightText
                          text={record.beneficiary_name}
                          highlight={searchTerm}
                        />
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <Badge
                        variant="secondary"
                        className="text-[10px] gap-1"
                      >
                        <Calendar className="h-3 w-3" />
                        {formatTimestamp(record.logged_at)}
                      </Badge>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                        onClick={() =>
                          setRemoveConfirm({
                            open: true,
                            id: record.id,
                            name: record.beneficiary_name,
                          })
                        }
                        disabled={isRemoving}
                        title="Remove attendance"
                      >
                        {isRemoving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })
            ) : searchTerm ? (
              // No search results
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Search className="h-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No attendees match &ldquo;{searchTerm}&rdquo;
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => setSearchTerm("")}
                >
                  Clear Search
                </Button>
              </div>
            ) : (
              // No attendees at all
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Users className="h-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No attendees recorded for this activity yet.
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <div className="flex-1 text-sm text-muted-foreground">
            {!loading && attendees.length > 0 && (
              <span>
                {attendees.length}{" "}
                {attendees.length === 1 ? "attendee" : "attendees"} total
              </span>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
        </DialogFooter>

        {/* Remove Confirmation */}
        <ConfirmDialog
          open={removeConfirm.open}
          onOpenChange={(open) =>
            setRemoveConfirm((prev) => ({ ...prev, open }))
          }
          onConfirm={handleRemoveAttendance}
          title="Remove attendance record?"
          description={`This will remove "${removeConfirm.name}" from the attendees list for "${activity.name}". This action cannot be undone.`}
          confirmText="Yes, Remove"
          cancelText="Cancel"
        />
      </DialogContent>
    </Dialog>
  )
}