"use client"

import { useMemo } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Users,
  Activity,
  UserCheck,
  ArrowRight,
  TrendingUp,
  Calendar,
  BookOpen,
  CheckCircle2,
  Sparkles,
  Trophy,
  Flame,
} from "lucide-react"
import type { DashboardData } from "@/hooks/use-dashboard-data"
import { getDateFromTimestamp } from "@/hooks/use-dashboard-data"

interface AnalyticsThreeSummaryGridProps {
  data: DashboardData
}

export function AnalyticsThreeSummaryGrid({
  data,
}: AnalyticsThreeSummaryGridProps) {
  // ─── 1. Employees / Preachers Summary ─────────────────────────
  const preacherStats = useMemo(() => {
    const preacherMap = new Map<
      string,
      { id: string; name: string; email: string }
    >()

    data.preachers.forEach((p) => {
      preacherMap.set(p.id, {
        id: p.id,
        name: p.name || "Preacher",
        email: p.email || "",
      })
    })

    data.activities.all.forEach((act) => {
      if (act.creator_id && !preacherMap.has(act.creator_id)) {
        preacherMap.set(act.creator_id, {
          id: act.creator_id,
          name: act.creator_name || "Preacher",
          email: "",
        })
      }
    })

    let activeCount = 0
    let totalEvents = 0
    let totalAttendees = 0
    let topPreacher = { name: "None", attendees: 0, events: 0 }

    Array.from(preacherMap.values()).forEach((p) => {
      const activitiesMade = data.activities.all.filter((act) => {
        const idMatch = act.creator_id && act.creator_id === p.id
        const nameMatch =
          act.creator_name &&
          p.name &&
          act.creator_name.trim().toLowerCase() ===
            p.name.trim().toLowerCase()
        return idMatch || nameMatch
      })

      const eventsCount = activitiesMade.length
      const activityIds = new Set(activitiesMade.map((a) => a.id))

      const presentRecords = data.attendance.filter(
        (att) =>
          activityIds.has(att.activity_id) &&
          (att.present === true ||
            (att.present === undefined &&
              (att as unknown as { attended?: boolean }).attended !== false))
      )
      const attendeesCount = presentRecords.length

      if (eventsCount > 0) {
        totalEvents += eventsCount
      }

      if (eventsCount > 0 && attendeesCount > 0) {
        activeCount += 1
        totalAttendees += attendeesCount

        if (attendeesCount > topPreacher.attendees) {
          topPreacher = {
            name: p.name,
            attendees: attendeesCount,
            events: eventsCount,
          }
        }
      }
    })

    const avgPerEvent =
      totalEvents > 0 ? (totalAttendees / totalEvents).toFixed(1) : "0.0"

    return {
      totalPreachers: preacherMap.size,
      activePreachers: activeCount,
      totalEvents,
      totalAttendees,
      avgPerEvent,
      topPreacher,
    }
  }, [data.preachers, data.activities.all, data.attendance])

  // ─── 2. Beneficiaries Summary ─────────────────────────────────
  const beneficiaryStats = useMemo(() => {
    const activeBeneficiaries = data.beneficiaries.filter((b) => !b.deleted)
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Active in last 30 days
    const activeIn30DaysIds = new Set(
      data.attendance
        .filter((a) => {
          const isPresent =
            a.present === true ||
            (a.present === undefined &&
              (a as unknown as { attended?: boolean }).attended !== false)
          const loggedDate = getDateFromTimestamp(a.logged_at)
          return isPresent && loggedDate >= thirtyDaysAgo
        })
        .map((a) => a.beneficiary_id)
        .filter(Boolean)
    )

    // Added this month
    const addedThisMonthCount = activeBeneficiaries.filter((b) => {
      const createdDate = getDateFromTimestamp(b.created_at)
      return createdDate >= startOfCurrentMonth
    }).length

    // Active engagement rate
    const activeRate =
      activeBeneficiaries.length > 0
        ? Math.round((activeIn30DaysIds.size / activeBeneficiaries.length) * 100)
        : 0

    return {
      total: activeBeneficiaries.length,
      activeCount: activeIn30DaysIds.size,
      activeRate,
      addedThisMonth: addedThisMonthCount,
    }
  }, [data.beneficiaries, data.attendance])

  // ─── 3. Activities Summary ────────────────────────────────────
  const activityStats = useMemo(() => {
    const maqariCount = data.activities.maqari?.length || 0
    const eventsCount = data.activities.events?.length || 0
    const lessonsCount = data.activities.lessons?.length || 0
    const sectionsCount = data.activities.sections?.length || 0
    const totalPrograms =
      maqariCount + eventsCount + lessonsCount + sectionsCount

    const presentRecords = data.attendance.filter(
      (a) =>
        a.present === true ||
        (a.present === undefined &&
          (a as unknown as { attended?: boolean }).attended !== false)
    )
    const totalCheckIns = presentRecords.length

    const avgTurnout =
      totalPrograms > 0 ? (totalCheckIns / totalPrograms).toFixed(1) : "0.0"

    return {
      totalPrograms,
      maqariCount,
      eventsCount,
      lessonsCount,
      sectionsCount,
      totalCheckIns,
      avgTurnout,
    }
  }, [data.activities, data.attendance])

  if (data.loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-border/60 bg-card/60">
            <CardHeader className="p-5">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48 mt-2" />
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Analytics Verticals Summary
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Key operational metrics across Employees, Beneficiaries, and Activities.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* ── Pillar 1: Employees / Preachers ── */}
        <Card className="border border-border/60 bg-card/60 backdrop-blur-sm relative overflow-hidden group hover:border-border transition-all shadow-sm flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />
          
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <UserCheck className="h-4 w-4" />
                </div>
                <CardTitle className="text-base font-bold">Employees</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/20 text-emerald-400 bg-emerald-500/5">
                Staff &amp; Da&apos;is
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Teaching performance, activity leadership, and participant turnout.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 pt-2 space-y-4 flex-1 flex flex-col justify-between">
            {/* Numbers Grid */}
            <div className="grid grid-cols-2 gap-2.5 bg-background/50 p-3 rounded-xl border border-border/40">
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                  Active Da&apos;is
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold font-mono text-foreground">
                    {preacherStats.activePreachers}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    / {preacherStats.totalPreachers}
                  </span>
                </div>
              </div>

              <div className="space-y-0.5 border-l border-border/40 pl-2.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                  Turnout Rate
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold font-mono text-emerald-400">
                    {preacherStats.avgPerEvent}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    avg / session
                  </span>
                </div>
              </div>
            </div>

            {/* Top Performer Ribbon */}
            <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Trophy className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] text-muted-foreground block">Top Preacher Turnout</span>
                  <span className="font-semibold text-foreground truncate block">
                    {preacherStats.topPreacher.name}
                  </span>
                </div>
              </div>
              <span className="font-mono font-bold text-emerald-400 shrink-0 text-xs">
                {preacherStats.topPreacher.attendees} check-ins
              </span>
            </div>

            {/* Link CTA */}
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs border-border/60 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors"
            >
              <Link href="/admin/analytics/preachers">
                <span>View Employee Analytics</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* ── Pillar 2: Beneficiaries ── */}
        <Card className="border border-border/60 bg-card/60 backdrop-blur-sm relative overflow-hidden group hover:border-border transition-all shadow-sm flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors pointer-events-none" />
          
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Users className="h-4 w-4" />
                </div>
                <CardTitle className="text-base font-bold">Beneficiaries</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-blue-500/20 text-blue-400 bg-blue-500/5">
                Members
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Cohort size, active 30-day participation, and monthly member intake.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 pt-2 space-y-4 flex-1 flex flex-col justify-between">
            {/* Numbers Grid */}
            <div className="grid grid-cols-2 gap-2.5 bg-background/50 p-3 rounded-xl border border-border/40">
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                  Total Enrolled
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold font-mono text-foreground">
                    {beneficiaryStats.total}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    members
                  </span>
                </div>
              </div>

              <div className="space-y-0.5 border-l border-border/40 pl-2.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                  Active (30 Days)
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold font-mono text-blue-400">
                    {beneficiaryStats.activeCount}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    ({beneficiaryStats.activeRate}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Intake Ribbon */}
            <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/15 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-muted-foreground block">Monthly Recruitment</span>
                  <span className="font-semibold text-foreground">
                    +{beneficiaryStats.addedThisMonth} new contacts this month
                  </span>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-none font-mono">
                Top 20 Ranked
              </Badge>
            </div>

            {/* Link CTA */}
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs border-border/60 hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30 transition-colors"
            >
              <Link href="/admin/analytics/beneficiaries">
                <span>View Beneficiary Analytics</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* ── Pillar 3: Activities ── */}
        <Card className="border border-border/60 bg-card/60 backdrop-blur-sm relative overflow-hidden group hover:border-border transition-all shadow-sm flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-colors pointer-events-none" />
          
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <Activity className="h-4 w-4" />
                </div>
                <CardTitle className="text-base font-bold">Activities</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-orange-500/20 text-orange-400 bg-orange-500/5">
                Programs
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Attendance trajectories, category ratios, and program performance.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 pt-2 space-y-4 flex-1 flex flex-col justify-between">
            {/* Numbers Grid */}
            <div className="grid grid-cols-2 gap-2.5 bg-background/50 p-3 rounded-xl border border-border/40">
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                  Total Programs
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold font-mono text-foreground">
                    {activityStats.totalPrograms}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    sessions
                  </span>
                </div>
              </div>

              <div className="space-y-0.5 border-l border-border/40 pl-2.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                  Total Check-Ins
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold font-mono text-orange-400">
                    {activityStats.totalCheckIns}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    attended
                  </span>
                </div>
              </div>
            </div>

            {/* Category Pill Ribbon */}
            <div className="p-2.5 rounded-lg bg-orange-500/5 border border-orange-500/15 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="text-xs text-muted-foreground">
                  <strong className="text-foreground">{activityStats.maqariCount}</strong> Maqari •{" "}
                  <strong className="text-foreground">{activityStats.eventsCount}</strong> Events
                </span>
              </div>
              <span className="font-mono text-xs font-semibold text-orange-400">
                {activityStats.avgTurnout} avg
              </span>
            </div>

            {/* Link CTA */}
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs border-border/60 hover:bg-orange-500/10 hover:text-orange-400 hover:border-orange-500/30 transition-colors"
            >
              <Link href="/admin/analytics/activities">
                <span>View Activity Analytics</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
