"use client"

import { useMemo, useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, Users, BarChart3, TrendingUp, Sparkles, SlidersHorizontal } from "lucide-react"
import type { DashboardData } from "@/hooks/use-dashboard-data"

export interface PreacherAnalyticsItem {
  id: string
  name: string
  fullName: string
  email: string
  role?: string
  eventsMade: number
  attendeesCount: number
  avgAttendeesPerEvent: number
  activityBreakdown: {
    maqari: number
    events: number
    lessons: number
    sections: number
  }
}

interface PreacherEventsAttendanceChartProps {
  data: DashboardData
}

export function PreacherEventsAttendanceChart({
  data,
}: PreacherEventsAttendanceChartProps) {
  const [sortBy, setSortBy] = useState<"attendees" | "events" | "avg">("attendees")
  const [viewMode, setViewMode] = useState<"grouped" | "ratio">("grouped")

  // ─── Extract & Calculate Metrics ──────────────────────────────
  const activePreachersData = useMemo(() => {
    if (!data.activities.all || !data.attendance) return []

    // 1. Gather all preachers (from preachers collection + any creators in activities)
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

    // 2. Compute metrics for each preacher
    const items: PreacherAnalyticsItem[] = Array.from(preacherMap.values()).map(
      (p) => {
        // Find all activities created by this preacher
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

        // Find attendance records for these activities where present is true
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

        const displayName =
          p.name.length > 15 ? p.name.slice(0, 15) + "…" : p.name

        return {
          id: p.id,
          name: displayName,
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

    // 3. Filter rule: "any one with zero of these do not show him in the analytics"
    // Only include preachers who have made events (>0) AND have attendees (>0)
    const filtered = items.filter(
      (p) => p.eventsMade > 0 && p.attendeesCount > 0
    )

    // 4. Sort
    return filtered.sort((a, b) => {
      if (sortBy === "events") return b.eventsMade - a.eventsMade
      if (sortBy === "avg")
        return b.avgAttendeesPerEvent - a.avgAttendeesPerEvent
      return b.attendeesCount - a.attendeesCount
    })
  }, [data.preachers, data.activities.all, data.attendance, sortBy])

  // Custom Glassmorphic Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const item: PreacherAnalyticsItem = payload[0]?.payload
    if (!item) return null

    return (
      <div className="rounded-xl border border-border/60 bg-background/95 backdrop-blur-md p-3.5 shadow-xl min-w-[200px] text-xs space-y-2">
        <div className="border-b border-border/40 pb-1.5">
          <p className="font-semibold text-foreground text-sm">
            {item.fullName}
          </p>
          {item.email && (
            <p className="text-[11px] text-muted-foreground truncate">
              {item.email}
            </p>
          )}
        </div>
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
              Events Made
            </span>
            <span className="font-bold text-foreground tabular-nums">
              {item.eventsMade}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 shrink-0" />
              Total Attendees
            </span>
            <span className="font-bold text-foreground tabular-nums">
              {item.attendeesCount}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-border/30 pt-1.5">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-amber-500" />
              Avg / Event
            </span>
            <span className="font-bold text-amber-500 tabular-nums">
              {item.avgAttendeesPerEvent} attendees
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (data.loading) {
    return (
      <Card className="border border-border/50 bg-card/60 backdrop-blur-md">
        <CardHeader>
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-72 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[340px] w-full rounded-xl" />
        </CardContent>
      </Card>
    )
  }

  if (activePreachersData.length === 0) {
    return (
      <Card className="border border-border/50 bg-card/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            Preacher Events & Attendance
          </CardTitle>
          <CardDescription>
            Performance metrics comparing events hosted and attendee engagement.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 mb-3">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-base">No Active Preachers with Events & Attendees Yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
            Preachers who have created at least one event and logged attendance will appear here automatically. Preachers with zero events or zero attendees are hidden.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-border/50 bg-card/60 backdrop-blur-md shadow-xs">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <BarChart3 className="h-5 w-5 text-primary" />
            Preacher Events & Attendance
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm mt-0.5">
            Active preachers ({activePreachersData.length}) with events made & attendee turnout.
          </CardDescription>
        </div>

        {/* View & Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switch */}
          <div className="flex items-center p-0.5 bg-muted/60 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setViewMode("grouped")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                viewMode === "grouped"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Dual Comparison
            </button>
            <button
              type="button"
              onClick={() => setViewMode("ratio")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                viewMode === "ratio"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Avg / Event
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-background/80 border border-border/60 rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="attendees">Sort by Attendees</option>
              <option value="events">Sort by Events</option>
              <option value="avg">Sort by Avg / Event</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === "grouped" ? (
              <BarChart
                data={activePreachersData}
                margin={{ top: 20, right: 20, left: -10, bottom: 25 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted/40"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  className="text-[11px] fill-muted-foreground"
                  interval={0}
                  angle={activePreachersData.length > 5 ? -25 : 0}
                  textAnchor={activePreachersData.length > 5 ? "end" : "middle"}
                  height={activePreachersData.length > 5 ? 50 : 30}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  className="text-[11px] fill-muted-foreground"
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: 15, fontSize: "12px" }}
                  iconType="circle"
                />
                <Bar
                  dataKey="eventsMade"
                  name="Events Made"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  dataKey="attendeesCount"
                  name="Attendees with Him"
                  fill="#6366f1"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            ) : (
              <BarChart
                data={activePreachersData}
                margin={{ top: 20, right: 20, left: -10, bottom: 25 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted/40"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  className="text-[11px] fill-muted-foreground"
                  interval={0}
                  angle={activePreachersData.length > 5 ? -25 : 0}
                  textAnchor={activePreachersData.length > 5 ? "end" : "middle"}
                  height={activePreachersData.length > 5 ? 50 : 30}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  className="text-[11px] fill-muted-foreground"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: 15, fontSize: "12px" }}
                  iconType="circle"
                />
                <Bar
                  dataKey="avgAttendeesPerEvent"
                  name="Avg Attendees / Event"
                  fill="#f59e0b"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
