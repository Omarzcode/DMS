"use client"

import { useState, useMemo } from "react"
import {
  AreaChart,
  Area,
  LineChart,
  Line,
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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  TrendingUp,
  Activity,
  Calendar,
  Download,
  Filter,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  BookOpen,
  GraduationCap,
  Users,
} from "lucide-react"
import {
  format,
  subWeeks,
  startOfWeek,
  endOfWeek,
  eachWeekOfInterval,
} from "date-fns"
import type { DashboardData } from "@/hooks/use-dashboard-data"
import { getDateFromTimestamp } from "@/hooks/use-dashboard-data"

interface AttendanceTrendChartProps {
  data: DashboardData
}

type TimeWindow = 4 | 8 | 12 | 24
type ChartType = "area" | "lines" | "bars"

const CATEGORIES = [
  { id: "maqari", label: "Maqra'a", color: "#10b981", icon: BookOpen },
  { id: "events", label: "Events", color: "#3b82f6", icon: Calendar },
  { id: "lessons", label: "Lessons", color: "#a855f7", icon: GraduationCap },
  { id: "sections", label: "Sections", color: "#f59e0b", icon: Users },
] as const

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color: string
    dataKey: string
  }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null

  // Calculate sum of individual categories if present
  const total = payload.reduce((acc, curr) => {
    if (curr.dataKey !== "total") {
      return acc + (curr.value || 0)
    }
    return acc
  }, 0)

  const directTotal = payload.find((p) => p.dataKey === "total")?.value ?? total

  return (
    <div className="rounded-xl border border-border/80 bg-background/95 backdrop-blur-md p-3.5 shadow-xl text-xs space-y-2 min-w-[200px]">
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <span className="font-semibold text-foreground flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          {label}
        </span>
        <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
          Total: {directTotal}
        </Badge>
      </div>

      <div className="space-y-1.5 pt-0.5">
        {payload.map((entry) => {
          if (entry.dataKey === "total" && payload.length > 1) return null

          return (
            <div
              key={entry.dataKey}
              className="flex items-center justify-between text-muted-foreground hover:text-foreground transition-colors"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="capitalize text-xs font-medium">
                  {entry.name}
                </span>
              </div>
              <span className="font-mono font-bold text-foreground">
                {entry.value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function AttendanceTrendChart({ data }: AttendanceTrendChartProps) {
  const [weeksCount, setWeeksCount] = useState<TimeWindow>(12)
  const [chartType, setChartType] = useState<ChartType>("area")
  const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({
    maqari: true,
    events: true,
    lessons: true,
    sections: true,
    total: true,
  })

  const toggleSeries = (key: string) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  // Generate week intervals and aggregate records
  const { chartData, metrics } = useMemo(() => {
    const now = new Date()
    const currentStart = startOfWeek(subWeeks(now, weeksCount - 1))
    const currentEnd = endOfWeek(now)

    const weeks = eachWeekOfInterval({
      start: currentStart,
      end: currentEnd,
    })

    let periodTotal = 0
    let peakCount = 0
    let peakWeekLabel = ""

    const records = weeks.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart)

      const weekRecords = data.attendance.filter((a) => {
        const d = getDateFromTimestamp(a.logged_at)
        return d >= weekStart && d <= weekEnd
      })

      const byType: Record<string, number> = {
        maqari: 0,
        events: 0,
        lessons: 0,
        sections: 0,
      }

      weekRecords.forEach((r) => {
        const isPresent =
          r.present === true ||
          (r.present === undefined &&
            (r as unknown as { attended?: boolean }).attended !== false)

        if (!isPresent) return

        const type = (r.activity_type || "").toLowerCase()
        if (type === "maqari" || type === "maqraa" || type.includes("maqr")) {
          byType.maqari++
        } else if (type === "events" || type === "event") {
          byType.events++
        } else if (type === "lessons" || type === "lesson") {
          byType.lessons++
        } else if (type === "sections" || type === "section" || type === "halaqa") {
          byType.sections++
        }
      })

      const weekTotal =
        byType.maqari + byType.events + byType.lessons + byType.sections

      periodTotal += weekTotal
      if (weekTotal > peakCount) {
        peakCount = weekTotal
        peakWeekLabel = format(weekStart, "MMM d")
      }

      return {
        rawDate: weekStart,
        week: format(weekStart, "MMM d"),
        weekRange: `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d")}`,
        maqari: byType.maqari,
        events: byType.events,
        lessons: byType.lessons,
        sections: byType.sections,
        total: weekTotal,
      }
    })

    // Compare with prior period of same length for trend %
    const priorStart = startOfWeek(subWeeks(now, weeksCount * 2 - 1))
    const priorEnd = endOfWeek(subWeeks(now, weeksCount))
    const priorRecords = data.attendance.filter((a) => {
      const d = getDateFromTimestamp(a.logged_at)
      const isPresent =
        a.present === true ||
        (a.present === undefined &&
          (a as unknown as { attended?: boolean }).attended !== false)
      return isPresent && d >= priorStart && d <= priorEnd
    })
    const priorTotal = priorRecords.length

    let growthPct = 0
    if (priorTotal > 0) {
      growthPct = Math.round(((periodTotal - priorTotal) / priorTotal) * 100)
    } else if (periodTotal > 0) {
      growthPct = 100
    }

    const weeklyAvg =
      weeks.length > 0 ? (periodTotal / weeks.length).toFixed(1) : "0.0"

    return {
      chartData: records,
      metrics: {
        periodTotal,
        weeklyAvg,
        peakCount,
        peakWeekLabel: peakWeekLabel || "None",
        growthPct,
        priorTotal,
      },
    }
  }, [data.attendance, weeksCount])

  // CSV export function
  const exportTrendCsv = () => {
    if (!chartData.length) return

    const headers = [
      "Week Range",
      "Maqari Attended",
      "Events Attended",
      "Lessons Attended",
      "Sections Attended",
      "Total Attended",
    ]

    const rows = chartData.map((w) => [
      `"${w.weekRange}"`,
      w.maqari,
      w.events,
      w.lessons,
      w.sections,
      w.total,
    ])

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute(
      "download",
      `attendance_trends_${weeksCount}_weeks_${format(new Date(), "yyyy-MM-dd")}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (data.loading) {
    return (
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
        <CardHeader className="p-5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="p-5">
          <Skeleton className="h-[320px] w-full rounded-xl" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden">
      {/* Header with Title and Global Chart Actions */}
      <CardHeader className="p-4 sm:p-6 border-b border-border/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">
                  Attendance Trends & Trajectory
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Aggregated weekly turnouts across Quran circles, lectures, and instructional halaqat.
                </CardDescription>
              </div>
            </div>
          </div>

          {/* Timeframe & Chart Style Selectors */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Chart Type Picker */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-background/60 border border-border/60">
              <Button
                variant={chartType === "area" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setChartType("area")}
                className="h-7 px-2.5 text-xs font-medium"
              >
                Area
              </Button>
              <Button
                variant={chartType === "lines" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setChartType("lines")}
                className="h-7 px-2.5 text-xs font-medium"
              >
                Lines
              </Button>
              <Button
                variant={chartType === "bars" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setChartType("bars")}
                className="h-7 px-2.5 text-xs font-medium"
              >
                Stacked
              </Button>
            </div>

            {/* Time Window Dropdown */}
            <Select
              value={weeksCount.toString()}
              onValueChange={(val) =>
                setWeeksCount(parseInt(val, 10) as TimeWindow)
              }
            >
              <SelectTrigger className="h-8 w-[125px] text-xs bg-background/50 border-border/60">
                <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">Last 4 Weeks</SelectItem>
                <SelectItem value="8">Last 8 Weeks</SelectItem>
                <SelectItem value="12">Last 12 Weeks</SelectItem>
                <SelectItem value="24">Last 6 Months</SelectItem>
              </SelectContent>
            </Select>

            {/* Export CSV */}
            <Button
              variant="outline"
              size="sm"
              onClick={exportTrendCsv}
              className="h-8 gap-1.5 text-xs bg-background/50 border-border/60 hover:bg-muted"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>

        {/* Quick Performance Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 mt-2 border-t border-border/40">
          <div className="p-3 rounded-lg bg-background/40 border border-border/40 space-y-1">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
              Period Total
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold font-mono text-foreground">
                {metrics.periodTotal}
              </span>
              <span className="text-[10px] text-muted-foreground">check-ins</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-background/40 border border-border/40 space-y-1">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
              Weekly Average
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold font-mono text-foreground">
                {metrics.weeklyAvg}
              </span>
              <span className="text-[10px] text-muted-foreground">/ week</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-background/40 border border-border/40 space-y-1">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
              Peak Attendance
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold font-mono text-amber-400">
                {metrics.peakCount}
              </span>
              <span className="text-[10px] text-muted-foreground truncate">
                ({metrics.peakWeekLabel})
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-background/40 border border-border/40 space-y-1">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
              Pace vs Prior Window
            </span>
            <div className="flex items-center gap-1.5">
              {metrics.growthPct > 0 ? (
                <>
                  <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                  <span className="text-lg font-extrabold font-mono text-emerald-400">
                    +{metrics.growthPct}%
                  </span>
                </>
              ) : metrics.growthPct < 0 ? (
                <>
                  <ArrowDownRight className="h-4 w-4 text-rose-400" />
                  <span className="text-lg font-extrabold font-mono text-rose-400">
                    {metrics.growthPct}%
                  </span>
                </>
              ) : (
                <>
                  <Minus className="h-4 w-4 text-muted-foreground" />
                  <span className="text-lg font-extrabold font-mono text-muted-foreground">
                    0%
                  </span>
                </>
              )}
              <span className="text-[10px] text-muted-foreground truncate">
                vs {metrics.priorTotal} prev
              </span>
            </div>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 pt-3 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1 mr-1">
            <Filter className="h-3 w-3" /> Filters:
          </span>

          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const isVisible = visibleSeries[cat.id]
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleSeries(cat.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                  isVisible
                    ? "bg-muted/80 text-foreground border-border shadow-xs"
                    : "bg-transparent text-muted-foreground/50 border-border/30 line-through"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: isVisible ? cat.color : "#666",
                  }}
                />
                <Icon className="h-3 w-3" />
                <span>{cat.label}</span>
              </button>
            )
          })}

          <button
            type="button"
            onClick={() => toggleSeries("total")}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
              visibleSeries.total
                ? "bg-primary/15 text-primary border-primary/30 shadow-xs"
                : "bg-transparent text-muted-foreground/50 border-border/30 line-through"
            }`}
          >
            <Sparkles className="h-3 w-3" />
            <span>Total Trend Line</span>
          </button>
        </div>
      </CardHeader>

      {/* Chart Visualization */}
      <CardContent className="p-4 sm:p-6 pt-4">
        <div className="h-[280px] sm:h-[350px] lg:h-[380px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "bars" ? (
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border/40"
                  vertical={false}
                />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  stroke="hsl(var(--border))"
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  stroke="hsl(var(--border))"
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                {visibleSeries.maqari && (
                  <Bar
                    dataKey="maqari"
                    name="Maqra'a"
                    stackId="a"
                    fill="#10b981"
                    radius={[0, 0, 0, 0]}
                  />
                )}
                {visibleSeries.events && (
                  <Bar
                    dataKey="events"
                    name="Events"
                    stackId="a"
                    fill="#3b82f6"
                    radius={[0, 0, 0, 0]}
                  />
                )}
                {visibleSeries.lessons && (
                  <Bar
                    dataKey="lessons"
                    name="Lessons"
                    stackId="a"
                    fill="#a855f7"
                    radius={[0, 0, 0, 0]}
                  />
                )}
                {visibleSeries.sections && (
                  <Bar
                    dataKey="sections"
                    name="Sections"
                    stackId="a"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                )}
              </BarChart>
            ) : chartType === "area" ? (
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="maqariGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="eventsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="lessonsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="sectionsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border/40"
                  vertical={false}
                />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  stroke="hsl(var(--border))"
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  stroke="hsl(var(--border))"
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />

                {visibleSeries.maqari && (
                  <Area
                    type="monotone"
                    dataKey="maqari"
                    name="Maqra'a"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#maqariGrad)"
                  />
                )}
                {visibleSeries.events && (
                  <Area
                    type="monotone"
                    dataKey="events"
                    name="Events"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#eventsGrad)"
                  />
                )}
                {visibleSeries.lessons && (
                  <Area
                    type="monotone"
                    dataKey="lessons"
                    name="Lessons"
                    stroke="#a855f7"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#lessonsGrad)"
                  />
                )}
                {visibleSeries.sections && (
                  <Area
                    type="monotone"
                    dataKey="sections"
                    name="Sections"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#sectionsGrad)"
                  />
                )}
                {visibleSeries.total && (
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Total Attended"
                    stroke="#38bdf8"
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: "#38bdf8" }}
                    activeDot={{ r: 5 }}
                  />
                )}
              </AreaChart>
            ) : (
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border/40"
                  vertical={false}
                />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  stroke="hsl(var(--border))"
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  stroke="hsl(var(--border))"
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                {visibleSeries.maqari && (
                  <Line
                    type="monotone"
                    dataKey="maqari"
                    name="Maqra'a"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                )}
                {visibleSeries.events && (
                  <Line
                    type="monotone"
                    dataKey="events"
                    name="Events"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                )}
                {visibleSeries.lessons && (
                  <Line
                    type="monotone"
                    dataKey="lessons"
                    name="Lessons"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                )}
                {visibleSeries.sections && (
                  <Line
                    type="monotone"
                    dataKey="sections"
                    name="Sections"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                )}
                {visibleSeries.total && (
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Total"
                    stroke="#38bdf8"
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    dot={{ r: 3.5, fill: "#38bdf8" }}
                  />
                )}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}