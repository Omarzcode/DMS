"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Activity, ActivityFolder, FirestoreDate } from "@/lib/firestore-collections"
import { CreateActivityDialog } from "@/components/activities/create-activity-dialog"
import { AttendanceDialog } from "@/components/activities/attendance-dialog"
import { ViewAttendeesDialog } from "@/components/activities/view-attendees-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Folder,
  Plus,
  Users,
  CheckCircle2,
  ArrowRight,
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
      <div className="rounded-xl border border-border/70 bg-card p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 mb-0.5">
              Workspace Folders
            </div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Maqra&apos;a & Events Directory
            </h2>
            <p className="text-xs text-muted-foreground">
              Select a semester or day circle to create and log sessions directly.
            </p>
          </div>

          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs font-medium self-start sm:self-auto border-border/70 hover:border-primary/40 bg-card/60"
          >
            <Link href="/dashboard/activities/maqari">
              <Plus className="h-3.5 w-3.5 text-primary" />
              <span>Manage Folders</span>
            </Link>
          </Button>
        </div>

        <div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 rounded-xl border border-border/50 bg-muted/10 space-y-2.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : topFolders.length === 0 ? (
            <div className="text-center py-10 px-4 rounded-xl border border-dashed border-border/70 bg-muted/10 space-y-3">
              <Folder className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">No folders configured yet</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Organize your Maqra&apos;a study circles and central events into semesters and weekly day groups.
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
                    className="group min-w-0 flex flex-col justify-between p-4 rounded-xl border border-border/70 bg-muted/15 hover:border-primary/50 hover:bg-muted/25 transition-all duration-200"
                  >
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200">
                            <Folder className="h-4 w-4 shrink-0" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors" title={top.name}>
                              {top.name}
                            </h3>
                            <span className="text-[11px] text-muted-foreground font-mono tabular-nums block truncate">
                              {totalInSemester} {totalInSemester === 1 ? "session" : "sessions"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Sub-day circles */}
                      {subDays.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-border/40 min-w-0">
                          {subDays.map((sub) => {
                            const subCount = folderCounts[sub.id] || 0
                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => handleCreateInFolder(sub.id, `${top.name} > ${sub.name}`, "maqari")}
                                title={`Create session in ${top.name} > ${sub.name}`}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background/80 hover:bg-primary hover:text-primary-foreground text-xs text-foreground/80 hover:text-foreground transition-all border border-border/60 cursor-pointer shadow-2xs max-w-full min-w-0"
                              >
                                <span className="truncate max-w-[140px] sm:max-w-[180px]">{sub.name}</span>
                                <span className="opacity-60 text-[10px] font-mono tabular-nums shrink-0">({subCount})</span>
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground/75 mt-2 pt-2 border-t border-border/40 truncate">
                          Top-level semester folder
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-start mt-3 pt-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleCreateInFolder(top.id, top.name, "maqari")}
                        className="text-primary hover:underline font-medium text-[11px] flex items-center gap-1 cursor-pointer truncate"
                      >
                        <Plus className="h-3 w-3 shrink-0" />
                        <span>Add session in folder</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Section 2: Recent Sessions & Quick Attendance ── */}
      <div className="rounded-xl border border-border/70 bg-card p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 mb-0.5">
              Activity Feed
            </div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Recent Sessions & Quick Attendance
            </h2>
            <p className="text-xs text-muted-foreground">
              Take attendance or review attendee records with one click.
            </p>
          </div>

          <Link
            href="/dashboard/activities/maqari"
            className="text-xs text-primary hover:underline font-medium flex items-center gap-1 self-start sm:self-auto shrink-0 group"
          >
            <span>View all sessions</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-3.5 rounded-lg border border-border/40 flex items-center justify-between">
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
            <div className="divide-y divide-border/50">
              {recentSessions.map((session) => {
                const folderObj = session.folder_id
                  ? folders.find((f) => f.id === session.folder_id)
                  : null
                const isMaqra = session.type === "maqari"

                return (
                  <div
                    key={`${session.type}-${session.id}`}
                    className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-semibold text-sm text-foreground break-words sm:truncate max-w-full sm:max-w-md" title={session.name}>
                          {session.name}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider shrink-0 ${
                            isMaqra
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25"
                              : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25"
                          }`}
                        >
                          {isMaqra ? "Maqra'a" : "Event"}
                        </span>
                        {folderObj && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1 shrink-0">
                            <span>·</span>
                            <Folder className="h-3 w-3 opacity-60 shrink-0" />
                            <span className="truncate max-w-[130px]">{folderObj.name}</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-[11px] text-muted-foreground/90 shrink-0">
                          {formatDate(session.event_date || session.created_at)}
                        </span>
                        {session.creator_name && (
                          <span className="opacity-75 truncate max-w-[160px]">by {session.creator_name}</span>
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
                          className="h-8 text-xs font-medium gap-1.5 shadow-2xs border-border/70 hover:border-primary/40"
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
                          className="h-8 text-xs font-medium gap-1.5 shadow-xs transition-all hover:translate-y-[-1px]"
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
        </div>
      </div>

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
