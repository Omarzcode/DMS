"use client"

import { useState, useMemo } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Trophy,
  Search,
  BookOpen,
  Calendar,
  GraduationCap,
  Users,
  Layers,
  Sparkles,
  Download,
  Clock,
  User,
  ArrowUpDown,
} from "lucide-react"
import type { DashboardData } from "@/hooks/use-dashboard-data"
import { getDateFromTimestamp } from "@/hooks/use-dashboard-data"
import { formatDistanceToNow, format } from "date-fns"
import { ViewAttendeesDialog } from "@/components/activities/view-attendees-dialog"

interface ActivityTopPerformersTableProps {
  data: DashboardData
}

const TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: typeof BookOpen }
> = {
  maqari: {
    label: "Maqra'a",
    color: "text-emerald-400 border-emerald-500/20",
    bg: "bg-emerald-500/10",
    icon: BookOpen,
  },
  events: {
    label: "Event",
    color: "text-blue-400 border-blue-500/20",
    bg: "bg-blue-500/10",
    icon: Calendar,
  },
  lessons: {
    label: "Lesson",
    color: "text-purple-400 border-purple-500/20",
    bg: "bg-purple-500/10",
    icon: GraduationCap,
  },
  sections: {
    label: "Section",
    color: "text-amber-400 border-amber-500/20",
    bg: "bg-amber-500/10",
    icon: Users,
  },
}

