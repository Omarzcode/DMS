"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { collection, getDocs } from "firebase/firestore"
import { Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Users,
  BookOpen,
  Calendar,
  UserCheck,
  TrendingUp,
  ArrowUpIcon,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Award,
} from "lucide-react"
import type { Beneficiary, FirestoreDate, AttendanceRecord } from "@/lib/firestore-collections"

// ─── Types ────────────────────────────────────────────────────────

interface PreacherPersonalMetrics {
  myTotalAttendance: number
  myAttendanceThisMonth: number
  myAttendanceThisWeek: number
  myUniqueBeneficiariesCount: number
  mySessionsCount: number
  totalMinistrySessions: number
  totalBeneficiaries: number
  assignedToMeCount: number
  averagePerSession: number
}

interface StatCardConfig {
  title: string
  value: number
  description: string
  icon: React.ElementType
  badge?: string
  showTrend?: boolean
  trendText?: string
  href?: string
}

// ─── Type-safe date extractor ─────────────────────────────────────

function getDateValue(value: FirestoreDate | unknown): Date {
  if (!value) return new Date(0)
  if (value instanceof Timestamp) return value.toDate()
  if (value instanceof Date) return value
  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof (value as { seconds: unknown }).seconds === "number"
  ) {
    return new Date((value as { seconds: number }).seconds * 1000)
  }
  return new Date(0)
}

// ─── Component ────────────────────────────────────────────────────

