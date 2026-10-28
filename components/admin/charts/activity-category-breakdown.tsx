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
import { Layers, BookOpen, Calendar, GraduationCap, Users } from "lucide-react"
import type { DashboardData } from "@/hooks/use-dashboard-data"

interface ActivityCategoryBreakdownProps {
  data: DashboardData
}

export function ActivityCategoryBreakdown({ data }: ActivityCategoryBreakdownProps) {
  const { summary, chartData } = useMemo(() => {
    const maqari = data.activities.maqari || []
    const events = data.activities.events || []
    const lessons = data.activities.lessons || []
    const sections = data.activities.sections || []

    const countAtt = (type: string) =>
      data.attendance.filter((a) => a.activity_type === type).length

    const maqariAtt = countAtt("maqari")
    const eventsAtt = countAtt("events")
    const lessonsAtt = countAtt("lessons")
    const sectionsAtt = countAtt("sections")

    const calcAvg = (att: number, count: number) =>
      count > 0 ? (att / count).toFixed(1) : "0.0"

    const summaryData = [
      {
        type: "Maqari (Quran Circles)",
        count: maqari.length,
        attendance: maqariAtt,
        avg: calcAvg(maqariAtt, maqari.length),
        icon: BookOpen,
        color: "text-emerald-500",
        bg: "bg-emerald-500/10",
      },
      {
        type: "Events & Lectures",
        count: events.length,
        attendance: eventsAtt,
        avg: calcAvg(eventsAtt, events.length),
        icon: Calendar,
        color: "text-blue-500",
        bg: "bg-blue-500/10",
      },
      {
        type: "Lessons & Classes",
        count: lessons.length,
        attendance: lessonsAtt,
        avg: calcAvg(lessonsAtt, lessons.length),
        icon: GraduationCap,
        color: "text-purple-500",
        bg: "bg-purple-500/10",
      },
      {
        type: "Sections & Halaqat",
        count: sections.length,
        attendance: sectionsAtt,
        avg: calcAvg(sectionsAtt, sections.length),
        icon: Users,
        color: "text-amber-500",
        bg: "bg-amber-500/10",
      },
    ]

    const chart = [
      {
        name: "Maqari",
        Activities: maqari.length,
        Attendance: maqariAtt,
      },
      {
        name: "Events",
        Activities: events.length,
        Attendance: eventsAtt,
      },
      {
        name: "Lessons",
        Activities: lessons.length,
        Attendance: lessonsAtt,
      },
      {
        name: "Sections",
        Activities: sections.length,
        Attendance: sectionsAtt,
      },
    ]

    return { summary: summaryData, chartData: chart }
  }, [data.activities, data.attendance])

  if (data.loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Activity Category Comparison & Attendance Ratios
        </CardTitle>
        <CardDescription>
          Detailed session volume and participant turnout across all educational formats.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {summary.map((item, idx) => {
            const Icon = item.icon
            return (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-border bg-card/60 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${item.bg}`}>
                    <Icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {item.avg} avg / session
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground">
                    {item.type}
                  </h4>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-bold text-foreground">
                      {item.count}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({item.attendance} logged)
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="Activities" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Attendance" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
