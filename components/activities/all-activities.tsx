"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  collection,
  getDocs,
  query,
  where,
  getCountFromServer,
} from "firebase/firestore"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Calendar,
  Search,
  Plus,
  BookOpen,
  Users,
  Activity as ActivityIcon,
  RefreshCw,
  X,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import type { Activity as BaseActivity } from "@/lib/firestore-collections"
import { CreateActivityDialog } from "./create-activity-dialog"
import { AttendanceDialog } from "./attendance-dialog"
import { ViewAttendeesDialog } from "./view-attendees-dialog"

// ─── Types ───────────────────────────────────────────────────────

type Activity = BaseActivity & {
  description?: string
  creator_name: string
  name: string
  created_at?: { seconds: number }
}

type ActivityWithType = Activity & { type: string }

type SortOption = "newest" | "oldest" | "name-asc" | "name-desc" | "most-attended"

// ─── Constants ───────────────────────────────────────────────────

const ACTIVITY_TYPES = ["maqari", "events", "lessons", "sections"] as const

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  maqari: "Maqra'a",
  events: "Event",
  lessons: "Lesson",
  sections: "Section",
}

const ACTIVITY_TYPE_ICONS: Record<string, React.ElementType> = {
  maqari: BookOpen,
  events: Calendar,
  lessons: ActivityIcon,
  sections: Users,
}

const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  maqari: "bg-blue-100 text-blue-800 border-blue-200",
  events: "bg-purple-100 text-purple-800 border-purple-200",
  lessons: "bg-green-100 text-green-800 border-green-200",
  sections: "bg-orange-100 text-orange-800 border-orange-200",
}

const PAGE_SIZE = 12

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

