"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { useEffect, useState } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Preacher, Beneficiary, DAWA_STAGES } from "@/lib/firestore-collections"
import { cn } from "@/lib/utils"
import { UserCheck, Users, TrendingUp, Award } from "lucide-react"
import { ResponsiveContainer, CartesianGrid, XAxis, YAxis, Bar, BarChart } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart"
import { Skeleton } from "../ui/skeleton"

type PreacherPerformance = {
  id: string
  name: string
  email: string
  totalBeneficiaries: number
  averageStage: number
  recentGrowth: number
}

export function PreacherAnalytics() {
  const [preacherData, setPreacherData] = useState<PreacherPerformance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPreacherAnalytics()
  }, [])

  const fetchPreacherAnalytics = async () => {
    try {
      setLoading(true)
      const [preachersSnapshot, beneficiariesSnapshot] = await Promise.all([
        getDocs(query(collection(db, "preachers"), where("role", "==", "da'i"))),
        getDocs(collection(db, "beneficiaries")),
      ]);

      const preachers = preachersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Preacher[]
      const beneficiaries = beneficiariesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Beneficiary[]

      const performanceData = preachers.map((preacher) => {
        const preacherBeneficiaries = beneficiaries.filter((b) => b.da_i_id === preacher.id)
        const stageValues = preacherBeneficiaries.map((b) => DAWA_STAGES.indexOf(b.da_wa_stage))
        const averageStage = stageValues.length > 0 ? stageValues.reduce((a, b) => a + b, 0) / stageValues.length : 0
        
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const recentGrowth = preacherBeneficiaries.filter(
          (b) => b.created_at && (b.created_at as any).toDate() >= thirtyDaysAgo,
        ).length

        return {
          id: preacher.id, name: preacher.name, email: preacher.email,
          totalBeneficiaries: preacherBeneficiaries.length,
          averageStage, recentGrowth,
        }
      })

      performanceData.sort((a, b) => b.totalBeneficiaries - a.totalBeneficiaries)
      setPreacherData(performanceData)
    } catch (error) { console.error("Error fetching preacher analytics:", error) } 
    finally { setLoading(false) }
  }

  const getPerformanceLevel = (averageStage: number) => {
    if (averageStage >= 4) return { label: "Excellent", color: "bg-green-500" }
    if (averageStage >= 3) return { label: "Good", color: "bg-primary" }
    if (averageStage >= 2) return { label: "Average", color: "bg-yellow-500" }
    return { label: "Needs Support", color: "bg-red-500" }
  }
  
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardHeader><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-16" /></CardHeader></Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card><CardHeader><Skeleton className="h-6 w-48" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-6 w-48" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
        </div>
      </div>
    )
  }

  const totalPreachers = preacherData.length;
  const totalBeneficiaries = preacherData.reduce((sum, p) => sum + p.totalBeneficiaries, 0);
  const averageBeneficiariesPerPreacher = totalPreachers > 0 ? totalBeneficiaries / totalPreachers : 0;
  const topPerformer = preacherData[0];

  const chartData = preacherData.slice(0, 10).map((preacher) => ({
    name: preacher.name.split(" ")[0] || preacher.name,
    beneficiaries: preacher.totalBeneficiaries,
    recentGrowth: preacher.recentGrowth,
  }));

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-2">
            <UserCheck className="h-6 w-6" />
            <h2 className="text-2xl font-bold">Preacher Analytics</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Preachers</CardTitle><UserCheck className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{totalPreachers}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Beneficiaries</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{totalBeneficiaries}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Average per Preacher</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{averageBeneficiariesPerPreacher.toFixed(1)}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Top Performer</CardTitle><Award className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-lg font-bold">{topPerformer?.name || "N/A"}</div><div className="text-sm text-muted-foreground">{topPerformer?.totalBeneficiaries || 0} beneficiaries</div></CardContent></Card>
        </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Beneficiaries per Preacher</CardTitle>
            <CardDescription>Top 10 preachers by number of beneficiaries</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ beneficiaries: { label: "Beneficiaries", color: "hsl(var(--chart-1))" } }} className="h-80 sm:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={chartData} 
                  margin={{ top: 30, right: 40, left: 40, bottom: 100 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100} 
                    fontSize={11}
                    interval={0}
                    tick={{ fontSize: 11 }}
                    tickMargin={10}
                  />
                  <YAxis 
                    fontSize={11}
                    tickMargin={10}
                    width={50}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="beneficiaries" 
                    fill="hsl(var(--chart-1))" 
                    radius={[4, 4, 0, 0]}
                  />
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
            <ChartContainer config={{ recentGrowth: { label: "New Beneficiaries", color: "hsl(var(--chart-2))" } }} className="h-80 sm:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={chartData} 
                  margin={{ top: 30, right: 40, left: 40, bottom: 100 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100} 
                    fontSize={11}
                    interval={0}
                    tick={{ fontSize: 11 }}
                    tickMargin={10}
                  />
                  <YAxis 
                    fontSize={11}
                    tickMargin={10}
                    width={50}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="recentGrowth" 
                    fill="hsl(var(--chart-2))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
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
                <div key={preacher.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{preacher.name}</div>
                    <div className="text-sm text-muted-foreground truncate">{preacher.email}</div>
                  </div>
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between">
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
