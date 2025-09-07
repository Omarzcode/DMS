"use client"

import { useState, useEffect } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, UserCheck, Calendar, TrendingUp, ArrowUpIcon, ArrowDownIcon, Sparkles } from "lucide-react"
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
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
      title: "إجمالي المستفيدين",
      value: stats.totalBeneficiaries,
      description: `${stats.beneficiaryGrowth >= 0 ? "+" : ""}${stats.beneficiaryGrowth.toFixed(1)}% من الشهر الماضي`,
      icon: Users,
      trend: stats.beneficiaryGrowth >= 0 ? "up" : "down",
      gradient: "from-blue-500 to-purple-600",
    },
    {
      title: "الدعاة النشطون",
      value: stats.totalPreachers,
      description: `${stats.preacherGrowth >= 0 ? "+" : ""}${stats.preacherGrowth.toFixed(1)}% من الشهر الماضي`,
      icon: UserCheck,
      trend: stats.preacherGrowth >= 0 ? "up" : "down",
      gradient: "from-purple-500 to-pink-600",
    },
    {
      title: "إجمالي الأنشطة",
      value: stats.totalActivities,
      description: "فعاليات ودروس ومقارئ",
      icon: Calendar,
      gradient: "from-pink-500 to-orange-600",
    },
    {
      title: "جديد هذا الشهر",
      value: stats.activeThisMonth,
      description: "مستفيدون جدد انضموا",
      icon: TrendingUp,
      gradient: "from-orange-500 to-red-600",
    },
  ]

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => (
        <Card key={stat.title} className="group hover:scale-105 transition-all duration-300 animate-scale-in" style={{ animationDelay: `${index * 0.1}s` }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">{stat.title}</CardTitle>
            <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
              <stat.icon className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold gradient-text-primary mb-2">{stat.value.toLocaleString()}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {stat.trend && (
                <>
                  {stat.trend === "up" ? (
                    <ArrowUpIcon className="h-3 w-3 text-green-500" />
                  ) : (
                    <ArrowDownIcon className="h-3 w-3 text-red-500" />
                  )}
                </>
              )}
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-purple-500" />
                {stat.description}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}