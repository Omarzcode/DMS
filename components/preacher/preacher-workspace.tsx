"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Activity, ActivityFolder, FirestoreDate } from "@/lib/firestore-collections"
import { CreateActivityDialog } from "@/components/activities/create-activity-dialog"
import { AttendanceDialog } from "@/components/activities/attendance-dialog"
import { ViewAttendeesDialog } from "@/components/activities/view-attendees-dialog"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Folder,
  BookOpen,
  Calendar,
  Plus,
  Users,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  Layers,
  Sparkles,
} from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

type ActivityWithType = Activity & { type: "maqari" | "events" }

function formatDate(val: FirestoreDate | unknown): string {
  if (!val) return "No date set"
  try {
    if (typeof val === "object" && val !== null && "toDate" in val) {
      return format((val as { toDate: () => Date }).toDate(), "MMM d, yyyy")
    }
    const d = new Date(val as string | number)
    return isNaN(d.getTime()) ? "No date set" : format(d, "MMM d, yyyy")
  } catch {
    return "No date set"
  }
}

export function PreacherWorkspace() {
  const [folders, setFolders] = useState<ActivityFolder[]>([])
  const [activities, setActivities] = useState<ActivityWithType[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog state for creating session in a chosen folder
  const [targetFolder, setTargetFolder] = useState<{ id: string | null; name?: string; type: "maqari" | "events" } | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [foldersSnap, maqariSnap, eventsSnap] = await Promise.all([
        getDocs(collection(db, "folders")),
        getDocs(collection(db, "maqari")),
        getDocs(collection(db, "events")),
      ])

      const fList = foldersSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as ActivityFolder[]

      const mList: ActivityWithType[] = maqariSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        type: "maqari" as const,
      })) as ActivityWithType[]

      const eList: ActivityWithType[] = eventsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        type: "events" as const,
      })) as ActivityWithType[]

      setFolders(fList)
      setActivities([...mList, ...eList])
    } catch (err) {
      console.error("Error loading workspace data:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Top level semester folders
  const topFolders = useMemo(() => {
    return folders.filter((f) => !f.parent_id)
  }, [folders])

  // Count sessions per folder
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const a of activities) {
      if (a.folder_id) {
        counts[a.folder_id] = (counts[a.folder_id] || 0) + 1
      }
    }
    return counts
  }, [activities])

  // Recent activities sorted by creation / event date
  const recentSessions = useMemo(() => {
    return [...activities]
      .sort((a, b) => {
        const da = a.event_date || a.created_at
        const db = b.event_date || b.created_at
        const ta = da && typeof da === "object" && "toDate" in da ? (da as any).toDate().getTime() : 0
        const tb = db && typeof db === "object" && "toDate" in db ? (db as any).toDate().getTime() : 0
        return tb - ta
      })
      .slice(0, 6)
  }, [activities])

  const handleCreateInFolder = (folderId: string | null, folderName?: string, type: "maqari" | "events" = "maqari") => {
    setTargetFolder({ id: folderId, name: folderName, type })
    setIsCreateOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* ── Section 1: Chosen Folders Quick Navigator ── */}
      <Card className="border border-border/70 shadow-xs backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="space-y-1">
            <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              <Folder className="h-5 w-5 text-primary" />
              <span>Maqra'a & Events Folders</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Select a folder or day circle below to create sessions directly inside it.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-3.5 rounded-xl border border-border/40 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : topFolders.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-xl border border-dashed border-border/70 bg-muted/20 space-y-3">
              <Folder className="h-8 w-8 mx-auto text-muted-foreground/60" />
              <div className="space-y-1">
                <p className="text-sm font-semibold">No folders created yet</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Organize your Maqra'a and Events into semesters and weekly day circles.
                </p>
              </div>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
              >
                <Link href="/dashboard/activities/maqari">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create First Folder</span>
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {topFolders.map((top) => {
                const subDays = folders.filter((f) => f.parent_id === top.id)
                const topCount = folderCounts[top.id] || 0
                const totalInSemester =
                  topCount +
                  subDays.reduce((sum, d) => sum + (folderCounts[d.id] || 0), 0)

                return (
                  <div
                    key={top.id}
                    className="group flex flex-col justify-between p-3.5 rounded-xl border border-border/60 bg-card/60 hover:border-primary/40 hover:shadow-xs transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-semibold text-sm text-foreground flex items-center gap-1.5 truncate">
                          <Folder className="h-4 w-4 text-primary shrink-0" />
                          <span className="truncate">{top.name}</span>
                        </span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium shrink-0">
                          {totalInSemester} {totalInSemester === 1 ? "session" : "sessions"}
                        </Badge>
                      </div>

                      {/* Sub-day circles */}
                      {subDays.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {subDays.map((sub) => {
                            const subCount = folderCounts[sub.id] || 0
                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => handleCreateInFolder(sub.id, `${top.name} > ${sub.name}`, "maqari")}
                                title={`Create session in ${top.name} > ${sub.name}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 hover:bg-primary/10 hover:text-primary text-[11px] text-muted-foreground transition-colors border border-border/40"
                              >
                                <span>{sub.name}</span>
                                <span className="opacity-60 text-[9px]">({subCount})</span>
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground/75 mt-1">
                          Top-level semester folder
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-start mt-3 pt-2.5 border-t border-border/40 text-xs">
                      <button
                        type="button"
                        onClick={() => handleCreateInFolder(top.id, top.name, "maqari")}
                        className="text-primary hover:underline font-medium text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add in this folder</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 2: Recent Sessions & Quick Attendance ── */}
      <Card className="border border-border/70 shadow-xs backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="space-y-1">
            <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <span>Recent Sessions & Attendance</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Take attendance or review past attendee records with one click.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-3 rounded-lg border border-border/40 flex items-center justify-between">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : recentSessions.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No recent sessions found. Click &ldquo;+ New Session&rdquo; above to create one.
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {recentSessions.map((session) => {
                const folderObj = session.folder_id
                  ? folders.find((f) => f.id === session.folder_id)
                  : null
                const isMaqra = session.type === "maqari"

                return (
                  <div
                    key={`${session.type}-${session.id}`}
                    className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground truncate">
                          {session.name}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            isMaqra
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px]"
                              : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-[10px]"
                          }
                        >
                          {isMaqra ? "Maqra'a" : "Event"}
                        </Badge>
                        {folderObj && (
                          <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0 font-normal">
                            <Folder className="h-2.5 w-2.5" />
                            <span>{folderObj.name}</span>
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-3">
                        <span>{formatDate(session.event_date || session.created_at)}</span>
                        {session.creator_name && (
                          <span className="opacity-75">by {session.creator_name}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      <ViewAttendeesDialog
                        activity={session}
                        activityId={session.id}
                        activityName={session.name}
                        activityType={session.type}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1.5 shadow-2xs"
                        >
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Attendees</span>
                        </Button>
                      </ViewAttendeesDialog>

                      <AttendanceDialog
                        activity={{ ...session, type: session.type }}
                        activityId={session.id}
                        activityName={session.name}
                        activityType={session.type}
                        onAttendanceSaved={loadData}
                      >
                        <Button
                          size="sm"
                          className="h-8 text-xs gap-1.5 shadow-xs"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Take Attendance</span>
                        </Button>
                      </AttendanceDialog>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Target Folder Activity Creation Modal */}
      <CreateActivityDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        folderId={targetFolder?.id}
        folderName={targetFolder?.name}
        activityType={targetFolder?.type || "maqari"}
        onActivityCreated={() => {
          loadData()
          setIsCreateOpen(false)
        }}
      />
    </div>
  )
}
