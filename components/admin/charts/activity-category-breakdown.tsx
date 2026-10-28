"use client"

import { useMemo } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Layers, BookOpen, Calendar, GraduationCap, Users } from "lucide-react"
import type { DashboardData } from "@/hooks/use-dashboard-data"

interface ActivityCategoryBreakdownProps {
  data: DashboardData
}

export function ActivityCategoryBreakdown({
  data,
}: ActivityCategoryBreakdownProps) {
  const { summary, chartData, totalAtt } = useMemo(() => {
    const maqari = data.activities.maqari || []
    const events = data.activities.events || []
    const lessons = data.activities.lessons || []
    const sections = data.activities.sections || []

    const countAtt = (type: string) =>
      data.attendance.filter((a) => {
        const isPresent =
          a.present === true ||
          (a.present === undefined &&
            (a as unknown as { attended?: boolean }).attended !== false)
        if (!isPresent) return false

        const t = (a.activity_type || "").toLowerCase()
        if (type === "maqari") return t.includes("maqr")
        if (type === "events") return t.includes("event")
        if (type === "lessons") return t.includes("lesson")
        if (type === "sections")
          return t.includes("section") || t.includes("halaq")
        return t === type
      }).length

    const maqariAtt = countAtt("maqari")
    const eventsAtt = countAtt("events")
    const lessonsAtt = countAtt("lessons")
    const sectionsAtt = countAtt("sections")
    const allTotalAtt = maqariAtt + eventsAtt + lessonsAtt + sectionsAtt

    const calcAvg = (att: number, count: number) =>
      count > 0 ? (att / count).toFixed(1) : "0.0"

    const calcPct = (att: number) =>
      allTotalAtt > 0 ? Math.round((att / allTotalAtt) * 100) : 0

    const summaryData = [
      {
        id: "maqari",
        type: "Maqra'a (Quran Circles)",
        count: maqari.length,
        attendance: maqariAtt,
        pct: calcPct(maqariAtt),
        avg: calcAvg(maqariAtt, maqari.length),
        icon: BookOpen,
        color: "text-emerald-400",
        bg: "bg-emerald-500/10 border-emerald-500/20",
        barColor: "bg-emerald-500",
      },
      {
        id: "events",
        type: "Events & Lectures",
        count: events.length,
        attendance: eventsAtt,
        pct: calcPct(eventsAtt),
        avg: calcAvg(eventsAtt, events.length),
        icon: Calendar,
        color: "text-blue-400",
        bg: "bg-blue-500/10 border-blue-500/20",
        barColor: "bg-blue-500",
      },
      {
        id: "lessons",
        type: "Lessons & Classes",
        count: lessons.length,
        attendance: lessonsAtt,
        pct: calcPct(lessonsAtt),
        avg: calcAvg(lessonsAtt, lessons.length),
        icon: GraduationCap,
        color: "text-purple-400",
        bg: "bg-purple-500/10 border-purple-500/20",
        barColor: "bg-purple-500",
      },
      {
        id: "sections",
        type: "Sections & Halaqat",
        count: sections.length,
        attendance: sectionsAtt,
        pct: calcPct(sectionsAtt),
        avg: calcAvg(sectionsAtt, sections.length),
        icon: Users,
        color: "text-amber-400",
        bg: "bg-amber-500/10 border-amber-500/20",
        barColor: "bg-amber-500",
      },
    ]

    const chart = [
      {
        name: "Maqari",
        Programs: maqari.length,
        Attendance: maqariAtt,
      },
      {
        name: "Events",
        Programs: events.length,
        Attendance: eventsAtt,
      },
      {
        name: "Lessons",
        Programs: lessons.length,
        Attendance: lessonsAtt,
      },
      {
        name: "Sections",
        Programs: sections.length,
        Attendance: sectionsAtt,
      },
    ]

    return { summary: summaryData, chartData: chart, totalAtt: allTotalAtt }
  }, [data.activities, data.attendance])

  if (data.loading) {
    return (
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
        <CardHeader className="p-5">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="p-5">
          <Skeleton className="h-48 w-full rounded-xl" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden">
      <CardHeader className="p-4 sm:p-6 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold tracking-tight">
                Category Comparison & Attendance Share
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Session volume and participant turnout across all educational formats.
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-mono w-fit">
            {totalAtt} total check-ins recorded
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {summary.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-border/60 bg-background/40 space-y-3 hover:border-border transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg border ${item.bg}`}>
                    <Icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {item.avg} avg / session
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-muted-foreground truncate">
                    {item.type}
                  </h4>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-extrabold text-foreground font-mono">
                      {item.count}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      programs ({item.attendance} check-ins)
                    </span>
                  </div>
                </div>

                {/* Turnout share progress bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Attendance share</span>
                    <span className="font-semibold text-foreground font-mono">
                      {item.pct}%
                    </span>
                  </div>
                  <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${item.barColor}`}
                      style={{ width: `${Math.min(100, Math.max(3, item.pct))}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Comparison Bar Chart */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              Total Programs vs. Attended Check-Ins
            </span>
            <span>Side-by-side scale comparison</span>
          </div>
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
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
                  dataKey="name"
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
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "10px",
                    fontSize: "12px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                />
                <Bar
                  dataKey="Programs"
                  name="Created Programs"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="Attendance"
                  name="Recorded Check-Ins"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
