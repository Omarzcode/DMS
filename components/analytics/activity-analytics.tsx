"use client"

import { useState, useEffect } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, Activity, BookOpen, Users, TrendingUp } from "lucide-react"
import { format } from "date-fns"
import type { Activity as ActivityType, Preacher } from "@/lib/firestore-collections"

interface ActivityAnalytics {
  totalActivities: number
  activitiesByType: Array<{ type: string; count: number }>
  recentActivities: ActivityType[]
  topCreators: Array<{ name: string; count: number }>
  activitiesOverTime: Array<{ month: string; count: number }>
}

const activityTypeLabels = {
  maqari: "Maqari",
  events: "Events",
  lessons: "Lessons",
  sections: "Sections",
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"]

export function ActivityAnalytics() {
  const [analytics, setAnalytics] = useState<ActivityAnalytics | null>(null)
  const [preachers, setPreachers] = useState<Preacher[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActivityAnalytics()
  }, [])

  const fetchActivityAnalytics = async () => {
    try {
      setLoading(true)

      // Fetch all activities and preachers
      const [maqariSnapshot, eventsSnapshot, lessonsSnapshot, sectionsSnapshot, preachersSnapshot] = await Promise.all([
        getDocs(collection(db, "maqari")),
        getDocs(collection(db, "events")),
        getDocs(collection(db, "lessons")),
        getDocs(collection(db, "sections")),
        getDocs(collection(db, "preachers")),
      ])

      const preachersData = preachersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Preacher[]

      setPreachers(preachersData)

      // Combine all activities
      const allActivities = [
        ...maqariSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), type: "maqari" })),
        ...eventsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), type: "events" })),
        ...lessonsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), type: "lessons" })),
        ...sectionsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), type: "sections" })),
      ] as (ActivityType & { type: string })[]

      // Calculate activities by type
      const activitiesByType = [
        { type: "Maqari", count: maqariSnapshot.size },
        { type: "Events", count: eventsSnapshot.size },
        { type: "Lessons", count: lessonsSnapshot.size },
        { type: "Sections", count: sectionsSnapshot.size },
      ]

      // Get recent activities (last 10)
      const recentActivities = allActivities
        .sort(
          (a, b) => new Date(b.created_at.seconds * 1000).getTime() - new Date(a.created_at.seconds * 1000).getTime(),
        )
        .slice(0, 10)

      // Calculate top creators
      const creatorCounts = allActivities.reduce(
        (acc, activity) => {
          acc[activity.creator_id] = (acc[activity.creator_id] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

      const topCreators = Object.entries(creatorCounts)
        .map(([creatorId, count]) => {
          const creator = preachersData.find((p) => p.id === creatorId)
          return {
            name: creator?.name || "Unknown",
            count,
          }
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // Calculate activities over time (last 6 months)
      const activitiesOverTime = []
      for (let i = 5; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)

        const count = allActivities.filter((activity) => {
          const activityDate = new Date(activity.created_at.seconds * 1000)
          return activityDate >= monthStart && activityDate <= monthEnd
        }).length

        activitiesOverTime.push({
          month: format(monthStart, "MMM yyyy"),
          count,
        })
      }

      setAnalytics({
        totalActivities: allActivities.length,
        activitiesByType,
        recentActivities,
        topCreators,
        activitiesOverTime,
      })
    } catch (error) {
      console.error("Error fetching activity analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  const getCreatorName = (creatorId: string) => {
    const creator = preachers.find((p) => p.id === creatorId)
    return creator?.name || "Unknown"
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!analytics) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Activity Analytics</h2>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalActivities}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Active Creator</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{analytics.topCreators[0]?.name || "N/A"}</div>
            <div className="text-sm text-muted-foreground">{analytics.topCreators[0]?.count || 0} activities</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.activitiesOverTime[analytics.activitiesOverTime.length - 1]?.count || 0}
            </div>
            <div className="text-sm text-muted-foreground">New activities</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Popular Type</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {analytics.activitiesByType.sort((a, b) => b.count - a.count)[0]?.type || "N/A"}
            </div>
            <div className="text-sm text-muted-foreground">
              {analytics.activitiesByType.sort((a, b) => b.count - a.count)[0]?.count || 0} activities
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Activities by Type</CardTitle>
            <CardDescription>Distribution of different activity types</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: {
                  label: "Activities",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.activitiesByType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ type, count }) => (count > 0 ? `${type}: ${count}` : "")}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {analytics.activitiesByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activities Over Time</CardTitle>
            <CardDescription>Activity creation trends over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: {
                  label: "Activities",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.activitiesOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(var(--chart-2))" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Creators */}
      <Card>
        <CardHeader>
          <CardTitle>Top Activity Creators</CardTitle>
          <CardDescription>Most active users in creating activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.topCreators.map((creator, index) => (
              <div key={creator.name} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">#{index + 1}</Badge>
                  <div className="font-medium">{creator.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{creator.count}</div>
                  <div className="text-xs text-muted-foreground">Activities</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
          <CardDescription>Latest activities created in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.recentActivities.map((activity) => (
              <div
                key={`${activity.type}-${activity.id}`}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <div className="font-medium">{activity.name}</div>
                  <div className="text-sm text-muted-foreground">Created by {getCreatorName(activity.creator_id)}</div>
                </div>
                <div className="text-right">
                  <Badge variant="secondary">
                    {activityTypeLabels[activity.type as keyof typeof activityTypeLabels]}
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">
                    {format(new Date(activity.created_at.seconds * 1000), "MMM dd, yyyy")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