export function ActivityTopPerformersTable({
  data,
}: ActivityTopPerformersTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"attendance" | "unique" | "recent">(
    "attendance"
  )
  const [viewLimit, setViewLimit] = useState<number>(20)

  // Pre-calculate attendance stats per activity
  const activitiesWithStats = useMemo(() => {
    // Map activity_id -> { totalCheckIns, uniqueBeneficiaries: Set, lastDate }
    const statsMap = new Map<
      string,
      {
        total: number
        unique: Set<string>
        lastDate: Date | null
      }
    >()

    data.attendance.forEach((rec) => {
      const actId = rec.activity_id
      if (!actId) return

      const isPresent =
        rec.present === true ||
        (rec.present === undefined &&
          (rec as unknown as { attended?: boolean }).attended !== false)

      if (!isPresent) return

      const cur = statsMap.get(actId) || {
        total: 0,
        unique: new Set<string>(),
        lastDate: null,
      }

      cur.total += 1
      if (rec.beneficiary_id) {
        cur.unique.add(rec.beneficiary_id)
      }

      const logDate = getDateFromTimestamp(rec.logged_at)
      if (!cur.lastDate || logDate > cur.lastDate) {
        cur.lastDate = logDate
      }

      statsMap.set(actId, cur)
    })

    return data.activities.all.map((activity) => {
      const stats = statsMap.get(activity.id) || {
        total: 0,
        unique: new Set<string>(),
        lastDate: null,
      }

      const rawType = (activity.type || "").toLowerCase()
      const normalizedType =
        rawType.includes("maqr")
          ? "maqari"
          : rawType.includes("event")
          ? "events"
          : rawType.includes("lesson")
          ? "lessons"
          : rawType.includes("section")
          ? "sections"
          : rawType || "maqari"

      return {
        id: activity.id,
        rawActivity: activity,
        name: activity.name || "Untitled Activity",
        type: normalizedType,
        creatorName: activity.creator_name || "Assigned Da'i",
        description: activity.description || "",
        totalAttendance: stats.total,
        uniqueAttendees: stats.unique.size,
        lastSessionDate: stats.lastDate,
        createdAt: getDateFromTimestamp(activity.created_at),
      }
    })
  }, [data.activities.all, data.attendance])

  // Filter and sort
  const filteredAndSorted = useMemo(() => {
    return activitiesWithStats
      .filter((item) => {
        // Type filter
        if (typeFilter !== "all" && item.type !== typeFilter) {
          return false
        }

        // Search
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase()
          const matchName = item.name.toLowerCase().includes(q)
          const matchCreator = item.creatorName.toLowerCase().includes(q)
          const matchDesc = item.description.toLowerCase().includes(q)
          return matchName || matchCreator || matchDesc
        }

        return true
      })
      .sort((a, b) => {
        if (sortBy === "attendance") {
          return b.totalAttendance - a.totalAttendance
        }
        if (sortBy === "unique") {
          return b.uniqueAttendees - a.uniqueAttendees
        }
        if (sortBy === "recent") {
          const dateA = a.lastSessionDate?.getTime() || 0
          const dateB = b.lastSessionDate?.getTime() || 0
          return dateB - dateA
        }
        return 0
      })
      .slice(0, viewLimit)
  }, [activitiesWithStats, typeFilter, searchTerm, sortBy, viewLimit])

  // CSV Export
  const exportToCsv = () => {
    if (!filteredAndSorted.length) return

    const headers = [
      "Rank",
      "Activity Name",
      "Type",
      "Total Check-ins",
      "Unique Attendees",
      "Creator Da'i",
      "Last Active Date",
    ]

    const rows = filteredAndSorted.map((item, idx) => [
      idx + 1,
      `"${item.name.replace(/"/g, '""')}"`,
      TYPE_CONFIG[item.type]?.label || item.type,
      item.totalAttendance,
      item.uniqueAttendees,
      `"${item.creatorName.replace(/"/g, '""')}"`,
      item.lastSessionDate
        ? format(item.lastSessionDate, "yyyy-MM-dd")
        : "Never",
    ])

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute(
      "download",
      `top_activities_report_${format(new Date(), "yyyy-MM-dd")}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card className="border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden">
      <CardHeader className="p-4 sm:p-6 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Trophy className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl font-bold tracking-tight">
                Top Performing Activities
              </CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Programs ranked by attendance turnout, distinct participants, and recent activity.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCsv}
              className="gap-1.5 text-xs h-9 bg-card hover:bg-muted"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>

            <Select
              value={viewLimit.toString()}
              onValueChange={(val) => setViewLimit(parseInt(val, 10))}
            >
              <SelectTrigger className="h-9 w-[110px] text-xs bg-card">
                <SelectValue placeholder="Show limit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">Top 15</SelectItem>
                <SelectItem value="20">Top 20</SelectItem>
                <SelectItem value="35">Top 35</SelectItem>
                <SelectItem value="50">Top 50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filter & Sort Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 mt-2 border-t border-border/40">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by activity name or da'i..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 text-xs bg-background/50 border-border/60"
            />
          </div>

          {/* Sort By Mode */}
          <Select
            value={sortBy}
            onValueChange={(v) =>
              setSortBy(v as "attendance" | "unique" | "recent")
            }
          >
            <SelectTrigger className="h-9 text-xs bg-background/50 border-border/60">
              <div className="flex items-center gap-1.5 truncate">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
                  {sortBy === "attendance"
                    ? "Sort: Total Check-Ins"
                    : sortBy === "unique"
                    ? "Sort: Unique Attendees"
                    : "Sort: Recently Active"}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="attendance">Highest Attendance</SelectItem>
              <SelectItem value="unique">Most Unique Members</SelectItem>
              <SelectItem value="recent">Most Recently Active</SelectItem>
            </SelectContent>
          </Select>

          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 text-xs bg-background/50 border-border/60">
              <div className="flex items-center gap-1.5 truncate">
                <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
                  {typeFilter === "all"
                    ? "All Activity Types"
                    : TYPE_CONFIG[typeFilter]?.label || typeFilter}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activity Types</SelectItem>
              <SelectItem value="maqari">Maqra&apos;as (Quran Circles)</SelectItem>
              <SelectItem value="events">Events &amp; Lectures</SelectItem>
              <SelectItem value="lessons">Lessons &amp; Classes</SelectItem>
              <SelectItem value="sections">Sections &amp; Halaqat</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {filteredAndSorted.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="p-3 rounded-full bg-muted/40 mb-3 text-muted-foreground">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-foreground text-sm">
              No activities found
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Either no activities match your current filters or search terms.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("")
                setTypeFilter("all")
                setSortBy("attendance")
              }}
              className="mt-4 text-xs"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-4 w-16 text-center">Rank</th>
                    <th className="py-3 px-4">Activity Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-emerald-400">
                        <CheckCircleIcon className="h-3.5 w-3.5" />
                        <span>Total Check-Ins</span>
                      </div>
                    </th>
                    <th className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-blue-400">
                        <Users className="h-3.5 w-3.5" />
                        <span>Unique Attendees</span>
                      </div>
                    </th>
                    <th className="py-3 px-4">Instructor / Da&apos;i</th>
                    <th className="py-3 px-4 text-right">Last Session</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredAndSorted.map((item, index) => {
                    const isTop1 = index === 0
                    const isTop2 = index === 1
                    const isTop3 = index === 2
                    const conf = TYPE_CONFIG[item.type] || TYPE_CONFIG.maqari
                    const Icon = conf.icon

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-muted/30 transition-colors group"
                      >
                        {/* Rank */}
                        <td className="py-3.5 px-4 text-center">
                          {isTop1 ? (
                            <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-black font-extrabold text-xs shadow-md shadow-amber-500/20">
                              1
                            </div>
                          ) : isTop2 ? (
                            <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-tr from-slate-300 to-zinc-100 text-zinc-900 font-bold text-xs shadow-sm">
                              2
                            </div>
                          ) : isTop3 ? (
                            <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-tr from-amber-700 to-amber-500 text-white font-bold text-xs shadow-sm">
                              3
                            </div>
                          ) : (
                            <span className="text-xs font-mono font-medium text-muted-foreground">
                              #{index + 1}
                            </span>
                          )}
                        </td>

                        {/* Name & Description */}
                        <td className="py-3.5 px-4">
                          <ViewAttendeesDialog
                            activity={item.rawActivity}
                            onAttendanceUpdated={data.refresh}
                          >
                            <button
                              type="button"
                              className="font-semibold text-foreground hover:text-primary hover:underline cursor-pointer flex items-center gap-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-sm group/btn"
                              title="Click to view activity details & attendees"
                            >
                              <span>{item.name}</span>
                              {item.totalAttendance >= 20 && (
                                <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                              )}
                            </button>
                          </ViewAttendeesDialog>
                          {item.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
                              {item.description}
                            </p>
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4">
                          <Badge
                            variant="outline"
                            className={`text-[11px] font-medium border gap-1.5 ${conf.color} ${conf.bg}`}
                          >
                            <Icon className="h-3 w-3" />
                            {conf.label}
                          </Badge>
                        </td>

                        {/* Total Attendance */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-card border border-border/80 text-foreground font-mono font-extrabold text-sm shadow-xs">
                            {item.totalAttendance}
                          </span>
                        </td>

                        {/* Unique Attendees */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 font-mono font-bold text-xs border border-blue-500/20">
                            {item.uniqueAttendees}
                          </span>
                        </td>

                        {/* Creator Da'i */}
                        <td className="py-3.5 px-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-muted-foreground/70" />
                            <span>{item.creatorName}</span>
                          </div>
                        </td>

                        {/* Last Session */}
                        <td className="py-3.5 px-4 text-right">
                          {item.lastSessionDate ? (
                            <div className="text-xs font-medium text-foreground">
                              {format(item.lastSessionDate, "MMM d, yyyy")}
                              <div className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(item.lastSessionDate, {
                                  addSuffix: true,
                                })}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              No sessions
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden divide-y divide-border/40">
              {filteredAndSorted.map((item, index) => {
                const isTop1 = index === 0
                const isTop2 = index === 1
                const isTop3 = index === 2
                const conf = TYPE_CONFIG[item.type] || TYPE_CONFIG.maqari
                const Icon = conf.icon

                return (
                  <div
                    key={item.id}
                    className="p-4 space-y-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        {isTop1 ? (
                          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-black font-extrabold text-xs shadow-md">
                            1
                          </div>
                        ) : isTop2 ? (
                          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-tr from-slate-300 to-zinc-100 text-zinc-900 font-bold text-xs shadow-sm">
                            2
                          </div>
                        ) : isTop3 ? (
                          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-tr from-amber-700 to-amber-500 text-white font-bold text-xs shadow-sm">
                            3
                          </div>
                        ) : (
                          <span className="text-xs font-mono font-semibold text-muted-foreground w-6">
                            #{index + 1}
                          </span>
                        )}

                        <div>
                          <ViewAttendeesDialog
                            activity={item.rawActivity}
                            onAttendanceUpdated={data.refresh}
                          >
                            <button
                              type="button"
                              className="font-semibold text-sm text-foreground hover:text-primary hover:underline cursor-pointer flex items-center gap-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-sm"
                              title="Click to view activity details & attendees"
                            >
                              <span>{item.name}</span>
                              {item.totalAttendance >= 20 && (
                                <Sparkles className="h-3 w-3 text-amber-400" />
                              )}
                            </button>
                          </ViewAttendeesDialog>
                          <span className="text-xs text-muted-foreground block mt-0.5">
                            By: {item.creatorName}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={`text-[10px] font-medium border gap-1 ${conf.color} ${conf.bg}`}
                      >
                        <Icon className="h-2.5 w-2.5" />
                        {conf.label}
                      </Badge>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 bg-background/50 p-2.5 rounded-lg border border-border/40 text-center">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-muted-foreground block">
                          Total Check-Ins
                        </span>
                        <span className="font-mono font-extrabold text-foreground text-sm">
                          {item.totalAttendance}
                        </span>
                      </div>
                      <div className="space-y-0.5 border-l border-border/40">
                        <span className="text-[10px] text-muted-foreground block">
                          Unique Attendees
                        </span>
                        <span className="font-mono font-bold text-blue-400 text-sm">
                          {item.uniqueAttendees}
                        </span>
                      </div>
                    </div>

                    {/* Mobile Footer */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {item.lastSessionDate
                            ? `Last active ${formatDistanceToNow(
                                item.lastSessionDate,
                                { addSuffix: true }
                              )}`
                            : "No sessions recorded"}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
