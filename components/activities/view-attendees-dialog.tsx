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
import { Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
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
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Loader2,
  UserCheck,
  Trash2,
  Search,
  X,
  Users,
  Calendar,
  AlertCircle,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User,
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import type { Activity, AttendanceRecord, FirestoreDate } from "@/lib/firestore-collections"

// ─── Types ───────────────────────────────────────────────────────

interface ViewAttendeesDialogProps {
  activity: Activity & { type: string }
  children: React.ReactNode
  onAttendanceUpdated?: (activityId: string, newCount: number) => void
}

type SortField     = "name" | "date" | "preacher"
type SortDirection = "asc" | "desc"

// ─── Utilities ───────────────────────────────────────────────────

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// Fix 2: Stable key using content + index
function SafeHighlightText({
  text,
  highlight,
  className,
}: {
  text: string
  highlight: string
  className?: string
}) {
  if (!highlight?.trim() || !text) {
    return <span className={className}>{text}</span>
  }
  try {
    const escaped = escapeRegExp(highlight.trim())
    const regex   = new RegExp(`(${escaped})`, "gi")
    const parts   = text.split(regex)
    const lowerHL = highlight.trim().toLowerCase()
    return (
      <span className={className}>
        {parts.map((part, i) =>
          part.toLowerCase() === lowerHL ? (
            <mark key={`${i}-${part}`} className="bg-primary/20 text-primary rounded-sm px-0.5">
              {part}
            </mark>
          ) : (
            <span key={`${i}-${part}`}>{part}</span>
          )
        )}
      </span>
    )
  } catch {
    return <span className={className}>{text}</span>
  }
}

// Fix 3: Type-safe timestamp formatter — no more `as any`
function formatTimestamp(value: FirestoreDate | unknown): string {
  if (!value) return "Unknown"
  try {
    if (value instanceof Timestamp)  return format(value.toDate(), "PP")
    if (value instanceof Date)       return format(value, "PP")
    if (
      typeof value === "object" && value !== null &&
      "toDate" in value && typeof (value as { toDate: unknown }).toDate === "function"
    ) {
      return format((value as Timestamp).toDate(), "PP")
    }
    if (
      typeof value === "object" && value !== null &&
      "seconds" in value &&
      typeof (value as { seconds: unknown }).seconds === "number"
    ) {
      return format(new Date((value as { seconds: number }).seconds * 1000), "PP")
    }
    const d = new Date(value as string | number)
    return isNaN(d.getTime()) ? "Unknown" : format(d, "PP")
  } catch {
    return "Unknown"
  }
}

// ─── Avatar initial helper ────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-blue-500",   "bg-green-500",  "bg-purple-500",
  "bg-orange-500", "bg-pink-500",   "bg-teal-500",
  "bg-red-500",    "bg-indigo-500",
]

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function AttendeeAvatar({ name }: { name: string }) {
  const initial    = name?.trim()?.[0]?.toUpperCase() || "?"
  const colorClass = getAvatarColor(name || "")
  return (
    <div
      className={`
        h-7 w-7 rounded-full flex items-center justify-center
        text-white text-xs font-semibold flex-shrink-0
        ${colorClass}
      `}
      aria-hidden="true"
    >
      {initial}
    </div>
  )
}

// ─── CSV Export ──────────────────────────────────────────────────

