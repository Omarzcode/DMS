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
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Users,
  BookOpen,
  UserCheck,
  TrendingUp,
  ArrowUpIcon,
  AlertCircle,
  RefreshCw,
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

  const statCards = useMemo(() => {
    if (!metrics) return []
    return [
      {
        title: "Attendance Logged",
        value: metrics.myTotalAttendance,
        category: "Personal Log",
        detail:
          metrics.myAttendanceThisMonth > 0
            ? `+${metrics.myAttendanceThisMonth} this month`
            : "Total attendee entries recorded",
        icon: UserCheck,
        showTrend: metrics.myAttendanceThisMonth > 0,
        trendText: `+${metrics.myAttendanceThisMonth} this month`,
        href: "/dashboard/activities/maqari",
      },
      {
        title: "Sessions Led",
        value: metrics.mySessionsCount,
        category: "Maqari & Events",
        detail: `${metrics.totalMinistrySessions} total sessions in ministry`,
        icon: BookOpen,
        showTrend: false,
        href: "/dashboard/activities/maqari",
      },
      {
        title: "Learners Engaged",
        value: metrics.myUniqueBeneficiariesCount,
        category: "Direct Reach",
        detail: "Unique attendees in your circles",
        icon: Users,
        showTrend: false,
        href: "/dashboard/beneficiaries",
      },
      {
        title: "Beneficiaries",
        value: metrics.totalBeneficiaries,
        category: "Directory",
        detail: metrics.assignedToMeCount > 0 ? `${metrics.assignedToMeCount} assigned to you` : "Complete database access",
        icon: TrendingUp,
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
            <Card key={i} className="border-border/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-lg" />
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
      {/* 4 Role-Specific KPI Cards - Fluid responsive grid to prevent card squishing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat) => {
          const Content = (
            <div className="min-w-0 h-full rounded-xl border border-border/70 bg-card p-4 sm:p-5 hover:border-primary/50 hover:bg-card/90 transition-all duration-200 cursor-pointer group flex flex-col justify-between">
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80 block truncate">
                      {stat.category}
                    </span>
                    <h3 className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                      {stat.title}
                    </h3>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200">
                    <stat.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </div>
                </div>

                <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground tabular-nums truncate">
                  {stat.value.toLocaleString()}
                </div>
              </div>

              <div className="min-w-0 mt-3 pt-2.5 border-t border-border/40 text-[11px] text-muted-foreground flex items-center justify-between gap-2">
                <span className="truncate flex-1 min-w-0">{stat.detail}</span>
                {stat.showTrend && (
                  <span className="text-emerald-500 font-medium shrink-0 flex items-center gap-0.5 text-xs">
                    <ArrowUpIcon className="h-3 w-3" />
                  </span>
                )}
              </div>
            </div>
          )

          return stat.href ? (
            <Link key={stat.title} href={stat.href} className="block h-full min-w-0">
              {Content}
            </Link>
          ) : (
            <div key={stat.title} className="h-full min-w-0">{Content}</div>
          )
        })}
      </div>

      {/* Preacher Personal Engagement & Impact Summary Ribbon */}
      <div className="px-4 py-3 rounded-xl border border-border/60 bg-muted/20 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Award className="h-3.5 w-3.5" />
          </div>
          <div className="leading-snug min-w-0 flex-1">
            <span className="font-medium text-foreground break-words">
              {metrics.myTotalAttendance > 0
                ? `You have logged ${metrics.myTotalAttendance} attendee entries across ${metrics.mySessionsCount} sessions.`
                : "Welcome to your home logging portal. You have full access across all folders."}
            </span>
            {metrics.myUniqueBeneficiariesCount > 0 && (
              <span className="text-muted-foreground ml-1.5 inline-block">
                ({metrics.myUniqueBeneficiariesCount} unique learners reached)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-muted-foreground text-[11px] flex-wrap">
          {metrics.myAttendanceThisWeek > 0 && (
            <span className="inline-flex items-center gap-1.5 text-foreground font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              +{metrics.myAttendanceThisWeek} logged this week
            </span>
          )}
          {metrics.averagePerSession > 0 && metrics.mySessionsCount > 0 && (
            <span className="hidden md:inline text-muted-foreground">
              ~<strong className="text-foreground font-semibold">{metrics.averagePerSession}</strong> avg / session
            </span>
          )}
        </div>
      </div>
    </div>
  )
}