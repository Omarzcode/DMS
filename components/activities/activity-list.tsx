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
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Calendar,
  Search,
  Plus,
  BookOpen,
  Users,
  Activity as ActivityIcon,
  RefreshCw,
  X,
  ChevronRight,
  AlertCircle,
  Download,
  Trash2,
  Folder,
  FolderOpen,
  FolderPlus,
  FolderInput,
  Pencil,
  MoreVertical,
  CheckCircle2,
  ChevronDown,
  ArrowLeft,
} from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import { Timestamp as FirebaseTimestamp } from "firebase/firestore"
import type {
  Activity as BaseActivity,
  ActivityFolder,
  FirestoreDate,
} from "@/lib/firestore-collections"
import { CreateActivityDialog } from "./create-activity-dialog"
import { AttendanceDialog } from "./attendance-dialog"
import { ViewAttendeesDialog } from "./view-attendees-dialog"
import { CreateFolderDialog } from "./create-folder-dialog"
import { EditFolderDialog } from "./edit-folder-dialog"
import { MoveActivityDialog } from "./move-activity-dialog"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActivityType = "maqari" | "events" | "lessons" | "sections"

type ActivityWithType = BaseActivity & {
  type: string
  description?: string
}

type SortOption =
  | "event-date-desc"
  | "event-date-asc"
  | "newest"
  | "oldest"
  | "name-asc"
  | "name-desc"
  | "most-attended"

export interface ActivityListProps {
  type: ActivityType
  creatorId?: string
  title?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  maqari: "Maqra'a",
  events: "Event",
  lessons: "Lesson",
  sections: "Section",
}

const ACTIVITY_TYPE_ICONS: Record<ActivityType, React.ElementType> = {
  maqari: BookOpen,
  events: Calendar,
  lessons: ActivityIcon,
  sections: Users,
}

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
    return (value as FirebaseTimestamp).toDate()
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

