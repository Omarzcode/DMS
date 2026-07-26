"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import {
  collection,
  getDocs,
  query,
  where,
  getCountFromServer,
  doc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore"
import { Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Calendar,
  Search,
  Plus,
  BookOpen,
  Users,
  Activity as ActivityIcon,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Download,
  Clock,
  Trash2,
  Loader2,
} from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import { Timestamp as FirebaseTimestamp } from "firebase/firestore"
import type {
  Activity as BaseActivity,
  FirestoreDate,
} from "@/lib/firestore-collections"
import { CreateActivityDialog } from "./create-activity-dialog"
import { AttendanceDialog } from "./attendance-dialog"
import { ViewAttendeesDialog } from "./view-attendees-dialog"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActivityType = "maqari" | "events" | "lessons" | "sections"

type ActivityWithType = BaseActivity & {
  type: string
  description?: string
}

type SortOption =
  | "event-date-asc"
  | "event-date-desc"
  | "newest"
  | "oldest"
  | "name-asc"
  | "name-desc"
  | "most-attended"

export interface ActivityListProps {
  /** Which Firestore collection to fetch from */
  type: ActivityType
  /**
   * If provided, only activities whose creator_id matches
   * this uid are shown (used for "My Maqari"-style pages).
   */
  creatorId?: string
  /** Label shown in the header, e.g. "My Maqra'a" */
  title?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  maqari:   "Maqra'a",
  events:   "Event",
  lessons:  "Lesson",
  sections: "Section",
}

const ACTIVITY_TYPE_ICONS: Record<ActivityType, React.ElementType> = {
  maqari:   BookOpen,
  events:   Calendar,
  lessons:  ActivityIcon,
  sections: Users,
}

const ACTIVITY_TYPE_COLORS: Record<ActivityType, string> = {
  maqari:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
  events:
    "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300",
  lessons:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300",
  sections:
    "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300",
}

const PAGE_SIZE = 12

// ─── Utilities ────────────────────────────────────────────────────────────────

