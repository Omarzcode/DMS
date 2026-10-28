"use client"

import { useMemo, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Users,
  Calendar,
  Search,
  ArrowUpDown,
  BookOpen,
  TrendingUp,
  Layers,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"
import type { DashboardData } from "@/hooks/use-dashboard-data"
import type { PreacherAnalyticsItem } from "./preacher-events-attendance-chart"

interface PreacherLeaderboardTableProps {
  data: DashboardData
}

export function PreacherLeaderboardTable({ data }: PreacherLeaderboardTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortKey, setSortKey] = useState<"attendees" | "events" | "avg" | "name">("attendees")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  // ─── Extract & Calculate Preacher Stats ─────────────────────────
  const preacherStats = useMemo(() => {
    if (!data.activities.all || !data.attendance) return []

    const preacherMap = new Map<
      string,
      { id: string; name: string; email: string; role?: string }
    >()

    data.preachers.forEach((p) => {
      preacherMap.set(p.id, {
        id: p.id,
        name: p.name || "Preacher",
        email: p.email || "",
        role: p.role,
      })
    })

    data.activities.all.forEach((act) => {
      if (act.creator_id && !preacherMap.has(act.creator_id)) {
        preacherMap.set(act.creator_id, {
          id: act.creator_id,
          name: act.creator_name || "Preacher",
          email: "",
          role: "da'i",
        })
      } else if (act.creator_name) {
        const found = Array.from(preacherMap.values()).find(
          (p) =>
            p.name.trim().toLowerCase() === act.creator_name.trim().toLowerCase()
        )
        if (!found) {
          preacherMap.set(`name_${act.creator_name}`, {
            id: `name_${act.creator_name}`,
            name: act.creator_name,
            email: "",
            role: "da'i",
          })
        }
      }
    })

    const items: PreacherAnalyticsItem[] = Array.from(preacherMap.values()).map(
      (p) => {
        const activitiesMade = data.activities.all.filter((act) => {
          const idMatch = act.creator_id && act.creator_id === p.id
          const nameMatch =
            act.creator_name &&
            p.name &&
            act.creator_name.trim().toLowerCase() ===
              p.name.trim().toLowerCase()
          return idMatch || nameMatch
        })

        const eventsMade = activitiesMade.length
        const activityIds = new Set(activitiesMade.map((a) => a.id))

        const presentRecords = data.attendance.filter(
          (att) => activityIds.has(att.activity_id) && att.present === true
        )
        const attendeesCount = presentRecords.length

        const avgAttendeesPerEvent =
          eventsMade > 0
            ? Number((attendeesCount / eventsMade).toFixed(1))
            : 0

        const breakdown = {
          maqari: activitiesMade.filter((a) => a.type === "maqari").length,
          events: activitiesMade.filter((a) => a.type === "events").length,
          lessons: activitiesMade.filter((a) => a.type === "lessons").length,
          sections: activitiesMade.filter((a) => a.type === "sections").length,
        }

        return {
          id: p.id,
          name: p.name,
          fullName: p.name,
          email: p.email,
          role: p.role,
          eventsMade,
          attendeesCount,
          avgAttendeesPerEvent,
          activityBreakdown: breakdown,
        }
      }
    )

    // Filter rule: "any one with zero of these do not show him in the analytics"
    const active = items.filter(
      (p) => p.eventsMade > 0 && p.attendeesCount > 0
    )

    // Search filter
    const searched = searchTerm.trim()
      ? active.filter(
          (p) =>
            p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.email.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : active

    // Sort
    return searched.sort((a, b) => {
      let diff = 0
      if (sortKey === "name") {
        diff = a.fullName.localeCompare(b.fullName)
      } else if (sortKey === "events") {
        diff = a.eventsMade - b.eventsMade
      } else if (sortKey === "avg") {
        diff = a.avgAttendeesPerEvent - b.avgAttendeesPerEvent
      } else {
        diff = a.attendeesCount - b.attendeesCount
      }
      return sortDirection === "desc" ? -diff : diff
    })
  }, [data.preachers, data.activities.all, data.attendance, searchTerm, sortKey, sortDirection])

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDirection("desc")
    }
  }

  if (data.loading) {
    return (
      <Card className="border border-border/50 bg-card/60 backdrop-blur-md">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-border/50 bg-card/60 backdrop-blur-md shadow-xs">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <Users className="h-5 w-5 text-primary" />
            Active Preachers Table
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm mt-0.5">
            Showing only preachers who have organized events and engaged attendees.
          </CardDescription>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search preacher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs bg-background/80"
          />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="w-[40%] text-xs font-semibold">
                  <button
                    onClick={() => toggleSort("name")}
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                  >
                    Preacher
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </button>
                </TableHead>
                <TableHead className="text-center text-xs font-semibold">
                  <button
                    onClick={() => toggleSort("events")}
                    className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                  >
                    Events Made
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </button>
                </TableHead>
                <TableHead className="text-center text-xs font-semibold">
                  <button
                    onClick={() => toggleSort("attendees")}
                    className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                  >
                    Attendees with Him
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </button>
                </TableHead>
                <TableHead className="text-center text-xs font-semibold">
                  <button
                    onClick={() => toggleSort("avg")}
                    className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                  >
                    Avg / Event
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </button>
                </TableHead>
                <TableHead className="text-right text-xs font-semibold pr-6">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preacherStats.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-12 text-sm text-muted-foreground"
                  >
                    {searchTerm
                      ? `No active preachers match "${searchTerm}".`
                      : "No active preachers found with both events and attendees."}
                  </TableCell>
                </TableRow>
              ) : (
                preacherStats.map((preacher) => (
                  <TableRow
                    key={preacher.id}
                    className="border-border/30 hover:bg-muted/40 transition-colors"
                  >
                    {/* Preacher Info */}
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 ring-1 ring-border/40 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {preacher.fullName.charAt(0) || "P"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-sm text-foreground truncate">
                            {preacher.fullName}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {preacher.email || "Active Da'i"}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Events Made */}
                    <TableCell className="text-center py-3.5">
                      <div className="inline-flex flex-col items-center">
                        <span className="inline-flex items-center justify-center font-bold text-sm text-emerald-600 dark:text-emerald-400">
                          {preacher.eventsMade}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                          {preacher.activityBreakdown.maqari > 0 && (
                            <span>{preacher.activityBreakdown.maqari} maqra'a</span>
                          )}
                          {preacher.activityBreakdown.events > 0 && (
                            <>
                              <span>·</span>
                              <span>{preacher.activityBreakdown.events} events</span>
                            </>
                          )}
                          {preacher.activityBreakdown.lessons > 0 && (
                            <>
                              <span>·</span>
                              <span>{preacher.activityBreakdown.lessons} lessons</span>
                            </>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Attendees with Him */}
                    <TableCell className="text-center py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                        <Users className="h-3.5 w-3.5" />
                        {preacher.attendeesCount}
                      </span>
                    </TableCell>

                    {/* Avg Turnout per Event */}
                    <TableCell className="text-center py-3.5">
                      <span className="inline-flex items-center gap-1 font-semibold text-xs text-amber-600 dark:text-amber-400">
                        <TrendingUp className="h-3.5 w-3.5" />
                        {preacher.avgAttendeesPerEvent} / event
                      </span>
                    </TableCell>

                    {/* Action */}
                    <TableCell className="text-right py-3.5 pr-6">
                      <Link
                        href={`/admin/activities/maqari?creator=${encodeURIComponent(
                          preacher.id
                        )}`}
                        className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                      >
                        View Activities
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
