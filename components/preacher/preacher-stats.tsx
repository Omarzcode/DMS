"use client"

import { useState, useEffect } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, BookOpen, Calendar, TrendingUp, ArrowUpIcon } from "lucide-react"
import type { Beneficiary, Activity } from "@/lib/firestore-collections"

interface PreacherStats {
  totalBeneficiaries: number
  myMaqari: number
  recentActivity: number
  newThisMonth: number
}

export function PreacherStats() {
  const { user } = useAuth()
  const [stats, setStats] = useState<PreacherStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchStats()
    }
  }, [user])

  const fetchStats = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Get current month start date
      const now = new Date()
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      // Fetch preacher's beneficiaries
      const beneficiariesQuery = query(collection(db, "beneficiaries"), where("da_i_id", "==", user.uid))
      const beneficiariesSnapshot = await getDocs(beneficiariesQuery)
      const beneficiaries = beneficiariesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Beneficiary[]

      // Fetch preacher's maqari
      const maqariQuery = query(collection(db, "maqari"), where("creator_id", "==", user.uid))
      const maqariSnapshot = await getDocs(maqariQuery)
      const maqari = maqariSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Activity[]

      // Calculate new beneficiaries this month
      const newThisMonth = beneficiaries.filter(
        (b) => b.created_at && new Date(b.created_at.seconds * 1000) >= thisMonth,
      ).length

      // Calculate recent activity (activities created in last 30 days)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const recentActivity = maqari.filter(
        (m) => m.created_at && new Date(m.created_at.seconds * 1000) >= thirtyDaysAgo,
      ).length

      setStats({
        totalBeneficiaries: beneficiaries.length,
        myMaqari: maqari.length,
        recentActivity,
        newThisMonth,
      })
    } catch (error) {
      console.error("Error fetching preacher stats:", error)
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
      title: "My Beneficiaries",
      value: stats.totalBeneficiaries,
      description: "Total assigned to me",
      icon: Users,
    },
    {
      title: "My Maqari",
      value: stats.myMaqari,
      description: "Personal activities created",
      icon: BookOpen,
    },
    {
      title: "Recent Activity",
      value: stats.recentActivity,
      description: "New maqari in last 30 days",
      icon: Calendar,
    },
    {
      title: "New This Month",
      value: stats.newThisMonth,
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
              {stat.title === "New This Month" && stat.value > 0 && <ArrowUpIcon className="h-3 w-3 text-green-500" />}
              <span>{stat.description}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
