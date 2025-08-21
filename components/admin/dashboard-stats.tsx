"use client"

import { useState, useEffect } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, UserCheck, Calendar, TrendingUp, ArrowUpIcon, ArrowDownIcon } from "lucide-react"
import type { Beneficiary, Preacher } from "@/lib/firestore-collections"

interface DashboardStats {
  totalBeneficiaries: number
  totalPreachers: number
  totalActivities: number
  activeThisMonth: number
  beneficiaryGrowth: number
  preacherGrowth: number
}

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)

      // Get current date and last month for growth calculations
      const now = new Date()
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      // Fetch all data
      const [
        beneficiariesSnapshot,
        preachersSnapshot,
        maqariSnapshot,
        eventsSnapshot,
        lessonsSnapshot,
        sectionsSnapshot,
      ] = await Promise.all([
        getDocs(collection(db, "beneficiaries")),
        getDocs(collection(db, "preachers")),
        getDocs(collection(db, "maqari")),
        getDocs(collection(db, "events")),
        getDocs(collection(db, "lessons")),
        getDocs(collection(db, "sections")),
      ])

      const beneficiaries = beneficiariesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Beneficiary[]
      const preachers = preachersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Preacher[]

      // Calculate total activities
      const totalActivities = maqariSnapshot.size + eventsSnapshot.size + lessonsSnapshot.size + sectionsSnapshot.size

      // Calculate growth metrics
      const beneficiariesThisMonth = beneficiaries.filter(
        (b) => b.created_at && new Date(b.created_at.seconds * 1000) >= thisMonth,
      ).length

      const beneficiariesLastMonth = beneficiaries.filter(
        (b) =>
          b.created_at &&
          new Date(b.created_at.seconds * 1000) >= lastMonth &&
          new Date(b.created_at.seconds * 1000) < thisMonth,
      ).length

      const preachersThisMonth = preachers.filter(
        (p) => p.created_at && new Date(p.created_at.seconds * 1000) >= thisMonth,
      ).length

      const preachersLastMonth = preachers.filter(
        (p) =>
          p.created_at &&
          new Date(p.created_at.seconds * 1000) >= lastMonth &&
          new Date(p.created_at.seconds * 1000) < thisMonth,
      ).length

      // Calculate growth percentages
      const beneficiaryGrowth =
        beneficiariesLastMonth > 0
          ? ((beneficiariesThisMonth - beneficiariesLastMonth) / beneficiariesLastMonth) * 100
          : beneficiariesThisMonth > 0
            ? 100
            : 0

      const preacherGrowth =
        preachersLastMonth > 0
          ? ((preachersThisMonth - preachersLastMonth) / preachersLastMonth) * 100
          : preachersThisMonth > 0
            ? 100
            : 0

      setStats({
        totalBeneficiaries: beneficiaries.length,
        totalPreachers: preachers.length,
        totalActivities,
        activeThisMonth: beneficiariesThisMonth,
        beneficiaryGrowth,
        preacherGrowth,
      })
    } catch (error) {
      console.error("Error fetching dashboard stats:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

  if (!stats) return null

  const statCards = [
    {
      title: "Total Beneficiaries",
      value: stats.totalBeneficiaries,
      description: `${stats.beneficiaryGrowth >= 0 ? "+" : ""}${stats.beneficiaryGrowth.toFixed(1)}% from last month`,
      icon: Users,
      trend: stats.beneficiaryGrowth >= 0 ? "up" : "down",
    },
    {
      title: "Active Preachers",
      value: stats.totalPreachers,
      description: `${stats.preacherGrowth >= 0 ? "+" : ""}${stats.preacherGrowth.toFixed(1)}% from last month`,
      icon: UserCheck,
      trend: stats.preacherGrowth >= 0 ? "up" : "down",
    },
    {
      title: "Total Activities",
      value: stats.totalActivities,
      description: "Events, lessons, and maqari",
      icon: Calendar,
    },
    {
      title: "New This Month",
      value: stats.activeThisMonth,
      description: "New beneficiaries joined",
      icon: TrendingUp,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {stat.trend && (
                <>
                  {stat.trend === "up" ? (
                    <ArrowUpIcon className="h-3 w-3 text-green-500" />
                  ) : (
                    <ArrowDownIcon className="h-3 w-3 text-red-500" />
                  )}
                </>
              )}
              <span>{stat.description}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
