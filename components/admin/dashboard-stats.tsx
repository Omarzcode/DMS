"use client"

import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Users,
  UserPlus,
  Calendar,
  TrendingUp,
  Activity,
  UserX,
  BookOpen,
  BarChart3,
} from "lucide-react"
import type { DashboardData } from "@/hooks/use-dashboard-data"
import { getDateFromTimestamp } from "@/hooks/use-dashboard-data"
import { useAuth } from "@/hooks/use-auth"

interface DashboardStatsProps {
  data: DashboardData
}

interface StatCard {
  title: string
  value: number | string
  icon: React.ElementType
  description?: string
  trend?: string
  color: string
  adminOnly?: boolean
}

export function DashboardStats({ data }: DashboardStatsProps) {
  const { userRole } = useAuth()
  const isAdmin = userRole === "admin"

  const stats = useMemo<StatCard[]>(() => {
    const { beneficiaries, preachers, attendance, activities } = data
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // New beneficiaries this month
    const newThisMonth = beneficiaries.filter(
      (b) => getDateFromTimestamp(b.created_at) >= thisMonth
    ).length

    const newLastMonth = beneficiaries.filter((b) => {
      const d = getDateFromTimestamp(b.created_at)
      return d >= lastMonth && d < thisMonth
    }).length

    const growthTrend =
      newLastMonth > 0
        ? `${newThisMonth >= newLastMonth ? "+" : ""}${Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100)}% vs last month`
        : newThisMonth > 0
          ? "New this month"
          : "No new additions"

    // Inactive (no attendance in 30 days)
    const activeIds = new Set(
      attendance
        .filter(
          (a) =>
            a.present && getDateFromTimestamp(a.logged_at) >= thirtyDaysAgo
        )
        .map((a) => a.beneficiary_id)
    )
    const inactiveCount = beneficiaries.filter(
      (b) => !activeIds.has(b.id)
    ).length

    // Advanced stages
    const advancedStages = ["Committed Learner", "Active Participant", "Community Leader"]
    const advancedCount = beneficiaries.filter((b) =>
      advancedStages.includes(b.da_wa_stage)
    ).length

    // Attendance rate (last 30 days)
    const recentAttendance = attendance.filter(
      (a) => getDateFromTimestamp(a.logged_at) >= thirtyDaysAgo
    )
    const presentCount = recentAttendance.filter((a) => a.present).length
    const attendanceRate =
      recentAttendance.length > 0
        ? Math.round((presentCount / recentAttendance.length) * 100)
        : 0

    const cards: StatCard[] = [
      {
        title: "Total Beneficiaries",
        value: beneficiaries.length,
        icon: Users,
        description: `${newThisMonth} new this month`,
        trend: growthTrend,
        color: "text-blue-600",
      },
      {
        title: "New This Month",
        value: newThisMonth,
        icon: UserPlus,
        description: "Beneficiaries added",
        trend: growthTrend,
        color: "text-green-600",
      },
      {
        title: "Total Activities",
        value: activities.all.length,
        icon: Calendar,
        color: "text-purple-600",
        description: `${activities.maqari.length} Quranic Readings · ${activities.events.length} Events`,
      },
      {
        title: "Advanced Stages",
        value: advancedCount,
        icon: TrendingUp,
        description: `${beneficiaries.length > 0 ? Math.round((advancedCount / beneficiaries.length) * 100) : 0}% of total`,
        color: "text-emerald-600",
      },
      {
        title: "Attendance Rate",
        value: `${attendanceRate}%`,
        icon: Activity,
        description: "Last 30 days",
        color: "text-orange-600",
      },
      {
        title: "Inactive (30d)",
        value: inactiveCount,
        icon: UserX,
        description: "Need follow-up",
        color: "text-red-600",
      },
    ]

    if (isAdmin) {
      cards.push(
        {
          title: "Active Preachers",
          value: preachers.filter((p) => p.role === "da'i").length,
          icon: BookOpen,
          description: `${preachers.length} total accounts`,
          color: "text-indigo-600",
          adminOnly: true,
        },
        {
          title: "Total Records",
          value: attendance.length,
          icon: BarChart3,
          description: "Attendance records",
          color: "text-cyan-600",
          adminOnly: true,
        }
      )
    }

    return cards
  }, [data, isAdmin])

  if (data.loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card
            key={stat.title}
            className="hover:shadow-md transition-shadow duration-200"
          >
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                  {stat.title}
                </span>
                <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`} />
              </div>
              <div className="text-2xl sm:text-3xl font-bold">{stat.value}</div>
              {stat.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