function getDateFromTimestamp(timestamp: unknown): Date | null {
  if (!timestamp) return null
  if (typeof timestamp === "object" && timestamp !== null && "seconds" in timestamp) {
    return new Date((timestamp as { seconds: number }).seconds * 1000)
  }
  try {
    const date = new Date(timestamp as string | number)
    return isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

function formatDate(timestamp: unknown, formatStr: string = "PPp"): string {
  const date = getDateFromTimestamp(timestamp)
  if (!date) return "Unknown date"
  try {
    return format(date, formatStr)
  } catch {
    return "Invalid date"
  }
}

// ─── Component ───────────────────────────────────────────────────

export function AllActivities() {
  const [activities, setActivities] = useState<ActivityWithType[]>([])
  const [attendanceCounts, setAttendanceCounts] = useState<Record<string, number>>({})
  const [loadingActivities, setLoadingActivities] = useState(true)
  const [loadingCounts, setLoadingCounts] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [sortOption, setSortOption] = useState<SortOption>("newest")
  const [currentPage, setCurrentPage] = useState(1)

  // ─── Data Fetching ───────────────────────────────────────────

  const fetchActivities = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoadingActivities(true)
    }
    setError(null)

    try {
      // Fetch all activity types in parallel
      const snapshots = await Promise.all(
        ACTIVITY_TYPES.map((type) => getDocs(collection(db, type)))
      )

      const allActivities: ActivityWithType[] = snapshots.flatMap(
        (snapshot, index) =>
          snapshot.docs.map((doc) => ({
            ...(doc.data() as Activity),
            id: doc.id,
            type: ACTIVITY_TYPES[index],
          }))
      )

      setActivities(allActivities)

      // Fetch attendance counts in parallel batches (not one-by-one)
      await fetchAttendanceCounts(allActivities)

      if (isRefresh) {
        toast.success("Activities refreshed")
      }
    } catch (err) {
      console.error("Error fetching activities:", err)
      setError("Failed to load activities. Please try again.")
      toast.error("Failed to load activities")
    } finally {
      setLoadingActivities(false)
      setRefreshing(false)
    }
  }, [])

  const fetchAttendanceCounts = async (activitiesList: ActivityWithType[]) => {
    if (activitiesList.length === 0) return

    setLoadingCounts(true)
    const counts: Record<string, number> = {}

    try {
      // Process in parallel batches of 10 to avoid overwhelming Firestore
      const BATCH_SIZE = 10
      for (let i = 0; i < activitiesList.length; i += BATCH_SIZE) {
        const batch = activitiesList.slice(i, i + BATCH_SIZE)
        const results = await Promise.all(
          batch.map(async (activity) => {
            try {
              const attendanceQuery = query(
                collection(db, "attendance"),
                where("activity_id", "==", activity.id),
                where("present", "==", true)
              )
              const snapshot = await getCountFromServer(attendanceQuery)
              return { id: activity.id, count: snapshot.data().count }
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
  }

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, typeFilter, sortOption])

  // ─── Filtering, Sorting, Pagination (useMemo) ────────────────

  const filteredAndSortedActivities = useMemo(() => {
    let result = [...activities]

    // Search
    if (searchTerm.trim()) {
      const lowered = searchTerm.toLowerCase().trim()
      result = result.filter(
        (a) =>
          a.name?.toLowerCase().includes(lowered) ||
          a.creator_name?.toLowerCase().includes(lowered) ||
          a.description?.toLowerCase().includes(lowered)
      )
    }

    // Type filter
    if (typeFilter !== "all") {
      result = result.filter((a) => a.type === typeFilter)
    }

    // Sort
    result.sort((a, b) => {
      switch (sortOption) {
        case "newest":
          return (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0)
        case "oldest":
          return (a.created_at?.seconds || 0) - (b.created_at?.seconds || 0)
        case "name-asc":
          return (a.name || "").localeCompare(b.name || "")
        case "name-desc":
          return (b.name || "").localeCompare(a.name || "")
        case "most-attended":
          return (attendanceCounts[b.id] || 0) - (attendanceCounts[a.id] || 0)
        default:
          return 0
      }
    })

    return result
  }, [activities, searchTerm, typeFilter, sortOption, attendanceCounts])

  const totalPages = Math.ceil(filteredAndSortedActivities.length / PAGE_SIZE)

  const paginatedActivities = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredAndSortedActivities.slice(start, start + PAGE_SIZE)
  }, [filteredAndSortedActivities, currentPage])

  // ─── Stats ───────────────────────────────────────────────────

  const stats = useMemo(() => {
    const typeCounts: Record<string, number> = {}
    ACTIVITY_TYPES.forEach((type) => {
      typeCounts[type] = activities.filter((a) => a.type === type).length
    })

    const totalAttendees = Object.values(attendanceCounts).reduce(
      (sum, count) => sum + count,
      0
    )

    return { typeCounts, totalAttendees }
  }, [activities, attendanceCounts])

  // ─── Handlers ────────────────────────────────────────────────

  const handleAttendanceChange = useCallback(
    (activityId: string, newCount: number) => {
      setAttendanceCounts((prev) => ({ ...prev, [activityId]: newCount }))
    },
    []
  )

  const clearFilters = () => {
    setSearchTerm("")
    setTypeFilter("all")
    setSortOption("newest")
  }

  const hasActiveFilters =
    searchTerm !== "" || typeFilter !== "all" || sortOption !== "newest"

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="h-6 w-6" />
          <h2 className="text-xl sm:text-2xl font-bold truncate">
            All Activities
          </h2>
          <Badge variant="secondary">{activities.length}</Badge>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchActivities(true)}
            disabled={refreshing}
            title="Refresh"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
          <CreateActivityDialog onActivityCreated={() => fetchActivities(true)}>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Activity</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </CreateActivityDialog>
        </div>
      </div>

      {/* Stats Summary */}
      {!loadingActivities && activities.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{activities.length}</div>
              <div className="text-xs text-muted-foreground">
                Total Activities
              </div>
            </CardContent>
          </Card>

          {ACTIVITY_TYPES.map((type) => {
            const Icon = ACTIVITY_TYPE_ICONS[type] || Calendar
            return (
              <Card key={type}>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold">
                      {stats.typeCounts[type] || 0}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {ACTIVITY_TYPE_LABELS[type]}
                  </div>
                </CardContent>
              </Card>
            )
          })}

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.totalAttendees}</div>
              <div className="text-xs text-muted-foreground">
                Total Attendees
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-destructive">{error}</p>
            </div>
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

      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search activities by name, creator, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10"
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

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(ACTIVITY_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sortOption}
            onValueChange={(v) => setSortOption(v as SortOption)}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="name-asc">Name (A → Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z → A)</SelectItem>
              <SelectItem value="most-attended">Most Attended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters */}
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
                  onClick={() => setSearchTerm("")}
                />
              </Badge>
            )}

            {typeFilter !== "all" && (
              <Badge variant="secondary" className="gap-2">
                Type: {ACTIVITY_TYPE_LABELS[typeFilter]}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => setTypeFilter("all")}
                />
              </Badge>
            )}

            {sortOption !== "newest" && (
              <Badge variant="secondary" className="gap-2">
                Sort:{" "}
                {sortOption === "oldest"
                  ? "Oldest"
                  : sortOption === "name-asc"
                    ? "Name A-Z"
                    : sortOption === "name-desc"
                      ? "Name Z-A"
                      : "Most Attended"}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => setSortOption("newest")}
                />
              </Badge>
            )}

            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7">
              Clear All
            </Button>
          </div>
        )}

        {/* Results count */}
        {!loadingActivities && (
          <div className="text-sm text-muted-foreground">
            Showing {filteredAndSortedActivities.length} of {activities.length}{" "}
            activities
          </div>
        )}
      </div>

      {/* Loading Skeletons */}
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
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Activities Grid */}
      {!loadingActivities && (
        <>
          {paginatedActivities.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paginatedActivities.map((activity) => {
                const IconComponent =
                  ACTIVITY_TYPE_ICONS[activity.type] || Calendar
                const colorClass =
                  ACTIVITY_TYPE_COLORS[activity.type] || ""
                const count = attendanceCounts[activity.id]
                const isCountLoading = loadingCounts && count === undefined

                return (
                  <Card
                    key={`${activity.type}-${activity.id}`}
                    className="group hover:shadow-md transition-all duration-200 hover:border-primary/30"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg flex items-center gap-2 min-w-0">
                          <div className="p-1.5 rounded-md bg-muted flex-shrink-0">
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <span className="truncate">
                            <SafeHighlightText
                              text={activity.name}
                              highlight={searchTerm}
                            />
                          </span>
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className={`flex-shrink-0 text-xs ${colorClass}`}
                        >
                          {ACTIVITY_TYPE_LABELS[activity.type]}
                        </Badge>
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

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
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
                            onAttendanceUpdated={handleAttendanceChange}
                          >
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={!count || count === 0}
                            >
                              View
                            </Button>
                          </ViewAttendeesDialog>
                          <AttendanceDialog
                            activity={activity}
                            onAttendanceSaved={handleAttendanceChange}
                          >
                            <Button variant="outline" size="sm">
                              Log Attendance
                            </Button>
                          </AttendanceDialog>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Created: {formatDate(activity.created_at)}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={hasActiveFilters ? Search : Calendar}
              title={
                hasActiveFilters
                  ? "No activities match your filters"
                  : "No activities yet"
              }
              description={
                hasActiveFilters
                  ? "Try adjusting your search or filter criteria."
                  : "Create your first activity to start tracking attendance."
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                ) : (
                  <CreateActivityDialog
                    onActivityCreated={() => fetchActivities(true)}
                  >
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Activity
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
                Page {currentPage} of {totalPages} (
                {filteredAndSortedActivities.length} activities)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.max(1, p - 1))
                  }
                  disabled={currentPage <= 1}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from(
                    { length: Math.min(5, totalPages) },
                    (_, i) => {
                      let pageNum = i + 1
                      if (totalPages > 5) {
                        if (currentPage <= 3) pageNum = i + 1
                        else if (currentPage >= totalPages - 2)
                          pageNum = totalPages - 4 + i
                        else pageNum = currentPage - 2 + i
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={
                            currentPage === pageNum ? "default" : "ghost"
                          }
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setCurrentPage(pageNum)}
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
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage >= totalPages}
                  className="gap-1"
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