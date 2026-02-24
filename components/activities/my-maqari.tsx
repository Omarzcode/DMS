"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  deleteDoc,
  getCountFromServer,
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
  BookOpen,
  Search,
  Plus,
  Calendar,
  Users,
  Trash2,
  AlertCircle,
  RefreshCw,
  X,
  Loader2,
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import type { Activity } from "@/lib/firestore-collections"
import { CreateActivityDialog } from "./create-activity-dialog"
import { AttendanceDialog } from "./attendance-dialog"
import { ViewAttendeesDialog } from "./view-attendees-dialog"

// ─── Constants ───────────────────────────────────────────────────

const FIRESTORE_BATCH_LIMIT = 500
const ATTENDANCE_BATCH_SIZE = 10

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

function formatDate(timestamp: unknown): string {
  if (!timestamp) return ""
  try {
    if (typeof timestamp === "object" && timestamp !== null && "seconds" in timestamp) {
      return format(
        new Date((timestamp as { seconds: number }).seconds * 1000),
        "PPp"
      )
    }
    const date = new Date(timestamp as string | number)
    return isNaN(date.getTime()) ? "" : format(date, "PPp")
  } catch {
    return ""
  }
}

// ─── Component ───────────────────────────────────────────────────

export function MyMaqari() {
  const { user } = useAuth()
  const [maqari, setMaqari] = useState<Activity[]>([])
  const [attendanceCounts, setAttendanceCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [loadingCounts, setLoadingCounts] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean
    id: string
    name: string
  }>({ open: false, id: "", name: "" })

  // ─── Data Fetching ───────────────────────────────────────────

  const fetchMaqari = useCallback(
    async (isRefresh = false) => {
      if (!user) return

      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      try {
        const q = query(
          collection(db, "maqari"),
          where("creator_id", "==", user.uid)
        )
        const querySnapshot = await getDocs(q)
        const maqariData = querySnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as Activity))
          .sort(
            (a, b) =>
              ((b.created_at as any)?.seconds || 0) -
              ((a.created_at as any)?.seconds || 0)
          )

        setMaqari(maqariData)

        // Fetch attendance counts in parallel batches
        await fetchAttendanceCounts(maqariData)

        if (isRefresh) {
          toast.success("Maqari refreshed")
        }
      } catch (err) {
        console.error("Error fetching maqari:", err)
        setError("Failed to load maqari. Please try again.")
        toast.error("Failed to load maqari")
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [user]
  )

  const fetchAttendanceCounts = async (maqariList: Activity[]) => {
    if (maqariList.length === 0) return

    setLoadingCounts(true)
    const counts: Record<string, number> = {}

    try {
      for (let i = 0; i < maqariList.length; i += ATTENDANCE_BATCH_SIZE) {
        const batch = maqariList.slice(i, i + ATTENDANCE_BATCH_SIZE)
        const results = await Promise.all(
          batch.map(async (maqra) => {
            try {
              const attendanceQuery = query(
                collection(db, "attendance"),
                where("activity_id", "==", maqra.id),
                where("present", "==", true)
              )
              const snapshot = await getCountFromServer(attendanceQuery)
              return { id: maqra.id, count: snapshot.data().count }
            } catch {
              return { id: maqra.id, count: 0 }
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
    if (user) fetchMaqari()
  }, [user, fetchMaqari])

  // ─── Filtering (useMemo) ─────────────────────────────────────

  const filteredMaqari = useMemo(() => {
    if (!searchTerm.trim()) return maqari

    const lowered = searchTerm.toLowerCase().trim()
    return maqari.filter(
      (m) =>
        m.name?.toLowerCase().includes(lowered) ||
        m.description?.toLowerCase().includes(lowered)
    )
  }, [maqari, searchTerm])

  // ─── Handlers ────────────────────────────────────────────────

  const handleAttendanceSaved = useCallback(
    (activityId: string, newCount: number) => {
      setAttendanceCounts((prev) => ({ ...prev, [activityId]: newCount }))
    },
    []
  )

  const handleDeleteMaqra = useCallback(async () => {
    const { id, name } = deleteConfirm
    if (!id) return

    setDeleteConfirm((prev) => ({ ...prev, open: false }))
    setDeletingId(id)

    try {
      // Delete associated attendance records first
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("activity_id", "==", id)
      )
      const attendanceSnapshot = await getDocs(attendanceQuery)

      if (attendanceSnapshot.size > 0) {
        const docs = attendanceSnapshot.docs
        for (let i = 0; i < docs.length; i += FIRESTORE_BATCH_LIMIT) {
          const batch = writeBatch(db)
          const chunk = docs.slice(i, i + FIRESTORE_BATCH_LIMIT)
          chunk.forEach((docSnap) => batch.delete(docSnap.ref))
          await batch.commit()
        }
      }

      // Delete the maqra itself
      await deleteDoc(doc(db, "maqari", id))

      // Update local state
      setMaqari((prev) => prev.filter((m) => m.id !== id))
      setAttendanceCounts((prev) => {
        const updated = { ...prev }
        delete updated[id]
        return updated
      })

      toast.success("Maqra'a deleted", {
        description: `"${name}" and its attendance records have been removed.`,
      })
    } catch (err) {
      console.error("Error deleting maqra:", err)
      toast.error("Failed to delete maqra'a")
    } finally {
      setDeletingId(null)
    }
  }, [deleteConfirm])

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="h-6 w-6" />
          <h2 className="text-xl sm:text-2xl font-bold truncate">
            My Maqari
          </h2>
          <Badge variant="secondary">{maqari.length}</Badge>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchMaqari(true)}
            disabled={refreshing}
            title="Refresh"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
          <CreateActivityDialog
            activityType="maqari"
            onActivityCreated={() => fetchMaqari(true)}
          >
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Maqra&apos;a</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </CreateActivityDialog>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive flex-1">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchMaqari()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search maqari by name or description..."
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

      {/* Results count */}
      {!loading && searchTerm && (
        <p className="text-sm text-muted-foreground">
          {filteredMaqari.length} of {maqari.length} maqari match your search
        </p>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
                <Skeleton className="h-4 w-24 mt-1" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <div className="flex items-center justify-between pt-2">
                  <Skeleton className="h-4 w-24" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-16 rounded" />
                    <Skeleton className="h-8 w-20 rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Maqari Grid */}
      {!loading && (
        <>
          {filteredMaqari.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMaqari.map((maqra) => {
                const count = attendanceCounts[maqra.id]
                const isCountLoading = loadingCounts && count === undefined
                const isDeleting = deletingId === maqra.id
                const dateStr = formatDate(maqra.created_at)

                return (
                  <Card
                    key={maqra.id}
                    className={`
                      group hover:shadow-md transition-all duration-200 hover:border-primary/30
                      ${isDeleting ? "opacity-50 pointer-events-none" : ""}
                    `}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg flex items-center gap-2 min-w-0">
                          <div className="p-1.5 rounded-md bg-primary/10 flex-shrink-0">
                            <BookOpen className="h-4 w-4 text-primary" />
                          </div>
                          <span className="truncate">
                            <SafeHighlightText
                              text={maqra.name}
                              highlight={searchTerm}
                            />
                          </span>
                        </CardTitle>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                          onClick={() =>
                            setDeleteConfirm({
                              open: true,
                              id: maqra.id,
                              name: maqra.name,
                            })
                          }
                          disabled={isDeleting}
                          title="Delete maqra'a"
                        >
                          {isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {dateStr && (
                        <CardDescription className="flex items-center gap-1.5 text-xs">
                          <Calendar className="h-3 w-3" />
                          {dateStr}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-3">
                      {maqra.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          <SafeHighlightText
                            text={maqra.description}
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
                            activity={{ ...maqra, type: "maqari" }}
                            onAttendanceUpdated={handleAttendanceSaved}
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
                            activity={{ ...maqra, type: "maqari" }}
                            onAttendanceSaved={handleAttendanceSaved}
                          >
                            <Button variant="outline" size="sm">
                              Log Attendance
                            </Button>
                          </AttendanceDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={searchTerm ? Search : BookOpen}
              title={
                searchTerm
                  ? "No maqari match your search"
                  : "No maqari yet"
              }
              description={
                searchTerm
                  ? "Try adjusting your search term."
                  : "Create your first maqra'a to start tracking attendance."
              }
              action={
                searchTerm ? (
                  <Button
                    variant="outline"
                    onClick={() => setSearchTerm("")}
                  >
                    Clear Search
                  </Button>
                ) : (
                  <CreateActivityDialog
                    activityType="maqari"
                    onActivityCreated={() => fetchMaqari(true)}
                  >
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Maqra&apos;a
                    </Button>
                  </CreateActivityDialog>
                )
              }
            />
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) =>
          setDeleteConfirm((prev) => ({ ...prev, open }))
        }
        onConfirm={handleDeleteMaqra}
        title="Delete this maqra'a?"
        description={`This will permanently delete "${deleteConfirm.name}" and all its attendance records. This action cannot be undone.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
      />
    </div>
  )
}
