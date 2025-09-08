"use client"

import { useState, useEffect } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, TrendingUp, Calendar, Search } from "lucide-react"
import { format, subDays, startOfDay } from "date-fns"
import type { Beneficiary, Preacher } from "@/lib/firestore-collections"
import { DAWA_STAGES } from "@/lib/firestore-collections"

interface BeneficiaryAnalytics {
  totalBeneficiaries: number
  growthData: Array<{ date: string; count: number }>
  stageProgression: Array<{ stage: string; count: number }>
  inactiveBeneficiaries: Beneficiary[]
  topPerformingBatches: Array<{ batch: string; count: number; averageStage: number }>
}

export function BeneficiaryAnalytics() {
  const [analytics, setAnalytics] = useState<BeneficiaryAnalytics | null>(null)
  const [preachers, setPreachers] = useState<Preacher[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("30")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchBeneficiaryAnalytics()
  }, [timeRange])

  const fetchBeneficiaryAnalytics = async () => {
    try {
      setLoading(true)

      // Fetch beneficiaries and preachers
      const [beneficiariesSnapshot, preachersSnapshot] = await Promise.all([
        getDocs(collection(db, "beneficiaries")),
        getDocs(collection(db, "preachers")),
      ])

      const beneficiaries = beneficiariesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Beneficiary[]

      const preachersData = preachersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Preacher[]

      setPreachers(preachersData)

      // Calculate growth data
      const days = Number.parseInt(timeRange)
      const growthData = []
      for (let i = days - 1; i >= 0; i--) {
        const date = startOfDay(subDays(new Date(), i))
        const count = beneficiaries.filter((b) => b.created_at && new Date(b.created_at.seconds * 1000) <= date).length
        growthData.push({
          date: format(date, "MMM dd"),
          count,
        })
      }

      // Calculate stage progression
      const stageProgression = DAWA_STAGES.map((stage) => ({
        stage,
        count: beneficiaries.filter((b) => b.da_wa_stage === stage).length,
      }))

      // Find inactive beneficiaries (no recent activity - simplified for now)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const inactiveBeneficiaries = beneficiaries.filter(
        (b) => b.created_at && new Date(b.created_at.seconds * 1000) < thirtyDaysAgo,
      )

      // Calculate top performing batches
      const batchGroups = beneficiaries.reduce(
        (acc, b) => {
          if (!acc[b.batch]) {
            acc[b.batch] = []
          }
          acc[b.batch].push(b)
          return acc
        },
        {} as Record<string, Beneficiary[]>,
      )

      const topPerformingBatches = Object.entries(batchGroups)
        .map(([batch, members]) => {
          const stageValues = members.map((m) => DAWA_STAGES.indexOf(m.da_wa_stage))
          const averageStage = stageValues.reduce((a, b) => a + b, 0) / stageValues.length
          return {
            batch,
            count: members.length,
            averageStage,
          }
        })
        .sort((a, b) => b.averageStage - a.averageStage)
        .slice(0, 10)

      setAnalytics({
        totalBeneficiaries: beneficiaries.length,
        growthData,
        stageProgression,
        inactiveBeneficiaries: inactiveBeneficiaries.slice(0, 20), // Limit for display
        topPerformingBatches,
      })
    } catch (error) {
      console.error("Error fetching beneficiary analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  const getPreacherName = (preacherId: string) => {
    const preacher = preachers.find((p) => p.id === preacherId)
    return preacher?.name || "Unknown"
  }

  const filteredInactive = analytics?.inactiveBeneficiaries.filter(
    (b) =>
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.batch.toLowerCase().includes(searchTerm.toLowerCase()),
  )

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Beneficiary Analytics</h2>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 days</SelectItem>
            <SelectItem value="30">30 days</SelectItem>
            <SelectItem value="90">90 days</SelectItem>
            <SelectItem value="365">1 year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Beneficiaries</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalBeneficiaries}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.growthData.length > 1
                ? `+${analytics.growthData[analytics.growthData.length - 1].count - analytics.growthData[0].count}`
                : "0"}
            </div>
            <div className="text-xs text-muted-foreground">Last {timeRange} days</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Count</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.inactiveBeneficiaries.length}</div>
            <div className="text-xs text-muted-foreground">No recent activity</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Batch</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{analytics.topPerformingBatches[0]?.batch || "N/A"}</div>
            <div className="text-xs text-muted-foreground">
              Avg Stage: {analytics.topPerformingBatches[0]?.averageStage.toFixed(1) || "0"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Growth Over Time</CardTitle>
            <CardDescription>Cumulative beneficiary count over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: {
                  label: "Beneficiaries",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.growthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stage Distribution</CardTitle>
            <CardDescription>Current distribution across da'wa stages</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: {
                  label: "Count",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.stageProgression} margin={{ bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" angle={-45} textAnchor="end" height={80} fontSize={12} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(var(--chart-2))" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Batches */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Batches</CardTitle>
          <CardDescription>Batches with highest average da'wa stage progression</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.topPerformingBatches.map((batch, index) => (
              <div key={batch.batch} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">#{index + 1}</Badge>
                  <div>
                    <div className="font-medium">{batch.batch}</div>
                    <div className="text-sm text-muted-foreground">{batch.count} members</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{batch.averageStage.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">Avg Stage</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Inactive Beneficiaries */}
      <Card>
        <CardHeader>
          <CardTitle>Inactive Beneficiaries</CardTitle>
          <CardDescription>Beneficiaries who may need additional attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search inactive beneficiaries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredInactive?.map((beneficiary) => (
                <div key={beneficiary.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{beneficiary.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {beneficiary.batch} • {getPreacherName(beneficiary.da_i_id)}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">{beneficiary.da_wa_stage}</Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      Added: {format(new Date(beneficiary.created_at.seconds * 1000), "MMM dd, yyyy")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