function getDateFromFirestore(value: FirestoreDate | unknown): Date | null {
  if (!value) return null
  if (value instanceof FirebaseTimestamp) return value.toDate()
  if (value instanceof Date) return value
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: unknown }).toDate === "function"
  )
    return (value as Timestamp).toDate()
  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof (value as { seconds: unknown }).seconds === "number"
  )
    return new Date((value as { seconds: number }).seconds * 1000)
  try {
    const d = new Date(value as string | number)
    return isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

function formatDate(
  value: FirestoreDate | unknown,
  formatStr = "PP"
): string {
  const date = getDateFromFirestore(value)
  if (!date) return "No date set"
  try {
    return format(date, formatStr)
  } catch {
    return "Invalid date"
  }
}

function getTimestampMs(value: unknown): number {
  const d = getDateFromFirestore(value)
  return d?.getTime() ?? 0
}

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
  if (!highlight?.trim() || !text)
    return <span className={className}>{text}</span>
  try {
    const escaped = escapeRegExp(highlight.trim())
    const regex = new RegExp(`(${escaped})`, "gi")
    const parts = text.split(regex)
    const lowerHL = highlight.trim().toLowerCase()
    return (
      <span className={className}>
        {parts.map((part, i) =>
          part.toLowerCase() === lowerHL ? (
            <mark
              key={`${i}-${part}`}
              className="bg-primary/20 text-primary rounded-sm px-0.5"
            >
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

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportActivitiesCSV(
  activities: ActivityWithType[],
  counts: Record<string, number>,
  type: ActivityType
) {
  const BOM = "\uFEFF"
  const headers = [
    "Name",
    "Type",
    "Creator",
    "Event Date",
    "Attendees",
    "Description",
  ]
  const rows = activities.map((a) => [
    a.name,
    ACTIVITY_TYPE_LABELS[a.type as ActivityType] || a.type,
    a.creator_name,
    formatDate(a.event_date || a.created_at),
    String(counts[a.id] ?? 0),
    a.description || "",
  ])
  const csv =
    BOM +
    [
      headers.join(","),
      ...rows.map((r) =>
        r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n")

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = `${type}_${new Date().toISOString().split("T")[0]}.csv`
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 100)
}

// ─── Date Badge ───────────────────────────────────────────────────────────────

function ActivityDateBadge({ activity }: { activity: ActivityWithType }) {
  const dateValue = activity.event_date || activity.created_at
  const date = getDateFromFirestore(dateValue)
  const isEventDate = Boolean(activity.event_date)
  const isFuture = date ? date > new Date() : false
  const isToday = date
    ? date.toDateString() === new Date().toDateString()
    : false

  if (!date) return null

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Calendar
        className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0"
        aria-hidden="true"
      />
      <span
        className={cn(
          "font-medium",
          isFuture && "text-primary",
          isToday && "text-success font-semibold",
          !isFuture && !isToday && "text-muted-foreground"
        )}
      >
        {isToday
          ? "Today"
          : isFuture
          ? `${formatDate(dateValue)} (${formatDistanceToNow(date, {
              addSuffix: true,
            })})`
          : formatDate(dateValue)}
      </span>
      {!isEventDate && (
        <span className="text-muted-foreground/60">(created)</span>
      )}

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(isOpen) =>
          setDeleteConfirm((prev) => ({ ...prev, open: isOpen }))
        }
        onConfirm={handleDeleteActivity}
        title={`Delete ${label}?`}
        description={
          deleteConfirm.activity
            ? `This will delete "${deleteConfirm.activity.name}" and remove all attendance records associated with it. This action cannot be undone.`
            : ""
        }
        confirmText="Yes, Delete"
        cancelText="Cancel"
      />
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ActivityList({
  type,
  creatorId,
  title,
}: ActivityListProps) {
  const [activities, setActivities] = useState<ActivityWithType[]>([])
  const [attendanceCounts, setAttendanceCounts] = useState<
    Record<string, number>
  >({})
  const [loadingActivities, setLoadingActivities] = useState(true)
  const [loadingCounts, setLoadingCounts] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean
    activity: ActivityWithType | null
  }>({ open: false, activity: null })
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortOption, setSortOption] = useState<SortOption>("event-date-asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  const searchRef = useRef<HTMLInputElement>(null)
  const Icon = ACTIVITY_TYPE_ICONS[type]
  const colorClass = ACTIVITY_TYPE_COLORS[type]
  const label = ACTIVITY_TYPE_LABELS[type]
  const pageTitle = title ?? `All ${label}s`

  // "/" shortcut to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT"
      ) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  // ─── Attendance counts ─────────────────────────────────────────

  const fetchAttendanceCounts = useCallback(
    async (list: ActivityWithType[]) => {
      if (list.length === 0) return
      setLoadingCounts(true)
      const counts: Record<string, number> = {}
      const BATCH_SIZE = 10
      try {
        for (let i = 0; i < list.length; i += BATCH_SIZE) {
          const batch = list.slice(i, i + BATCH_SIZE)
          const results = await Promise.all(
            batch.map(async (activity) => {
              try {
                const snap = await getCountFromServer(
                  query(
                    collection(db, "attendance"),
                    where("activity_id", "==", activity.id),
                    where("present", "==", true)
                  )
                )
                return { id: activity.id, count: snap.data().count }
              } catch {
                return { id: activity.id, count: 0 }
              }
            })
          )
          results.forEach(({ id, count }) => {
            counts[id] = count
          })
        }
        setAttendanceCounts(counts)
      } catch (err) {
        console.error("Error fetching attendance counts:", err)
      } finally {
        setLoadingCounts(false)
      }
    },
    []
  )

  // ─── Fetch activities ──────────────────────────────────────────

  const fetchActivities = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoadingActivities(true)
      setError(null)
      try {
        // Build query — optionally filter by creator
        const baseQuery = creatorId
          ? query(
              collection(db, type),
              where("creator_id", "==", creatorId)
            )
          : collection(db, type)

        const snapshot = await getDocs(baseQuery)
        const list: ActivityWithType[] = snapshot.docs.map((d) => ({
          ...(d.data() as BaseActivity),
          id: d.id,
          type,
        }))

        setActivities(list)
        setLastRefreshed(new Date())
        await fetchAttendanceCounts(list)

        if (isRefresh) toast.success(`${label}s refreshed`)
      } catch (err) {
        console.error("Error fetching activities:", err)
        setError("Failed to load activities. Please try again.")
        toast.error("Failed to load activities")
      } finally {
        setLoadingActivities(false)
        setRefreshing(false)
      }
    },
    [type, creatorId, label, fetchAttendanceCounts]
  )

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, sortOption])

  // ─── Derived data ──────────────────────────────────────────────

  const hasActiveFilters = useMemo(
    () => searchTerm !== "" || sortOption !== "event-date-asc",
    [searchTerm, sortOption]
  )

  const filteredAndSorted = useMemo(() => {
    let result = [...activities]

    if (searchTerm.trim()) {
      const lowered = searchTerm.toLowerCase().trim()
      result = result.filter(
        (a) =>
          a.name?.toLowerCase().includes(lowered) ||
          a.creator_name?.toLowerCase().includes(lowered) ||
          a.description?.toLowerCase().includes(lowered)
      )
    }

    result.sort((a, b) => {
      switch (sortOption) {
        case "event-date-asc":
          return (
            getTimestampMs(a.event_date || a.created_at) -
            getTimestampMs(b.event_date || b.created_at)
          )
        case "event-date-desc":
          return (
            getTimestampMs(b.event_date || b.created_at) -
            getTimestampMs(a.event_date || a.created_at)
          )
        case "newest":
          return getTimestampMs(b.created_at) - getTimestampMs(a.created_at)
        case "oldest":
          return getTimestampMs(a.created_at) - getTimestampMs(b.created_at)
        case "name-asc":
          return (a.name || "").localeCompare(b.name || "")
        case "name-desc":
          return (b.name || "").localeCompare(a.name || "")
        case "most-attended":
          return (
            (attendanceCounts[b.id] || 0) - (attendanceCounts[a.id] || 0)
          )
        default:
          return 0
      }
    })

    return result
  }, [activities, searchTerm, sortOption, attendanceCounts])

  const totalPages = useMemo(
    () =>
      Math.max(
        1,
        Math.ceil(filteredAndSorted.length / PAGE_SIZE)
      ),
    [filteredAndSorted.length]
  )
  const safePage = Math.min(currentPage, totalPages)

  const paginated = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filteredAndSorted.slice(start, start + PAGE_SIZE)
  }, [filteredAndSorted, safePage])

  const totalAttendees = useMemo(
    () =>
      Object.values(attendanceCounts).reduce((sum, c) => sum + c, 0),
    [attendanceCounts]
  )

  const FIRESTORE_BATCH_LIMIT = 500

  // ─── Handlers ──────────────────────────────────────────────────

  const handleAttendanceChange = useCallback(
    (activityId: string, newCount: number) => {
      setAttendanceCounts((prev) => ({
        ...prev,
        [activityId]: newCount,
      }))
    },
    []
  )

  const handleDeleteActivity = useCallback(async () => {
    const activity = deleteConfirm.activity
    if (!activity) return

    setDeletingActivityId(activity.id)

    try {
      const attendanceSnap = await getDocs(
        query(
          collection(db, "attendance"),
          where("activity_id", "==", activity.id)
        )
      )

      if (!attendanceSnap.empty) {
        const docs = attendanceSnap.docs
        for (let i = 0; i < docs.length; i += FIRESTORE_BATCH_LIMIT) {
          const batch = writeBatch(db)
          docs.slice(i, i + FIRESTORE_BATCH_LIMIT).forEach((docSnap) => {
            batch.delete(doc(db, "attendance", docSnap.id))
          })
          await batch.commit()
        }
      }

      await deleteDoc(doc(db, type, activity.id))

      toast.success(`${label} deleted`, {
        description: `"${activity.name}" has been removed.`,
      })
      setDeleteConfirm({ open: false, activity: null })
      await fetchActivities(true)
    } catch (err) {
      console.error("Error deleting activity:", err)
      toast.error(`Failed to delete ${label.toLowerCase()}.`)
    } finally {
      setDeletingActivityId(null)
    }
  }, [deleteConfirm.activity, fetchActivities, label, type])

  const clearFilters = useCallback(() => {
    setSearchTerm("")
    setSortOption("event-date-asc")
  }, [])

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-6 w-6" aria-hidden="true" />
          <h2 className="text-xl sm:text-2xl font-bold truncate">
            {pageTitle}
          </h2>
          <Badge variant="secondary">{activities.length}</Badge>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {lastRefreshed && !refreshing && (
            <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {formatDistanceToNow(lastRefreshed, { addSuffix: true })}
            </span>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchActivities(true)}
            disabled={refreshing}
            aria-label="Refresh activities"
            title="Refresh"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
          </Button>

          {!loadingActivities && activities.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() =>
                exportActivitiesCSV(
                  filteredAndSorted,
                  attendanceCounts,
                  type
                )
              }
              aria-label={`Export ${label}s to CSV`}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">
                Export ({filteredAndSorted.length})
              </span>
            </Button>
          )}

          <CreateActivityDialog
            activityType={type}
            onActivityCreated={() => fetchActivities(true)}
          >
            <Button className="gap-2">
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">
                Create {label}
              </span>
              <span className="sm:hidden">Create</span>
            </Button>
          </CreateActivityDialog>
        </div>
      </div>

      {/* ── Stats row ── */}
      {!loadingActivities && activities.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{activities.length}</div>
              <div className="text-xs text-muted-foreground">
                Total {label}s
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{totalAttendees}</div>
              <div className="text-xs text-muted-foreground">
                Total Attendees
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">
                {activities.length > 0
                  ? (totalAttendees / activities.length).toFixed(1)
                  : "0"}
              </div>
              <div className="text-xs text-muted-foreground">
                Avg Attendees / {label}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle
              className="h-5 w-5 text-destructive flex-shrink-0"
              aria-hidden="true"
            />
            <p className="text-sm text-destructive flex-1">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchActivities()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Search + Sort ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={searchRef}
              placeholder={`Search ${label}s… (press "/" to focus)`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 pl-10"
              aria-label={`Search ${label}s`}
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <Select
            value={sortOption}
            onValueChange={(v) => setSortOption(v as SortOption)}
          >
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="event-date-asc">
                Event Date (Soonest)
              </SelectItem>
              <SelectItem value="event-date-desc">
                Event Date (Latest)
              </SelectItem>
              <SelectItem value="newest">Created: Newest</SelectItem>
              <SelectItem value="oldest">Created: Oldest</SelectItem>
              <SelectItem value="name-asc">Name (A → Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z → A)</SelectItem>
              <SelectItem
                value="most-attended"
                disabled={loadingCounts}
              >
                Most Attended
                {loadingCounts ? " (loading…)" : ""}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active filters */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">
              Active filters:
            </span>
            {searchTerm && (
              <Badge variant="secondary" className="gap-2">
                Search: {searchTerm}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  role="button"
                  aria-label="Clear search filter"
                  onClick={() => setSearchTerm("")}
                />
              </Badge>
            )}
            {sortOption !== "event-date-asc" && (
              <Badge variant="secondary" className="gap-2">
                Sort: {sortOption.replace(/-/g, " ")}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  role="button"
                  aria-label="Reset sort"
                  onClick={() => setSortOption("event-date-asc")}
                />
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7"
            >
              Clear All
            </Button>
          </div>
        )}

        {!loadingActivities && (
          <div className="text-sm text-muted-foreground">
            Showing {filteredAndSorted.length} of {activities.length}{" "}
            {label}s
          </div>
        )}
      </div>

      {/* ── Loading skeletons ── */}
      {loadingActivities && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-24 mt-2" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <div className="flex items-center justify-between pt-2">
                  <Skeleton className="h-4 w-24" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-16 rounded" />
                    <Skeleton className="h-8 w-24 rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Activities grid ── */}
      {!loadingActivities && (
        <>
          {paginated.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paginated.map((activity) => {
                const count = attendanceCounts[activity.id]
                const isCountLoading =
                  loadingCounts && count === undefined
                const hasAttendees =
                  typeof count === "number" && count > 0

                const eventDate = getDateFromFirestore(
                  activity.event_date || activity.created_at
                )
                const isUpcoming = eventDate
                  ? eventDate > new Date()
                  : false
                const isToday = eventDate
                  ? eventDate.toDateString() ===
                    new Date().toDateString()
                  : false

                return (
                  <Card
                    key={`${type}-${activity.id}`}
                    className={cn(
                      "group transition-all duration-200 hover:shadow-md hover:border-primary/30",
                      isUpcoming && "border-primary/20 bg-primary/[0.02]",
                      isToday && "border-success/40 bg-success/[0.02]"
                    )}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base flex items-center gap-2 min-w-0">
                          <div className="p-1.5 rounded-md bg-muted flex-shrink-0">
                            <Icon
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                          </div>
                          <span className="truncate">
                            <SafeHighlightText
                              text={activity.name}
                              highlight={searchTerm}
                            />
                          </span>
                        </CardTitle>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {isToday && (
                            <Badge className="text-[10px] bg-success/20 text-success border-success/30 border">
                              Today
                            </Badge>
                          )}
                          {isUpcoming && !isToday && (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-primary border-primary/30"
                            >
                              Upcoming
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-xs ${colorClass}`}
                          >
                            {label}
                          </Badge>
                        </div>
                      </div>

                      <CardDescription className="truncate">
                        Created by{" "}
                        <SafeHighlightText
                          text={activity.creator_name}
                          highlight={searchTerm}
                        />
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      {activity.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          <SafeHighlightText
                            text={activity.description}
                            highlight={searchTerm}
                          />
                        </p>
                      )}

                      <ActivityDateBadge activity={activity} />

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" aria-hidden="true" />
                          {isCountLoading ? (
                            <Skeleton className="h-4 w-12" />
                          ) : (
                            <span>
                              {count ?? 0}{" "}
                              {(count ?? 0) === 1
                                ? "attendee"
                                : "attendees"}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <ViewAttendeesDialog
                            activity={activity}
                            onAttendanceUpdated={
                              handleAttendanceChange
                            }
                          >
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={!hasAttendees}
                              aria-label={`View attendees for ${activity.name}`}
                            >
                              View
                            </Button>
                          </ViewAttendeesDialog>

                          <AttendanceDialog
                            activity={activity}
                            onAttendanceSaved={handleAttendanceChange}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              aria-label={`Log attendance for ${activity.name}`}
                            >
                              Log Attendance
                            </Button>
                          </AttendanceDialog>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() =>
                              setDeleteConfirm({ open: true, activity })
                            }
                            disabled={deletingActivityId === activity.id}
                            aria-label={`Delete ${label}`}
                            title={`Delete ${label}`}
                          >
                            {deletingActivityId === activity.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={Search}
              title={
                hasActiveFilters
                  ? `No ${label}s match your filters`
                  : `No ${label}s yet`
              }
              description={
                hasActiveFilters
                  ? "Try adjusting your search or sort."
                  : `Create your first ${label} to start tracking attendance.`
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                ) : (
                  <CreateActivityDialog
                    activityType={type}
                    onActivityCreated={() => fetchActivities(true)}
                  >
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create {label}
                    </Button>
                  </CreateActivityDialog>
                )
              }
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Page {safePage} of {totalPages} (
                {filteredAndSorted.length} {label}s)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.max(1, p - 1))
                  }
                  disabled={safePage <= 1}
                  className="gap-1"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from(
                    { length: Math.min(5, totalPages) },
                    (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) pageNum = i + 1
                      else if (safePage <= 3) pageNum = i + 1
                      else if (safePage >= totalPages - 2)
                        pageNum = totalPages - 4 + i
                      else pageNum = safePage - 2 + i
                      return (
                        <Button
                          key={pageNum}
                          variant={
                            safePage === pageNum ? "default" : "ghost"
                          }
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setCurrentPage(pageNum)}
                          aria-label={`Go to page ${pageNum}`}
                          aria-current={
                            safePage === pageNum ? "page" : undefined
                          }
                        >
                          {pageNum}
                        </Button>
                      )
                    }
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(totalPages, p + 1)
                    )
                  }
                  disabled={safePage >= totalPages}
                  className="gap-1"
                  aria-label="Next page"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}