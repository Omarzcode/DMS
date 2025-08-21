"use client"

import { cn } from "@/lib/utils"

import { useState, useEffect } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { UserCheck, Users, TrendingUp, Award } from "lucide-react"
import type { Beneficiary, Preacher } from "@/lib/firestore-collections"
import { DAWA_STAGES } from "@/lib/firestore-collections"

interface PreacherPerformance {
  id: string
  name: string
  email: string
  totalBeneficiaries: number
  stageDistribution: Record<string, number>
  averageStage: number
  recentGrowth: number
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

export function PreacherAnalytics() {
  const [preacherData, setPreacherData] = useState<PreacherPerformance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPreacherAnalytics()
  }, [])

  const fetchPreacherAnalytics = async () => {
    try {
      setLoading(true)

      // Fetch all preachers and beneficiaries
      const [preachersSnapshot, beneficiariesSnapshot] = await Promise.all([
        getDocs(query(collection(db, "preachers"), where("role", "==", "da'i"))),
        getDocs(collection(db, "beneficiaries")),
      ])

      const preachers = preachersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Preacher[]

      const beneficiaries = beneficiariesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Beneficiary[]

      // Calculate performance metrics for each preacher
      const performanceData = preachers.map((preacher) => {
        const preacherBeneficiaries = beneficiaries.filter((b) => b.da_i_id === preacher.id)

        // Calculate stage distribution
        const stageDistribution = DAWA_STAGES.reduce(
          (acc, stage) => {
            acc[stage] = preacherBeneficiaries.filter((b) => b.da_wa_stage === stage).length
            return acc
          },
          {} as Record<string, number>,
        )

        // Calculate average stage (numerical representation)
        const stageValues = preacherBeneficiaries.map((b) => DAWA_STAGES.indexOf(b.da_wa_stage))
        const averageStage = stageValues.length > 0 ? stageValues.reduce((a, b) => a + b, 0) / stageValues.length : 0

        // Calculate recent growth (beneficiaries added in last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const recentGrowth = preacherBeneficiaries.filter(
          (b) => b.created_at && new Date(b.created_at.seconds * 1000) >= thirtyDaysAgo,
        ).length

        return {
          id: preacher.id,
          name: preacher.name,
          email: preacher.email,
          totalBeneficiaries: preacherBeneficiaries.length,
          stageDistribution,
          averageStage,
          recentGrowth,
        }
      })

      // Sort by total beneficiaries (descending)
      performanceData.sort((a, b) => b.totalBeneficiaries - a.totalBeneficiaries)

      setPreacherData(performanceData)
    } catch (error) {
      console.error("Error fetching preacher analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  const getPerformanceLevel = (averageStage: number) => {
    if (averageStage >= 4) return { label: "Excellent", color: "bg-green-500" }
    if (averageStage >= 3) return { label: "Good", color: "bg-blue-500" }
    if (averageStage >= 2) return { label: "Average", color: "bg-yellow-500" }
    return { label: "Needs Support", color: "bg-red-500" }
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

  const totalPreachers = preacherData.length
  const totalBeneficiaries = preacherData.reduce((sum, p) => sum + p.totalBeneficiaries, 0)
  const averageBeneficiariesPerPreacher = totalPreachers > 0 ? totalBeneficiaries / totalPreachers : 0
  const topPerformer = preacherData[0]

  // Prepare chart data
  const chartData = preacherData.slice(0, 10).map((preacher) => ({
    name: preacher.name.split(" ")[0], // First name only for chart
    beneficiaries: preacher.totalBeneficiaries,
    averageStage: preacher.averageStage,
    recentGrowth: preacher.recentGrowth,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <UserCheck className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Preacher Analytics</h2>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Preachers</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPreachers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Beneficiaries</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBeneficiaries}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average per Preacher</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageBeneficiariesPerPreacher.toFixed(1)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{topPerformer?.name || "N/A"}</div>
            <div className="text-sm text-muted-foreground">{topPerformer?.totalBeneficiaries || 0} beneficiaries</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Beneficiaries per Preacher</CardTitle>
            <CardDescription>Top 10 preachers by number of beneficiaries</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                beneficiaries: {
                  label: "Beneficiaries",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="beneficiaries" fill="hsl(var(--chart-1))" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Growth</CardTitle>
            <CardDescription>New beneficiaries added in last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                recentGrowth: {
                  label: "New Beneficiaries",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="recentGrowth" fill="hsl(var(--chart-2))" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Preacher Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Preacher Performance Details</CardTitle>
          <CardDescription>Detailed performance metrics for each preacher</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {preacherData.map((preacher) => {
              const performance = getPerformanceLevel(preacher.averageStage)
              return (
                <div key={preacher.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{preacher.name}</div>
                    <div className="text-sm text-muted-foreground">{preacher.email}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold">{preacher.totalBeneficiaries}</div>
                      <div className="text-xs text-muted-foreground">Beneficiaries</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">{preacher.recentGrowth}</div>
                      <div className="text-xs text-muted-foreground">Recent Growth</div>
                    </div>
                    <div className="text-center">
                      <Badge variant="secondary" className={cn("text-white", performance.color)}>
                        {performance.label}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        Avg Stage: {preacher.averageStage.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
