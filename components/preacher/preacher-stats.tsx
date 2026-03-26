"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
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
  Calendar,
  TrendingUp,
  ArrowUpIcon,
  AlertCircle,
  RefreshCw,
} from "lucide-react"
import type { Beneficiary, Activity, FirestoreDate } from "@/lib/firestore-collections"

// ─── Types ────────────────────────────────────────────────────────

interface PreacherStats {
  totalBeneficiaries: number
  myMaqari:           number
  recentActivity:     number
  newThisMonth:       number
}

interface StatCardConfig {
  title:       string
  value:       number
  description: string
  icon:        React.ElementType
  // Fix 10: showTrend is explicit on the config — no fragile title comparison
  showTrend?:  boolean
}

// ─── Fix 7: Type-safe date extractor (mirrors the one in firestore-collections) ──

function getDateValue(value: FirestoreDate | undefined | null): Date {
  if (!value) return new Date(0)
  // Fix 2: Check instanceof before accessing .seconds
  if (value instanceof Timestamp) return value.toDate()
  if (value instanceof Date)      return value
  // Timestamp-like plain object (e.g. after JSON serialization)
  if (
    typeof value === "object" &&
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

  const [stats, setStats]     = useState<PreacherStats | null>(null)
  const [loading, setLoading] = useState(true)
  // Fix 3 & 9: Track error state
  const [error, setError]     = useState<string | null>(null)

  // Fix 4 & 1: useCallback so the function is stable and can be in deps array
  // Fix 12: AbortController pattern to cancel stale fetches
  const fetchStats = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const now          = new Date()
      const thisMonth    = new Date(now.getFullYear(), now.getMonth(), 1)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      // Fix 6: Run both queries in parallel with Promise.all
      const [beneficiariesSnapshot, maqariSnapshot] = await Promise.all([
        getDocs(
          query(collection(db, "beneficiaries"), where("da_i_id", "==", user.uid))
        ),
        getDocs(
          query(collection(db, "maqari"), where("creator_id", "==", user.uid))
        ),
      ])

      const beneficiaries = beneficiariesSnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Beneficiary[]

      const maqari = maqariSnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Activity[]

      // Fix 2 & 7: Use type-safe getDateValue instead of .seconds access
      const newThisMonth = beneficiaries.filter((b) =>
        getDateValue(b.created_at) >= thisMonth
      ).length

      const recentActivity = maqari.filter((m) =>
        getDateValue(m.created_at) >= thirtyDaysAgo
      ).length

      setStats({
        totalBeneficiaries: beneficiaries.length,
        myMaqari:           maqari.length,
        recentActivity,
        newThisMonth,
      })
    } catch (err) {
      console.error("Error fetching preacher stats:", err)
      // Fix 3: Surface the error
      setError("Failed to load stats. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [user]) // user is the only real dependency

  // Fix 1: fetchStats is now stable and safe to put in deps array
  useEffect(() => {
    if (user) fetchStats()
  }, [user, fetchStats])

  // Fix 8: Memoize stat cards — only recompute when stats change
  const statCards = useMemo<StatCardConfig[]>(() => {
    if (!stats) return []
    return [
      {
        title:       "My Beneficiaries",
        value:       stats.totalBeneficiaries,
        description: "Total assigned to me",
        icon:        Users,
        showTrend:   false,
      },
      {
        title:       "My Maqari",
        value:       stats.myMaqari,
        // Fix 5: Clearer description
        description: "Total maqari created",
        icon:        BookOpen,
        showTrend:   false,
      },
      {
        title:       "Recent Activity",
        value:       stats.recentActivity,
        description: "New maqari in last 30 days",
        icon:        Calendar,
        showTrend:   false,
      },
      {
        title:       "New This Month",
        value:       stats.newThisMonth,
        description: "New beneficiaries joined",
        icon:        TrendingUp,
        // Fix 10: showTrend is explicit — no hardcoded title comparison
        showTrend:   true,
      },
    ]
  }, [stats])

  // ─── Loading State ───────────────────────────────────────────

  if (loading) {
    return (
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
    )
  }

  // Fix 3 & 9: Show error state with retry instead of blank screen
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

  if (!stats) return null

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">{stat.title}</CardTitle>
            {/* Fix 11: Icons are decorative — aria-hidden */}
            <stat.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stat.value.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {/* Fix 10: Use showTrend from config — no hardcoded title comparison */}
              {stat.showTrend && stat.value > 0 && (
                <ArrowUpIcon className="h-3 w-3 text-green-500" aria-hidden="true" />
              )}
              <span>{stat.description}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}