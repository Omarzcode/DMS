"use client"

import { useState, useEffect } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import type { Beneficiary } from "@/lib/firestore-collections"
import { DAWA_STAGES } from "@/lib/firestore-collections"

interface StageDistribution {
  stage: string
  count: number
  percentage: number
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--accent))",
]

export function BeneficiaryDistributionChart() {
  const [data, setData] = useState<StageDistribution[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDistributionData()
  }, [])

  const fetchDistributionData = async () => {
    try {
      setLoading(true)
      const beneficiariesSnapshot = await getDocs(collection(db, "beneficiaries"))
      const beneficiaries = beneficiariesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Beneficiary[]

      // Count beneficiaries by stage
      const stageCounts = DAWA_STAGES.reduce(
        (acc, stage) => {
          acc[stage] = beneficiaries.filter((b) => b.da_wa_stage === stage).length
          return acc
        },
        {} as Record<string, number>,
      )

      const total = beneficiaries.length

      // Convert to chart data
      const chartData = DAWA_STAGES.map((stage) => ({
        stage,
        count: stageCounts[stage] || 0,
        percentage: total > 0 ? ((stageCounts[stage] || 0) / total) * 100 : 0,
      }))

      setData(chartData)
    } catch (error) {
      console.error("Error fetching distribution data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Da'wa Stage Distribution</CardTitle>
          <CardDescription>Beneficiaries by their current da'wa progress stage</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              count: {
                label: "Beneficiaries",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-48 sm:h-64"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ stage, percentage }) => (percentage > 5 ? `${percentage.toFixed(0)}%` : "")}
                  outerRadius="80%"
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  formatter={(value, name, props) => [
                    `${value} beneficiaries (${props.payload.percentage.toFixed(1)}%)`,
                    props.payload.stage,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stage Breakdown</CardTitle>
          <CardDescription>Detailed count by da'wa stage</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              count: {
                label: "Count",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-48 sm:h-64"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="stage" 
                  angle={-45} 
                  textAnchor="end" 
                  height={60} 
                  fontSize={10}
                  interval={0}
                />
                <YAxis />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  formatter={(value, name, props) => [`${value} beneficiaries`, props.payload.stage]}
                />
                <Bar dataKey="count" fill="hsl(var(--chart-1))" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
