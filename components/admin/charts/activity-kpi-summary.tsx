"use client"

import { useMemo } from "react"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Calendar,
  CheckCircle2,
  Users,
  TrendingUp,
  BookOpen,
  GraduationCap,
  Sparkles,
} from "lucide-react"
import type { DashboardData } from "@/hooks/use-dashboard-data"

interface ActivityKpiSummaryProps {
  data: DashboardData
}

export function ActivityKpiSummary({ data }: ActivityKpiSummaryProps) {
  const stats = useMemo(() => {
    const maqariCount = data.activities.maqari?.length || 0
    const eventsCount = data.activities.events?.length || 0
    const lessonsCount = data.activities.lessons?.length || 0
    const sectionsCount = data.activities.sections?.length || 0
    const totalActivities =
      maqariCount + eventsCount + lessonsCount + sectionsCount

    // Present attendance records
    const presentRecords = data.attendance.filter(
      (a) =>
        a.present === true ||
        (a.present === undefined &&
          (a as unknown as { attended?: boolean }).attended !== false)
    )
    const totalAttendance = presentRecords.length

    // Unique attendees
    const uniqueAttendeeIds = new Set(
      presentRecords.map((a) => a.beneficiary_id).filter(Boolean)
    )
    const uniqueAttendeesCount = uniqueAttendeeIds.size

    const totalBeneficiaries = data.beneficiaries.filter(
      (b) => !b.deleted
    ).length
    const reachPct =
      totalBeneficiaries > 0
        ? Math.round((uniqueAttendeesCount / totalBeneficiaries) * 100)
        : 0

    // Average turnout per activity
    const avgTurnout =
      totalActivities > 0
        ? (totalAttendance / totalActivities).toFixed(1)
        : "0.0"

    return {
      totalActivities,
      maqariCount,
      eventsCount,
      lessonsCount,
      sectionsCount,
      totalAttendance,
      uniqueAttendeesCount,
      totalBeneficiaries,
      reachPct,
      avgTurnout,
    }
  }, [data.activities, data.attendance, data.beneficiaries])

  if (data.loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border/60 bg-card/60">
            <CardContent className="p-5 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Activities */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm relative overflow-hidden group hover:border-border transition-all shadow-sm">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors pointer-events-none" />
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Activities
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground font-mono">
              {stats.totalActivities}
            </span>
            <span className="text-xs text-muted-foreground">programs</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 flex-wrap text-[11px] text-muted-foreground pt-2 border-t border-border/40">
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <BookOpen className="h-3 w-3" /> {stats.maqariCount} Maqra&apos;as
            </span>
            <span>•</span>
            <span className="text-blue-400">{stats.eventsCount} Events</span>
            <span>•</span>
            <span className="text-purple-400">{stats.lessonsCount} Lessons</span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Total Attendance Recorded */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm relative overflow-hidden group hover:border-border transition-all shadow-sm">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Check-Ins
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground font-mono">
              {stats.totalAttendance}
            </span>
            <span className="text-xs text-muted-foreground">sessions attended</span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] text-emerald-400 pt-2 border-t border-border/40">
            <Sparkles className="h-3 w-3" />
            <span>Verified present attendance logs</span>
          </div>
        </CardContent>
      </Card>

      {/* 3. Unique Beneficiaries Reached */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm relative overflow-hidden group hover:border-border transition-all shadow-sm">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors pointer-events-none" />
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Beneficiaries Engaged
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground font-mono">
              {stats.uniqueAttendeesCount}
            </span>
            <span className="text-xs text-muted-foreground">
              / {stats.totalBeneficiaries} members
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/40">
            <span>Overall community reach</span>
            <span className="font-semibold text-amber-400 font-mono">
              {stats.reachPct}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 4. Average Turnout */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm relative overflow-hidden group hover:border-border transition-all shadow-sm">
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors pointer-events-none" />
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Avg Turnout / Program
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground font-mono">
              {stats.avgTurnout}
            </span>
            <span className="text-xs text-muted-foreground">attendees / activity</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground pt-2 border-t border-border/40">
            <GraduationCap className="h-3 w-3 text-purple-400" />
            <span>Average participation ratio</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