export function PreacherStats() {
  const { user } = useAuth()

  const [metrics, setMetrics] = useState<PreacherPersonalMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const now = new Date()
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      // Preacher specific queries across collections
      const [beneficiariesSnapshot, maqariSnapshot, eventsSnapshot, attendanceSnapshot] =
        await Promise.all([
          getDocs(collection(db, "beneficiaries")),
          getDocs(collection(db, "maqari")),
          getDocs(collection(db, "events")),
          getDocs(collection(db, "attendance")),
        ])

      // 1. Beneficiaries
      const activeBeneficiaries = beneficiariesSnapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Beneficiary)
        .filter((b) => !b.deleted)

      const assignedToMe = activeBeneficiaries.filter(
        (b) => b.da_i_id === user.uid
      ).length

      // 2. Personal Sessions Led (Maqari + Events created by preacher)
      const allMaqari = maqariSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      const allEvents = eventsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }))

      const myMaqari = allMaqari.filter(
        (m: Record<string, unknown>) =>
          m.creator_id === user.uid ||
          (user.displayName && m.creator_name === user.displayName)
      )
      const myEvents = allEvents.filter(
        (e: Record<string, unknown>) =>
          e.creator_id === user.uid ||
          (user.displayName && e.creator_name === user.displayName)
      )
      const mySessionsCount = myMaqari.length + myEvents.length
      const totalMinistrySessions = allMaqari.length + allEvents.length

      // 3. Attendance Logged by Preacher
      const allAttendance = attendanceSnapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as AttendanceRecord
      )

      const myAttendanceRecords = allAttendance.filter(
        (a) =>
          a.present !== false &&
          (a.logged_by_id === user.uid ||
            (user.displayName && a.logged_by_name === user.displayName))
      )

      const myAttendanceThisMonth = myAttendanceRecords.filter(
        (a) => getDateValue(a.logged_at) >= thisMonth
      ).length

      const myAttendanceThisWeek = myAttendanceRecords.filter(
        (a) => getDateValue(a.logged_at) >= thisWeek
      ).length

      // Unique learners taught by this preacher
      const uniqueLearnerIds = new Set<string>()
      myAttendanceRecords.forEach((a) => {
        if (a.beneficiary_id) uniqueLearnerIds.add(a.beneficiary_id)
      })

      const avgPerSession =
        mySessionsCount > 0
          ? Math.round(myAttendanceRecords.length / mySessionsCount)
          : myAttendanceRecords.length

      setMetrics({
        myTotalAttendance: myAttendanceRecords.length,
        myAttendanceThisMonth,
        myAttendanceThisWeek,
        myUniqueBeneficiariesCount: uniqueLearnerIds.size,
        mySessionsCount,
        totalMinistrySessions,
        totalBeneficiaries: activeBeneficiaries.length,
        assignedToMeCount: assignedToMe,
        averagePerSession: avgPerSession,
      })
    } catch (err) {
      console.error("Error fetching preacher personal insights:", err)
      setError("Failed to load personal insights. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) fetchStats()
  }, [user, fetchStats])

  const statCards = useMemo<StatCardConfig[]>(() => {
    if (!metrics) return []
    return [
      {
        title: "Attendance Logged by Me",
        value: metrics.myTotalAttendance,
        description:
          metrics.myAttendanceThisMonth > 0
            ? `+${metrics.myAttendanceThisMonth} this month • Logged by you`
            : "Total attendee entries recorded by you",
        icon: UserCheck,
        badge: "My Log",
        showTrend: metrics.myAttendanceThisMonth > 0,
        trendText: `+${metrics.myAttendanceThisMonth}`,
        href: "/dashboard/activities/maqari",
      },
      {
        title: "Sessions Led by Me",
        value: metrics.mySessionsCount,
        description: `${metrics.mySessionsCount} organized by you • ${metrics.totalMinistrySessions} in system`,
        icon: BookOpen,
        badge: "Maqari & Events",
        showTrend: false,
        href: "/dashboard/activities/maqari",
      },
      {
        title: "Learners Engaged",
        value: metrics.myUniqueBeneficiariesCount,
        description: "Unique individuals who attended your circles",
        icon: Users,
        badge: "Direct Reach",
        showTrend: metrics.myUniqueBeneficiariesCount > 0,
        href: "/dashboard/beneficiaries",
      },
      {
        title: "Beneficiaries Database",
        value: metrics.totalBeneficiaries,
        description: `${metrics.assignedToMeCount > 0 ? `${metrics.assignedToMeCount} assigned • ` : ""}All accessible for intake`,
        icon: TrendingUp,
        badge: "Full Access",
        showTrend: false,
        href: "/dashboard/beneficiaries",
      },
    ]
  }, [metrics])

  // ─── Loading State ───────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Error state with retry
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          {error}
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchStats}
            className="ml-4 gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!metrics) return null

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* 4 Role-Specific KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Content = (
            <Card className="h-full hover:border-primary/40 hover:shadow-xs transition-all cursor-pointer group relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium group-hover:text-primary transition-colors flex items-center gap-1.5">
                  <span>{stat.title}</span>
                </CardTitle>
                <stat.icon
                  className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0"
                  aria-hidden="true"
                />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between gap-1">
                  <div className="text-xl sm:text-2xl font-bold">
                    {stat.value.toLocaleString()}
                  </div>
                  {stat.badge && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 font-normal shrink-0"
                    >
                      {stat.badge}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                  {stat.showTrend && stat.trendText && (
                    <span className="flex items-center text-green-600 dark:text-green-400 font-medium shrink-0">
                      <ArrowUpIcon className="h-3 w-3 mr-0.5" />
                      {stat.trendText}
                    </span>
                  )}
                  <span className="truncate">{stat.description}</span>
                </div>
              </CardContent>
            </Card>
          )

          return stat.href ? (
            <Link key={stat.title} href={stat.href} className="block">
              {Content}
            </Link>
          ) : (
            <div key={stat.title}>{Content}</div>
          )
        })}
      </div>

      {/* Preacher Personal Engagement & Impact Summary Ribbon */}
      <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <Award className="h-4 w-4" />
          </div>
          <div>
            <span className="font-semibold text-foreground">
              {metrics.myTotalAttendance > 0
                ? `You have personally recorded ${metrics.myTotalAttendance} attendee entries across ${metrics.mySessionsCount} sessions.`
                : "Welcome! You have full access to create sessions and log attendance across all folders."}
            </span>
            <span className="text-muted-foreground block sm:inline sm:ml-1.5">
              {metrics.myUniqueBeneficiariesCount > 0 &&
                `Engaged ${metrics.myUniqueBeneficiariesCount} individual learners.`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-muted-foreground">
          {metrics.myAttendanceThisWeek > 0 && (
            <Badge variant="outline" className="text-[11px] gap-1 border-primary/30 text-primary">
              <Sparkles className="h-3 w-3" />
              <span>+{metrics.myAttendanceThisWeek} logged this week</span>
            </Badge>
          )}
          {metrics.averagePerSession > 0 && metrics.mySessionsCount > 0 && (
            <span className="text-[11px]">
              Avg: ~<strong className="text-foreground">{metrics.averagePerSession}</strong>/session
            </span>
          )}
        </div>
      </div>
    </div>
  )
}