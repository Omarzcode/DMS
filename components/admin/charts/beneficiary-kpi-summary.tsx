"use client"

import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Users, UserCheck, UserPlus, ArrowUpRight, ArrowDownRight } from "lucide-react"
import type { DashboardData } from "@/hooks/use-dashboard-data"
import { getDateFromTimestamp } from "@/hooks/use-dashboard-data"

interface BeneficiaryKpiSummaryProps {
  data: DashboardData
}

export function BeneficiaryKpiSummary({ data }: BeneficiaryKpiSummaryProps) {
  const stats = useMemo(() => {
    // 1. Total Non-deleted beneficiaries
    const allBeneficiaries = data.beneficiaries.filter((b) => !b.deleted)
    const totalCount = allBeneficiaries.length

    // 2. Active beneficiaries: Attended at least 1 session in last 30 days
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const recentAttendeeIds = new Set(
      data.attendance
        .filter((a) => a.present && getDateFromTimestamp(a.logged_at) >= thirtyDaysAgo)
        .map((a) => a.beneficiary_id)
    )

    const activeCount = allBeneficiaries.filter((b) => recentAttendeeIds.has(b.id)).length
    const activeRate = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0

    // 3. Added this calendar month
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    const addedThisMonth = allBeneficiaries.filter((b) => {
      const created = getDateFromTimestamp(b.created_at)
      return (
        created.getFullYear() === currentYear &&
        created.getMonth() === currentMonth
      )
    }).length

    // Previous month additions for comparison
    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1)
    const prevMonthYear = prevMonthDate.getFullYear()
    const prevMonth = prevMonthDate.getMonth()

    const addedLastMonth = allBeneficiaries.filter((b) => {
      const created = getDateFromTimestamp(b.created_at)
      return (
        created.getFullYear() === prevMonthYear &&
        created.getMonth() === prevMonth
      )
    }).length

    const monthDiff = addedThisMonth - addedLastMonth

    // Committed Learner count (Top stage)
    const committedCount = allBeneficiaries.filter(
      (b) => b.da_wa_stage === "Committed Learner"
    ).length

    return {
      totalCount,
      activeCount,
      activeRate,
      addedThisMonth,
      addedLastMonth,
      monthDiff,
      committedCount,
    }
  }, [data.beneficiaries, data.attendance])

  const kpis = [
    {
      title: "Total Beneficiaries",
      value: stats.totalCount.toLocaleString(),
      badge: `${stats.committedCount} Committed`,
      badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      description: "Total registered members in database",
      icon: Users,
      iconColor: "text-blue-400",
      iconBg: "bg-blue-500/10 border-blue-500/20",
      gradient: "from-blue-500/10 via-transparent to-transparent",
    },
    {
      title: "Active Beneficiaries",
      value: stats.activeCount.toLocaleString(),
      badge: `${stats.activeRate}% Active`,
      badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      description: "Attended at least 1 session in last 30 days",
      icon: UserCheck,
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/10 border-emerald-500/20",
      gradient: "from-emerald-500/10 via-transparent to-transparent",
    },
    {
      title: "Added This Month",
      value: stats.addedThisMonth.toLocaleString(),
      badge:
        stats.monthDiff >= 0
          ? `+${stats.monthDiff} vs last month`
          : `${stats.monthDiff} vs last month`,
      badgeColor:
        stats.monthDiff >= 0
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          : "bg-amber-500/10 text-amber-400 border-amber-500/20",
      trendIcon: stats.monthDiff >= 0 ? ArrowUpRight : ArrowDownRight,
      description: `Compared to ${stats.addedLastMonth} new members last month`,
      icon: UserPlus,
      iconColor: "text-violet-400",
      iconBg: "bg-violet-500/10 border-violet-500/20",
      gradient: "from-violet-500/10 via-transparent to-transparent",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon
        const TrendIcon = kpi.trendIcon
        return (
          <Card
            key={idx}
            className="relative overflow-hidden border border-border/60 bg-card/60 backdrop-blur-sm transition-all hover:border-border hover:shadow-lg hover:shadow-primary/5"
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${kpi.gradient} pointer-events-none opacity-40`}
            />

            <CardContent className="p-5 relative z-10 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {kpi.title}
                </span>
                <div
                  className={`p-2 rounded-xl border ${kpi.iconBg} ${kpi.iconColor}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              <div className="flex items-baseline justify-between gap-2 mb-2">
                <span className="text-3xl font-extrabold tracking-tight text-foreground font-mono">
                  {kpi.value}
                </span>
                {kpi.badge && (
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${kpi.badgeColor}`}
                  >
                    {TrendIcon && <TrendIcon className="h-3 w-3" />}
                    {kpi.badge}
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {kpi.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
