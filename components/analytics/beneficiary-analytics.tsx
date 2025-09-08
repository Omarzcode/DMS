"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, query, where, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, TrendingUp } from "lucide-react"
import { format, subDays, startOfDay } from "date-fns"
import type { Beneficiary, Preacher, AttendanceRecord } from "@/lib/firestore-collections"
import { DAWA_STAGES } from "@/lib/firestore-collections"

interface BeneficiaryAnalytics {
  totalBeneficiaries: number
  growthData: Array<{ date: string; count: number }>
  stageProgression: Array<{ stage: string; count: number }>
  inactiveBeneficiaries: Beneficiary[]
}

export function BeneficiaryAnalytics() {
  const [analytics, setAnalytics] = useState<BeneficiaryAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBeneficiaryAnalytics()
  }, [])

  const fetchBeneficiaryAnalytics = async () => {
    try {
      setLoading(true)
      const [beneficiariesSnapshot, attendanceSnapshot] = await Promise.all([
        getDocs(collection(db, "beneficiaries")),
        getDocs(collection(db, "attendance"))
      ]);

      const beneficiaries = beneficiariesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Beneficiary[]
      const attendanceRecords = attendanceSnapshot.docs.map(doc => doc.data() as AttendanceRecord);
      
      const growthData = Array.from({ length: 30 }, (_, i) => {
        const date = startOfDay(subDays(new Date(), 29 - i));
        const count = beneficiaries.filter(b => b.created_at && (b.created_at as any).toDate() <= date).length;
        return { date: format(date, "MMM dd"), count };
      });

      const stageProgression = DAWA_STAGES.map(stage => ({
        stage, count: beneficiaries.filter(b => b.da_wa_stage === stage).length,
      }));

      const thirtyDaysAgo = subDays(new Date(), 30);
      const activeBeneficiaryIds = new Set(
        attendanceRecords
          .filter(rec => rec.logged_at && (rec.logged_at as any).toDate() >= thirtyDaysAgo)
          .map(rec => rec.beneficiary_id)
      );
      const inactiveBeneficiaries = beneficiaries.filter(b => !activeBeneficiaryIds.has(b.id));
      
      setAnalytics({
        totalBeneficiaries: beneficiaries.length,
        growthData, stageProgression,
        inactiveBeneficiaries: inactiveBeneficiaries.slice(0, 20),
      })
    } catch (error) { console.error("Error fetching beneficiary analytics:", error) } 
    finally { setLoading(false) }
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

  if (!analytics) return null;
  
  const growthLast30Days = analytics.growthData.length > 1 
    ? analytics.growthData[analytics.growthData.length - 1].count - analytics.growthData[0].count 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Beneficiary Analytics</h2>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Beneficiaries</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{analytics.totalBeneficiaries}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Growth (Last 30d)</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">+{growthLast30Days}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Inactive (Last 30d)</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{analytics.inactiveBeneficiaries.length}</div></CardContent></Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Growth Over Time</CardTitle>
            <CardDescription>Cumulative beneficiary count over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ count: { label: "Beneficiaries", color: "hsl(var(--chart-1))" } }} className="h-64">
              <ResponsiveContainer width="100%" height="100%"><LineChart data={analytics.growthData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis allowDecimals={false} /><ChartTooltip content={<ChartTooltipContent />} /><Line type="monotone" dataKey="count" stroke="hsl(var(--chart-1))" strokeWidth={2} /></LineChart></ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Stage Distribution</CardTitle>
            <CardDescription>Current distribution across da'wa stages</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ count: { label: "Count", color: "hsl(var(--chart-2))" } }} className="h-64">
              <ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.stageProgression} margin={{ bottom: 60 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="stage" angle={-45} textAnchor="end" height={80} fontSize={12} /><YAxis allowDecimals={false} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="count" fill="hsl(var(--chart-2))" /></BarChart></ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