function exportAttendeesCSV(
  attendees: AttendanceRecord[],
  activityName: string
) {
  const BOM     = "\uFEFF"
  const headers = ["Beneficiary Name", "Logged By", "Date Attended"]
  const rows    = attendees.map((a) => [
    a.beneficiary_name,
    a.logged_by_name || "Unknown",
    formatTimestamp(a.logged_at),
  ])
  const csv = BOM + [
    headers.join(","),
    ...rows.map((r) =>
      r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n")

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  link.href  = URL.createObjectURL(blob)
  link.download = `attendees_${activityName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 100)
}

// ─── Component ───────────────────────────────────────────────────

export function ViewAttendeesDialog({
  activity,
  children,
  onAttendanceUpdated,
}: ViewAttendeesDialogProps) {
  const [open, setOpen]             = useState(false)
  const [loading, setLoading]       = useState(true)
  const [attendees, setAttendees]   = useState<AttendanceRecord[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError]           = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [sortField, setSortField]   = useState<SortField>("name")
  const [sortDir, setSortDir]       = useState<SortDirection>("asc")
  // Preacher filter — "all" or a specific logged_by_name
  const [preacherFilter, setPreacherFilter] = useState<string>("all")

  // Fix 6: Use null instead of empty string for no pending removal
  const [removeConfirm, setRemoveConfirm] = useState<{
    open: boolean
    record: AttendanceRecord | null
  }>({ open: false, record: null })

  const onAttendanceUpdatedRef = useRef(onAttendanceUpdated)
  onAttendanceUpdatedRef.current = onAttendanceUpdated

  // Focus search on "/" keypress while dialog is open
  const searchRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open])

  // ─── Data Fetching ───────────────────────────────────────────

  const fetchAttendees = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const snap = await getDocs(
        query(
          collection(db, "attendance"),
          where("activity_id", "==", activity.id),
          where("present",     "==", true)
        )
      )
      const data = snap.docs
        .map((d) => ({ ...d.data(), id: d.id } as AttendanceRecord))
        .sort((a, b) =>
          (a.beneficiary_name || "").localeCompare(b.beneficiary_name || "")
        )
      setAttendees(data)
    } catch (err) {
      console.error("Error fetching attendees:", err)
      setError("Failed to load attendees.")
    } finally {
      setLoading(false)
    }
  }, [activity.id])

  useEffect(() => {
    if (open) fetchAttendees()
  }, [open, fetchAttendees])

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setSearchTerm("")
      setError(null)
      setRemovingId(null)
      setPreacherFilter("all")
      setSortField("name")
      setSortDir("asc")
      setRemoveConfirm({ open: false, record: null })
    }
  }

  // ─── Remove Attendance ───────────────────────────────────────

  const handleRemoveAttendance = useCallback(async () => {
    const record = removeConfirm.record
    if (!record) return

    setRemoveConfirm({ open: false, record: null })
    setRemovingId(record.id)

    try {
      await deleteDoc(doc(db, "attendance", record.id))

      // Fix 1: Functional updater — never stale
      setAttendees((prev) => {
        const updated = prev.filter((a) => a.id !== record.id)
        onAttendanceUpdatedRef.current?.(activity.id, updated.length)
        return updated
      })

      toast.success("Attendance removed", {
        description: `${record.beneficiary_name} has been removed from attendees.`,
      })
    } catch (err) {
      console.error("Error removing attendance:", err)
      toast.error("Failed to remove attendance record.")
    } finally {
      setRemovingId(null)
    }
  }, [removeConfirm.record, activity.id])

  // ─── Derived Data ────────────────────────────────────────────

  // Unique preacher names for the filter dropdown
  const uniquePreachers = useMemo(() => {
    const names = new Set<string>()
    attendees.forEach((a) => {
      if (a.logged_by_name) names.add(a.logged_by_name)
    })
    return Array.from(names).sort()
  }, [attendees])

  const filteredAndSorted = useMemo(() => {
    let result = [...attendees]

    // Search filter
    if (searchTerm.trim()) {
      const lowered = searchTerm.toLowerCase().trim()
      result = result.filter((a) =>
        a.beneficiary_name?.toLowerCase().includes(lowered)
      )
    }

    // Preacher filter
    if (preacherFilter !== "all") {
      result = result.filter((a) => a.logged_by_name === preacherFilter)
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case "name":
          cmp = (a.beneficiary_name || "").localeCompare(b.beneficiary_name || "")
          break
        case "preacher":
          cmp = (a.logged_by_name || "").localeCompare(b.logged_by_name || "")
          break
        case "date": {
          const getMs = (v: unknown) => {
            if (v instanceof Timestamp) return v.toDate().getTime()
            if (v instanceof Date)      return v.getTime()
            if (
              typeof v === "object" && v !== null && "seconds" in v &&
              typeof (v as { seconds: unknown }).seconds === "number"
            ) return (v as { seconds: number }).seconds * 1000
            return 0
          }
          cmp = getMs(a.logged_at) - getMs(b.logged_at)
          break
        }
      }
      return sortDir === "asc" ? cmp : -cmp
    })

    return result
  }, [attendees, searchTerm, preacherFilter, sortField, sortDir])

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortField(field); setSortDir("asc") }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />
    return sortDir === "asc"
      ? <ArrowUp   className="h-3 w-3 text-primary" />
      : <ArrowDown className="h-3 w-3 text-primary" />
  }

  const hasActiveFilters = searchTerm || preacherFilter !== "all"

  // ─── Render ──────────────────────────────────────────────────

  return (
    <>
      <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
        <ResponsiveDialogTrigger asChild>{children}</ResponsiveDialogTrigger>

        <ResponsiveDialogContent>
          {/* Header */}
          <ResponsiveDialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <ResponsiveDialogTitle className="flex items-center gap-2 text-base">
                  <Users className="h-5 w-5 flex-shrink-0" />
                  Attendees
                </ResponsiveDialogTitle>
                <ResponsiveDialogDescription className="mt-1 text-xs">
                  {loading
                    ? "Loading attendees..."
                    : `${attendees.length} ${attendees.length === 1 ? "person" : "people"} attended "${activity.name}"`}
                </ResponsiveDialogDescription>
              </div>

              {/* Export button — top right of header */}
              {!loading && attendees.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 flex-shrink-0"
                  onClick={() => exportAttendeesCSV(filteredAndSorted, activity.name)}
                  aria-label="Export attendees to CSV"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              )}
            </div>
          </ResponsiveDialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col px-6 py-4 gap-3">
            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive flex-1">{error}</p>
                <Button variant="ghost" size="sm" onClick={fetchAttendees}>
                  Retry
                </Button>
              </div>
            )}

            {/* Search + Filters */}
            {!loading && attendees.length > 0 && (
              <div className="space-y-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    ref={searchRef}
                    placeholder='Search attendees... (press "/" to focus)'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10 pl-10 h-9"
                    aria-label="Search attendees"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                      onClick={() => setSearchTerm("")}
                      aria-label="Clear search"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Preacher filter + sort controls */}
                <div className="flex items-center gap-2">
                  {/* Preacher filter — only show if more than one preacher logged */}
                  {uniquePreachers.length > 1 && (
                    <Select value={preacherFilter} onValueChange={setPreacherFilter}>
                      <SelectTrigger className="h-8 flex-1 text-xs">
                        <User className="h-3 w-3 mr-1.5 text-muted-foreground" />
                        <SelectValue placeholder="All Preachers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Preachers</SelectItem>
                        {uniquePreachers.map((name) => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Sort controls */}
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-xs text-muted-foreground hidden sm:inline">Sort:</span>
                    {(["name", "date", "preacher"] as SortField[]).map((field) => (
                      <Button
                        key={field}
                        variant={sortField === field ? "secondary" : "ghost"}
                        size="sm"
                        className="h-8 px-2 text-xs gap-1"
                        onClick={() => handleSort(field)}
                        aria-label={`Sort by ${field}`}
                      >
                        {field.charAt(0).toUpperCase() + field.slice(1)}
                        {getSortIcon(field)}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Active filter summary */}
                {hasActiveFilters && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {filteredAndSorted.length} of {attendees.length} shown
                    </span>
                    {preacherFilter !== "all" && (
                      <Badge variant="secondary" className="text-xs gap-1.5">
                        Preacher: {preacherFilter}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          role="button"
                          aria-label="Clear preacher filter"
                          onClick={() => setPreacherFilter("all")}
                        />
                      </Badge>
                    )}
                    {searchTerm && (
                      <Badge variant="secondary" className="text-xs gap-1.5">
                        Search: {searchTerm}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          role="button"
                          aria-label="Clear search filter"
                          onClick={() => setSearchTerm("")}
                        />
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => { setSearchTerm(""); setPreacherFilter("all") }}
                    >
                      Clear all
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Attendees List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 -mx-1 px-1">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-md bg-muted">
                    <div className="flex items-center gap-2 flex-1">
                      <Skeleton className="h-7 w-7 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-7 w-7 rounded" />
                    </div>
                  </div>
                ))
              ) : filteredAndSorted.length > 0 ? (
                filteredAndSorted.map((record) => {
                  const isRemoving = removingId === record.id
                  return (
                    <div
                      key={record.id}
                      className={[
                        "flex items-center justify-between p-3 rounded-md border transition-all duration-200",
                        isRemoving
                          ? "opacity-50 bg-destructive/5 border-destructive/20"
                          : "bg-muted/50 border-transparent hover:bg-muted hover:border-border",
                      ].join(" ")}
                    >
                      {/* Left: Avatar + name + preacher */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <AttendeeAvatar name={record.beneficiary_name} />
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">
                            <SafeHighlightText
                              text={record.beneficiary_name}
                              highlight={searchTerm}
                            />
                          </div>
                          {/* Preacher attribution — always visible */}
                          <div className="flex items-center gap-1 mt-0.5">
                            <User className="h-3 w-3 text-muted-foreground/60 flex-shrink-0" />
                            <span className="text-[11px] text-muted-foreground truncate">
                              {record.logged_by_name || "Unknown preacher"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Date badge + remove button */}
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <Badge variant="secondary" className="text-[10px] gap-1 hidden sm:flex">
                          <Calendar className="h-3 w-3" aria-hidden="true" />
                          {formatTimestamp(record.logged_at)}
                        </Badge>

                        {/* Fix 4: aria-label on icon-only button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setRemoveConfirm({ open: true, record })}
                          disabled={isRemoving}
                          aria-label={`Remove ${record.beneficiary_name} from attendees`}
                          title="Remove attendance"
                        >
                          {isRemoving
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Trash2  className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>
                  )
                })
              ) : searchTerm || preacherFilter !== "all" ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Search className="h-8 w-8 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No attendees match the current filters.</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => { setSearchTerm(""); setPreacherFilter("all") }}
                  >
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No attendees recorded for this activity yet.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <ResponsiveDialogFooter className="px-6 py-4 border-t bg-muted/30">
            <div className="flex-1 text-sm text-muted-foreground">
              {!loading && attendees.length > 0 && (
                <span>
                  {filteredAndSorted.length !== attendees.length
                    ? `${filteredAndSorted.length} of ${attendees.length} attendees`
                    : `${attendees.length} ${attendees.length === 1 ? "attendee" : "attendees"} total`}
                </span>
              )}
            </div>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Fix 6: removeConfirm holds the full record, not just id + name strings */}
      <ConfirmDialog
        open={removeConfirm.open}
        onOpenChange={(isOpen) =>
          setRemoveConfirm((prev) => ({ ...prev, open: isOpen }))
        }
        onConfirm={handleRemoveAttendance}
        title="Remove attendance record?"
        description={
          removeConfirm.record
            ? `This will remove "${removeConfirm.record.beneficiary_name}" from the attendees list for "${activity.name}". This action cannot be undone.`
            : ""
        }
        confirmText="Yes, Remove"
        cancelText="Cancel"
      />
    </>
  )
}