function formatDate(value: FirestoreDate | unknown, formatStr = "PP"): string {
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
  folders: ActivityFolder[],
  type: ActivityType
) {
  const BOM = "\uFEFF"
  const headers = [
    "Name",
    "Type",
    "Creator",
    "Event Date",
    "Attendees",
    "Semester / Day",
    "Description",
  ]
  const rows = activities.map((a) => {
    const assignedFolder = a.folder_id ? folders.find((f) => f.id === a.folder_id) : null
    const parentFolder = assignedFolder?.parent_id ? folders.find((f) => f.id === assignedFolder.parent_id) : null
    const folderPath = assignedFolder
      ? parentFolder
        ? `${parentFolder.name} > ${assignedFolder.name}`
        : assignedFolder.name
      : "Direct / Unassigned"

    return [
      `"${(a.name || "").replace(/"/g, '""')}"`,
      `"${type}"`,
      `"${(a.creator_name || "").replace(/"/g, '""')}"`,
      `"${formatDate(a.event_date || a.created_at)}"`,
      counts[a.id] ?? 0,
      `"${folderPath.replace(/"/g, '""')}"`,
      `"${(a.description || "").replace(/"/g, '""')}"`,
    ]
  })

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute(
    "download",
    `${type}-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`
  )
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  toast.success("CSV export downloaded")
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ActivityList({ type, creatorId, title }: ActivityListProps) {
  const { user } = useAuth()
  const [activities, setActivities] = useState<ActivityWithType[]>([])
  const [attendanceCounts, setAttendanceCounts] = useState<
    Record<string, number>
  >({})
  const [loadingActivities, setLoadingActivities] = useState(true)
  const [loadingCounts, setLoadingCounts] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Google Drive Hierarchical Navigation State ──
  // currentSemesterId: null = Root (showing semester folders list)
  //                    "__unassigned__" = viewing unassigned sessions
  //                    string = semester folder ID (showing days list inside this semester)
  const [currentSemesterId, setCurrentSemesterId] = useState<string | null>(null)

  // currentDayId: null = viewing days list inside semester
  //               string = day folder ID (showing maqari inside this day)
  const [currentDayId, setCurrentDayId] = useState<string | null>(null)

  // Search & Sort state
  const [searchTerm, setSearchTerm] = useState("")
  const [sortOption, setSortOption] = useState<SortOption>("event-date-desc")

  // Folder Data
  const [folders, setFolders] = useState<ActivityFolder[]>([])
  const [loadingFolders, setLoadingFolders] = useState(true)

  // Dialog states for the ONE "+ New" button
  const [createSemesterOpen, setCreateSemesterOpen] = useState(false)
  const [createDayOpen, setCreateDayOpen] = useState(false)
  const [createActivityOpen, setCreateActivityOpen] = useState(false)

  // Editing & Moving dialog states
  const [editingFolder, setEditingFolder] = useState<ActivityFolder | null>(null)
  const [editFolderOpen, setEditFolderOpen] = useState(false)
  const [movingActivity, setMovingActivity] = useState<ActivityWithType | null>(null)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)

  // Delete Activity Confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean
    activity: ActivityWithType | null
  }>({ open: false, activity: null })
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null)

  const searchRef = useRef<HTMLInputElement>(null)
  const Icon = ACTIVITY_TYPE_ICONS[type]
  const label = ACTIVITY_TYPE_LABELS[type]
  const pageTitle = title ?? `All ${label}s`

  // Keyboard shortcut '/' to search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  // ── Fetch Attendance Counts ──
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

  // ── Fetch Activities ──
  const fetchActivities = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoadingActivities(true)
      setError(null)
      try {
        const baseQuery = creatorId
          ? query(collection(db, type), where("creator_id", "==", creatorId))
          : collection(db, type)

        const snapshot = await getDocs(baseQuery)
        const list: ActivityWithType[] = snapshot.docs.map((d) => ({
          ...(d.data() as BaseActivity),
          id: d.id,
          type,
        }))

        setActivities(list)
        await fetchAttendanceCounts(list)

        if (isRefresh) toast.success(`${label}s refreshed`)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load data"
        setError(message)
        toast.error(`Could not load ${label.toLowerCase()}s`)
      } finally {
        setLoadingActivities(false)
        setRefreshing(false)
      }
    },
    [creatorId, fetchAttendanceCounts, label, type]
  )

  // ── Fetch Folders ──
  const fetchFolders = useCallback(async () => {
    try {
      setLoadingFolders(true)
      const snap = await getDocs(collection(db, "folders"))
      const all: ActivityFolder[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ActivityFolder, "id">),
      }))
      const matching = all.filter(
        (f) => !f.category || f.category === type || f.category === "all"
      )
      setFolders(matching)
    } catch (err) {
      console.warn("Folders collection notice:", err)
      setFolders([])
    } finally {
      setLoadingFolders(false)
    }
  }, [type])

  useEffect(() => {
    fetchActivities()
    fetchFolders()
  }, [fetchActivities, fetchFolders])

  // ── Derived Folder Hierarchy ──
  // Semesters (top-level folders with no parent_id)
  const semesterFolders = useMemo(
    () => folders.filter((f) => !f.parent_id),
    [folders]
  )

  // Active selected semester folder object
  const activeSemester = useMemo(() => {
    if (!currentSemesterId || currentSemesterId === "__unassigned__") return null
    return semesterFolders.find((f) => f.id === currentSemesterId) || null
  }, [semesterFolders, currentSemesterId])

  // Day folders inside active semester
  const daysInActiveSemester = useMemo(() => {
    if (!activeSemester) return []
    return folders.filter((f) => f.parent_id === activeSemester.id)
  }, [folders, activeSemester])

  // Active selected day folder object
  const activeDayFolder = useMemo(() => {
    if (!currentDayId) return null
    return folders.find((f) => f.id === currentDayId) || null
  }, [folders, currentDayId])

  // Unassigned direct activities count
  const unassignedActivities = useMemo(
    () => activities.filter((a) => !a.folder_id),
    [activities]
  )

  // Calculate stats for semester folder (sub-days count and total activities inside it)
  const getSemesterStats = useCallback(
    (semId: string) => {
      const subDays = folders.filter((f) => f.parent_id === semId)
      const subDayIds = new Set(subDays.map((f) => f.id))
      const semActivities = activities.filter(
        (a) => a.folder_id === semId || (a.folder_id && subDayIds.has(a.folder_id))
      )
      return {
        daysCount: subDays.length,
        activitiesCount: semActivities.length,
      }
    },
    [folders, activities]
  )

  // Calculate stats for day folder
  const getDayStats = useCallback(
    (dayId: string) => {
      const dayActivities = activities.filter((a) => a.folder_id === dayId)
      return {
        activitiesCount: dayActivities.length,
      }
    },
    [activities]
  )

  // Helper to find folder path for search results
  const getFolderPath = useCallback(
    (folderId?: string | null) => {
      if (!folderId) return "Direct / Unassigned"
      const f = folders.find((item) => item.id === folderId)
      if (!f) return "Unknown Folder"
      if (f.parent_id) {
        const parent = folders.find((p) => p.id === f.parent_id)
        return parent ? `${parent.name} › ${f.name}` : f.name
      }
      return f.name
    },
    [folders]
  )

  // ── Navigation Handlers ──
  const openSemester = (folderId: string) => {
    setCurrentSemesterId(folderId)
    setCurrentDayId(null)
    setSearchTerm("")
  }

  const openDay = (dayId: string) => {
    setCurrentDayId(dayId)
    setSearchTerm("")
  }

  const navigateUp = () => {
    if (currentDayId) {
      setCurrentDayId(null)
    } else if (currentSemesterId) {
      setCurrentSemesterId(null)
    }
  }

  // ── Delete Activity Handler ──
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
        const FIRESTORE_BATCH_LIMIT = 500
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

  const handleAttendanceChange = useCallback(
    (activityId: string, newCount: number) => {
      setAttendanceCounts((prev) => ({
        ...prev,
        [activityId]: newCount,
      }))
    },
    []
  )

  // ── Filtered & Sorted Current Activities ──
  // If search active: searches across entire collection
  // If at Day level: shows activities in current day
  // If at Semester level: shows activities directly in semester (not in day folders)
  // If at Unassigned level: shows unassigned activities
  const displayedActivities = useMemo(() => {
    let list: ActivityWithType[] = []

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim()
      list = activities.filter(
        (a) =>
          a.name?.toLowerCase().includes(q) ||
          a.creator_name?.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q)
      )
    } else if (currentDayId) {
      list = activities.filter((a) => a.folder_id === currentDayId)
    } else if (currentSemesterId === "__unassigned__") {
      list = unassignedActivities
    } else if (activeSemester) {
      list = activities.filter((a) => a.folder_id === activeSemester.id)
    }

    list.sort((a, b) => {
      switch (sortOption) {
        case "event-date-desc":
          return (
            getTimestampMs(b.event_date || b.created_at) -
            getTimestampMs(a.event_date || a.created_at)
          )
        case "event-date-asc":
          return (
            getTimestampMs(a.event_date || a.created_at) -
            getTimestampMs(b.event_date || b.created_at)
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

    return list
  }, [
    searchTerm,
    currentDayId,
    currentSemesterId,
    activeSemester,
    unassignedActivities,
    activities,
    sortOption,
    attendanceCounts,
  ])

  // Context-aware target folder for the ONE "+ New" button
  const currentLevel = useMemo(() => {
    if (searchTerm.trim()) return "search"
    if (currentDayId) return "day"
    if (currentSemesterId === "__unassigned__") return "unassigned"
    if (activeSemester) return "semester"
    return "root"
  }, [searchTerm, currentDayId, currentSemesterId, activeSemester])

  return (
    <div className="space-y-5">
      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── HEADER: Breadcrumbs & The ONE Unified "+ New" Button ──── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b">
        {/* Left: Google Drive Style Breadcrumbs Navigation */}
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          {currentLevel !== "root" && currentLevel !== "search" && (
            <Button
              variant="outline"
              size="sm"
              onClick={navigateUp}
              className="h-8 px-2.5 gap-1.5 text-xs font-medium cursor-pointer shrink-0"
              title="Go back one folder"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </Button>
          )}

          {/* Root Link */}
          <button
            type="button"
            onClick={() => {
              setCurrentSemesterId(null)
              setCurrentDayId(null)
              setSearchTerm("")
            }}
            className={cn(
              "flex items-center gap-2 text-base sm:text-lg font-bold tracking-tight transition-colors cursor-pointer",
              currentSemesterId === null && !searchTerm
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <span>{pageTitle}</span>
          </button>

          {/* Semester Crumb */}
          {activeSemester && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
              <button
                type="button"
                onClick={() => {
                  setCurrentDayId(null)
                  setSearchTerm("")
                }}
                className={cn(
                  "flex items-center gap-1.5 text-base sm:text-lg font-bold tracking-tight transition-colors cursor-pointer truncate max-w-[200px]",
                  currentDayId === null
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title={activeSemester.name}
              >
                <Folder className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">{activeSemester.name}</span>
              </button>
            </>
          )}

          {/* Unassigned Crumb */}
          {currentSemesterId === "__unassigned__" && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
              <span className="flex items-center gap-1.5 text-base sm:text-lg font-bold tracking-tight text-foreground">
                <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>Direct Sessions</span>
              </span>
            </>
          )}

          {/* Day Crumb */}
          {activeDayFolder && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
              <span className="flex items-center gap-1.5 text-base sm:text-lg font-bold tracking-tight text-foreground truncate max-w-[220px]">
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">{activeDayFolder.name}</span>
              </span>
            </>
          )}

          {/* Search Mode Crumb */}
          {searchTerm.trim() && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                Search Results ({displayedActivities.length})
              </span>
            </>
          )}
        </div>

        {/* Right: THE ONLY ONE PRIMARY BUTTON on the page */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className="h-9 px-4 gap-2 font-semibold shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>New</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {/* Option 1: New Folder (Semester if at root, or Day if in semester) */}
              {currentSemesterId === null && (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    setTimeout(() => setCreateSemesterOpen(true), 50)
                  }}
                >
                  <FolderPlus className="h-4 w-4 mr-2 text-primary" />
                  <span>New Semester Folder</span>
                </DropdownMenuItem>
              )}

              {activeSemester && !currentDayId && (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    setTimeout(() => setCreateDayOpen(true), 50)
                  }}
                >
                  <Calendar className="h-4 w-4 mr-2 text-primary" />
                  <span>New Day Folder in {activeSemester.name}</span>
                </DropdownMenuItem>
              )}

              {/* Option 2: New Activity */}
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault()
                  setTimeout(() => setCreateActivityOpen(true), 50)
                }}
              >
                <Icon className="h-4 w-4 mr-2 text-primary" />
                <span>
                  {activeDayFolder
                    ? `New ${label} in ${activeDayFolder.name.split(" ")[0]}`
                    : activeSemester
                    ? `New ${label} in ${activeSemester.name}`
                    : `New ${label}`}
                </span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Utility items housed cleanly inside the one button menu */}
              <DropdownMenuItem
                onClick={() =>
                  exportActivitiesCSV(activities, attendanceCounts, folders, type)
                }
              >
                <Download className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>Export All to CSV</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => fetchActivities(true)}
                disabled={refreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 text-muted-foreground ${
                    refreshing ? "animate-spin" : ""
                  }`}
                />
                <span>Refresh Data</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-3.5 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive flex-1">{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchActivities()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── SEARCH & SORT BAR (Clean & Quiet) ─────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            ref={searchRef}
            placeholder={`Search across all folders... (press "/" to focus)`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 pr-9 pl-9 text-xs sm:text-sm"
            aria-label={`Search ${label}s`}
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 cursor-pointer"
              onClick={() => setSearchTerm("")}
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Sort Select */}
        <Select
          value={sortOption}
          onValueChange={(v) => setSortOption(v as SortOption)}
        >
          <SelectTrigger className="w-full sm:w-52 h-9 text-xs">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="event-date-desc">
              Event Date (Latest first)
            </SelectItem>
            <SelectItem value="event-date-asc">
              Event Date (Soonest first)
            </SelectItem>
            <SelectItem value="newest">Created: Newest</SelectItem>
            <SelectItem value="oldest">Created: Oldest</SelectItem>
            <SelectItem value="name-asc">Name (A → Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z → A)</SelectItem>
            <SelectItem value="most-attended" disabled={loadingCounts}>
              Most Attended{loadingCounts ? " (loading…)" : ""}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── GOOGLE DRIVE CONTENT VIEWER ────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}

      {/* Loading Skeletons */}
      {(loadingActivities || loadingFolders) && (
        <div className="grid gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-border bg-card/50 space-y-3"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loadingActivities && !loadingFolders && (
        <>
          {/* ══════════════════════════════════════════════════════════ */}
          {/* 1. SEARCH RESULTS MODE (Active when search has text) ──── */}
          {/* ══════════════════════════════════════════════════════════ */}
          {searchTerm.trim() ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Found <strong>{displayedActivities.length}</strong> matching &ldquo;{searchTerm}&rdquo; across all folders
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="h-6 text-xs text-primary hover:underline cursor-pointer"
                >
                  Clear search & return to folders
                </Button>
              </div>

              {displayedActivities.length > 0 ? (
                <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
                  {displayedActivities.map((activity) => (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      attendanceCounts={attendanceCounts}
                      loadingCounts={loadingCounts}
                      searchTerm={searchTerm}
                      folderPath={getFolderPath(activity.folder_id)}
                      onAttendanceChange={handleAttendanceChange}
                      onMoveClick={() => {
                        setMovingActivity(activity)
                        setTimeout(() => setMoveDialogOpen(true), 50)
                      }}
                      onDeleteClick={() => {
                        setDeleteConfirm({ open: true, activity })
                      }}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Search}
                  title="No matching activities found"
                  description={`No ${label.toLowerCase()}s matched "${searchTerm}". Try a different keyword.`}
                  action={
                    <Button variant="outline" size="sm" onClick={() => setSearchTerm("")}>
                      Clear Search
                    </Button>
                  }
                />
              )}
            </div>
          ) : currentSemesterId === null ? (
            /* ══════════════════════════════════════════════════════════ */
            /* 2. ROOT LEVEL: Semesters List (Google Drive Folders) ─── */
            /* ══════════════════════════════════════════════════════════ */
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Folder className="h-3.5 w-3.5 text-primary" />
                    <span>Semesters ({semesterFolders.length})</span>
                  </h3>
                </div>

                {semesterFolders.length > 0 || unassignedActivities.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {/* Semester Folder Cards */}
                    {semesterFolders.map((sem) => {
                      const stats = getSemesterStats(sem.id)
                      return (
                        <div
                          key={sem.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => openSemester(sem.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              openSemester(sem.id)
                            }
                          }}
                          className="group relative flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-card hover:bg-muted/40 hover:border-primary/50 transition-all cursor-pointer shadow-2xs select-none"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                              <Folder className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                {sem.name}
                              </h4>
                              <p className="text-xs text-muted-foreground truncate">
                                {stats.daysCount} days · {stats.activitiesCount} {label.toLowerCase()}s
                              </p>
                            </div>
                          </div>

                          {/* 3-dots folder options */}
                          <div onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 cursor-pointer"
                                  aria-label="Folder actions"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault()
                                    setEditingFolder(sem)
                                    setTimeout(() => setEditFolderOpen(true), 50)
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5 mr-2" />
                                  <span>Rename</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onSelect={(e) => {
                                    e.preventDefault()
                                    setEditingFolder(sem)
                                    setTimeout(() => setEditFolderOpen(true), 50)
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                                  <span>Delete Folder</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      )
                    })}

                    {/* Unassigned Sessions Folder Tile (if any direct sessions exist) */}
                    {unassignedActivities.length > 0 && (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => openSemester("__unassigned__")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            openSemester("__unassigned__")
                          }
                        }}
                        className="group relative flex items-center justify-between p-3.5 rounded-xl border border-dashed border-border bg-card/60 hover:bg-muted/40 hover:border-primary/50 transition-all cursor-pointer shadow-2xs select-none"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2.5 rounded-lg bg-muted text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                            <Folder className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                              Direct Sessions
                            </h4>
                            <p className="text-xs text-muted-foreground truncate">
                              {unassignedActivities.length} {label.toLowerCase()}s (no semester)
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/60 mr-2" />
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptyState
                    icon={FolderOpen}
                    title="No semester folders yet"
                    description="Create a semester folder like Fall 26 or Spring 26 to organize your days and activities."
                    action={
                      <Button
                        size="sm"
                        onClick={() => setCreateSemesterOpen(true)}
                        className="gap-2 cursor-pointer"
                      >
                        <FolderPlus className="h-4 w-4" />
                        <span>Create Semester Folder</span>
                      </Button>
                    }
                  />
                )}
              </div>
            </div>
          ) : currentSemesterId === "__unassigned__" ? (
            /* ══════════════════════════════════════════════════════════ */
            /* 3. UNASSIGNED SESSIONS LEVEL ───────────────────────────── */
            /* ══════════════════════════════════════════════════════════ */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  These {label.toLowerCase()}s are not assigned to any semester or day yet. Use the 3-dots menu to move them into a folder.
                </span>
              </div>

              {unassignedActivities.length > 0 ? (
                <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
                  {unassignedActivities.map((activity) => (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      attendanceCounts={attendanceCounts}
                      loadingCounts={loadingCounts}
                      searchTerm=""
                      folderPath="Direct / Unassigned"
                      onAttendanceChange={handleAttendanceChange}
                      onMoveClick={() => {
                        setMovingActivity(activity)
                        setTimeout(() => setMoveDialogOpen(true), 50)
                      }}
                      onDeleteClick={() => {
                        setDeleteConfirm({ open: true, activity })
                      }}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={CheckCircle2}
                  title="All activities organized"
                  description="There are no unassigned activities left. All activities belong to a semester or day folder."
                  action={
                    <Button variant="outline" size="sm" onClick={() => setCurrentSemesterId(null)}>
                      Back to Semesters
                    </Button>
                  }
                />
              )}
            </div>
          ) : activeSemester && !currentDayId ? (
            /* ══════════════════════════════════════════════════════════ */
            /* 4. SEMESTER LEVEL: Days Folders (inside Fall 26, etc.) ──── */
            /* ══════════════════════════════════════════════════════════ */
            <div className="space-y-6">
              {/* Day Folders Grid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span>Days in {activeSemester.name} ({daysInActiveSemester.length})</span>
                  </h3>
                </div>

                {daysInActiveSemester.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {daysInActiveSemester.map((d) => {
                      const stats = getDayStats(d.id)
                      return (
                        <div
                          key={d.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => openDay(d.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              openDay(d.id)
                            }
                          }}
                          className="group relative flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-card hover:bg-muted/40 hover:border-primary/50 transition-all cursor-pointer shadow-2xs select-none"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                              <Calendar className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                {d.name}
                              </h4>
                              <p className="text-xs text-muted-foreground truncate">
                                {stats.activitiesCount} {label.toLowerCase()}s
                              </p>
                            </div>
                          </div>

                          {/* 3-dots day folder menu */}
                          <div onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 cursor-pointer"
                                  aria-label="Day folder actions"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault()
                                    setEditingFolder(d)
                                    setTimeout(() => setEditFolderOpen(true), 50)
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5 mr-2" />
                                  <span>Rename</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onSelect={(e) => {
                                    e.preventDefault()
                                    setEditingFolder(d)
                                    setTimeout(() => setEditFolderOpen(true), 50)
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                                  <span>Delete Day</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon={Calendar}
                    title={`No day folders in ${activeSemester.name} yet`}
                    description="Create day folders (such as Monday or Thursday) to organize your weekly sessions."
                    action={
                      <Button
                        size="sm"
                        onClick={() => setCreateDayOpen(true)}
                        className="gap-2 cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Day (e.g. Monday)</span>
                      </Button>
                    }
                  />
                )}
              </div>

              {/* Direct Activities in this Semester (if any were created directly without a day) */}
              {displayedActivities.length > 0 && (
                <div className="pt-4 border-t space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    <span>Direct Activities in {activeSemester.name} ({displayedActivities.length})</span>
                  </h3>
                  <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
                    {displayedActivities.map((activity) => (
                      <ActivityCard
                        key={activity.id}
                        activity={activity}
                        attendanceCounts={attendanceCounts}
                        loadingCounts={loadingCounts}
                        searchTerm=""
                        folderPath={activeSemester.name}
                        onAttendanceChange={handleAttendanceChange}
                        onMoveClick={() => {
                          setMovingActivity(activity)
                          setTimeout(() => setMoveDialogOpen(true), 50)
                        }}
                        onDeleteClick={() => {
                          setDeleteConfirm({ open: true, activity })
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : activeDayFolder ? (
            /* ══════════════════════════════════════════════════════════ */
            /* 5. DAY LEVEL: Maqari / Activities for this Day ─────────── */
            /* ══════════════════════════════════════════════════════════ */
            <div className="space-y-4">
              {displayedActivities.length > 0 ? (
                <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
                  {displayedActivities.map((activity) => (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      attendanceCounts={attendanceCounts}
                      loadingCounts={loadingCounts}
                      searchTerm=""
                      folderPath={`${activeSemester?.name || ""} › ${activeDayFolder.name}`}
                      onAttendanceChange={handleAttendanceChange}
                      onMoveClick={() => {
                        setMovingActivity(activity)
                        setTimeout(() => setMoveDialogOpen(true), 50)
                      }}
                      onDeleteClick={() => {
                        setDeleteConfirm({ open: true, activity })
                      }}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Icon}
                  title={`No ${label.toLowerCase()}s in ${activeDayFolder.name} yet`}
                  description={`Create your first ${label.toLowerCase()} for this day to track attendance.`}
                  action={
                    <Button
                      size="sm"
                      onClick={() => setCreateActivityOpen(true)}
                      className="gap-2 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>New {label}</span>
                    </Button>
                  }
                />
              )}
            </div>
          ) : null}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── CONTROLLED DIALOGS TRIGGERED VIA THE ONE "+ New" BUTTON ─ */}
      {/* ══════════════════════════════════════════════════════════════ */}

      {/* Create Semester Folder Dialog */}
      <CreateFolderDialog
        category={type}
        open={createSemesterOpen}
        onOpenChange={setCreateSemesterOpen}
        onFolderCreated={(folder) => {
          fetchFolders()
          setCurrentSemesterId(folder.id)
          setCurrentDayId(null)
        }}
      />

      {/* Create Day Folder Dialog (inside active semester) */}
      {activeSemester && (
        <CreateFolderDialog
          category={type}
          parentId={activeSemester.id}
          parentFolder={activeSemester}
          suggestedType="day"
          open={createDayOpen}
          onOpenChange={setCreateDayOpen}
          onFolderCreated={(day) => {
            fetchFolders()
            setCurrentDayId(day.id)
          }}
        />
      )}

      {/* Create Activity Dialog */}
      <CreateActivityDialog
        activityType={type}
        folderId={
          currentDayId
            ? currentDayId
            : currentSemesterId && currentSemesterId !== "__unassigned__"
            ? currentSemesterId
            : null
        }
        folderName={
          activeDayFolder
            ? `${activeSemester?.name || ""} → ${activeDayFolder.name}`
            : activeSemester
            ? activeSemester.name
            : undefined
        }
        open={createActivityOpen}
        onOpenChange={setCreateActivityOpen}
        onActivityCreated={() => fetchActivities(true)}
      />

      {/* Edit / Rename Folder Dialog */}
      <EditFolderDialog
        folder={editingFolder}
        open={editFolderOpen}
        onOpenChange={setEditFolderOpen}
        onFolderUpdated={(updated) => {
          setFolders((prev) =>
            prev.map((f) => (f.id === updated.id ? updated : f))
          )
        }}
        onFolderDeleted={(id) => {
          setFolders((prev) => prev.filter((f) => f.id !== id && f.parent_id !== id))
          if (currentSemesterId === id) {
            setCurrentSemesterId(null)
            setCurrentDayId(null)
          } else if (currentDayId === id) {
            setCurrentDayId(null)
          }
        }}
      />

      {/* Move Activity Dialog */}
      <MoveActivityDialog
        activity={movingActivity}
        activityType={type}
        folders={folders}
        open={moveDialogOpen}
        onOpenChange={(isOpen) => {
          setMoveDialogOpen(isOpen)
          if (!isOpen) {
            setTimeout(() => setMovingActivity(null), 150)
          }
        }}
        onActivityMoved={(actId, newFolderId) => {
          setActivities((prev) =>
            prev.map((a) =>
              a.id === actId ? { ...a, folder_id: newFolderId } : a
            )
          )
        }}
      />

      {/* Confirm Delete Activity Dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) =>
          setDeleteConfirm((prev) => ({ ...prev, open }))
        }
        title={`Delete ${label}?`}
        description={
          deleteConfirm.activity
            ? `Are you sure you want to delete "${deleteConfirm.activity.name}"? All associated attendance records will also be permanently deleted. This cannot be undone.`
            : `Are you sure you want to delete this ${label.toLowerCase()}?`
        }
        confirmText="Delete"
        variant="destructive"
        loading={deletingActivityId !== null}
        onConfirm={handleDeleteActivity}
      />
    </div>
  )
}

// ─── Subcomponent: Activity Card ──────────────────────────────────────────────

interface ActivityCardProps {
  activity: ActivityWithType
  attendanceCounts: Record<string, number>
  loadingCounts: boolean
  searchTerm: string
  folderPath: string
  onAttendanceChange: (activityId: string, count: number) => void
  onMoveClick: () => void
  onDeleteClick: () => void
}

function ActivityCard({
  activity,
  attendanceCounts,
  loadingCounts,
  searchTerm,
  folderPath,
  onAttendanceChange,
  onMoveClick,
  onDeleteClick,
}: ActivityCardProps) {
  const count = attendanceCounts[activity.id]
  const isCountLoading = loadingCounts && count === undefined
  const hasAttendees = typeof count === "number" && count > 0

  const eventDate = getDateFromFirestore(
    activity.event_date || activity.created_at
  )
  const isUpcoming = eventDate ? eventDate > new Date() : false
  const isToday = eventDate
    ? eventDate.toDateString() === new Date().toDateString()
    : false

  return (
    <Card
      className={cn(
        "group transition-all duration-200 hover:shadow-md hover:border-primary/40 flex flex-col justify-between border-border/80",
        isUpcoming && "border-primary/20 bg-primary/[0.015]",
        isToday && "border-success/40 bg-success/[0.015]"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2 min-w-0">
            <span className="truncate">
              <SafeHighlightText text={activity.name} highlight={searchTerm} />
            </span>
          </CardTitle>

          {/* Badges */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {isToday && (
              <Badge className="text-[10px] px-1.5 py-0 bg-success/20 text-success border-success/30 border">
                Today
              </Badge>
            )}
            {isUpcoming && !isToday && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 text-primary border-primary/30"
              >
                Upcoming
              </Badge>
            )}
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20 truncate max-w-[140px]"
              title={folderPath}
            >
              {folderPath}
            </Badge>
          </div>
        </div>

        <CardDescription className="truncate text-xs">
          Created by{" "}
          <SafeHighlightText
            text={activity.creator_name}
            highlight={searchTerm}
          />
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 pt-1">
        {activity.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            <SafeHighlightText
              text={activity.description}
              highlight={searchTerm}
            />
          </p>
        )}

        {/* Date Display */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="font-medium text-foreground">
            {formatDate(activity.event_date || activity.created_at)}
          </span>
          {!activity.event_date && (
            <span className="text-[11px] text-muted-foreground/60">(created)</span>
          )}
        </div>

        {/* Footer: 1 Clean Attendance CTA + 3-dots Menu */}
        <div className="flex items-center justify-between pt-2.5 border-t border-border/60">
          <ViewAttendeesDialog
            activity={activity}
            onAttendanceUpdated={onAttendanceChange}
          >
            <button
              type="button"
              disabled={!hasAttendees}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-colors cursor-pointer",
                hasAttendees
                  ? "text-primary hover:underline font-medium"
                  : "text-muted-foreground cursor-default"
              )}
              title={hasAttendees ? "Click to view attendees" : "No attendees"}
            >
              <Users className="h-3.5 w-3.5" />
              {isCountLoading ? (
                <Skeleton className="h-3.5 w-10" />
              ) : (
                <span>
                  {count ?? 0} {count === 1 ? "attendee" : "attendees"}
                </span>
              )}
            </button>
          </ViewAttendeesDialog>

          <div className="flex items-center gap-1.5">
            <AttendanceDialog
              activity={activity}
              onAttendanceSaved={onAttendanceChange}
            >
              <Button
                size="sm"
                className="h-8 px-3 text-xs gap-1.5 shadow-2xs font-medium cursor-pointer"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Attendance</span>
              </Button>
            </AttendanceDialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Activity options"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <ViewAttendeesDialog
                  activity={activity}
                  onAttendanceUpdated={onAttendanceChange}
                >
                  <DropdownMenuItem
                    disabled={!hasAttendees}
                    onSelect={(e) => {
                      if (!hasAttendees) e.preventDefault()
                    }}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    <span>View Attendees ({count ?? 0})</span>
                  </DropdownMenuItem>
                </ViewAttendeesDialog>

                <DropdownMenuItem onSelect={(e) => {
                  e.preventDefault()
                  onMoveClick()
                }}>
                  <FolderInput className="h-4 w-4 mr-2" />
                  <span>Move to Semester/Day</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={(e) => {
                    e.preventDefault()
                    onDeleteClick()
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  <span>Delete Activity</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}