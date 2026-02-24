"use client"

import { useMemo } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Layers } from "lucide-react"
import { DAWA_STAGES } from "@/lib/firestore-collections"
import type { DashboardData } from "@/hooks/use-dashboard-data"

interface StageDistributionChartProps {
  data: DashboardData
}

const STAGE_COLORS = [
  "hsl(210, 79%, 56%)", // New Contact - blue
  "hsl(38, 92%, 50%)", // Initial Interest - amber
  "hsl(262, 83%, 58%)", // Regular Attendance - purple
  "hsl(142, 76%, 36%)", // Committed Learner - green
  "hsl(172, 66%, 50%)", // Active Participant - teal
  "hsl(346, 87%, 43%)", // Community Leader - rose
]

const STAGE_LABELS: Record<string, string> = {
  "تواصل جديد": "New Contact",
  "اهتمام أولي": "Initial Interest",
  "حضور منتظم": "Regular Attend",
  "متعلم ملتزم": "Committed",
  "مشارك نشط": "Active",
  "قائد مجتمعي": "Leader",
}

const STAGE_FULL_LABELS: Record<string, string> = {
  "تواصل جديد": "New Contact",
  "اهتمام أولي": "Initial Interest",
  "حضور منتظم": "Regular Attendance",
  "متعلم ملتزم": "Committed Learner",
  "مشارك نشط": "Active Participant",
  "قائد مجتمعي": "Community Leader",
}

export function StageDistributionChart({
  data,
}: StageDistributionChartProps) {
  const chartData = useMemo(() => {
    return DAWA_STAGES.map((stage, index) => ({
      stage: STAGE_LABELS[stage] || stage,
      stageFull: STAGE_FULL_LABELS[stage] || stage,
      stageAr: stage,
      count: data.beneficiaries.filter((b) => b.da_wa_stage === stage)
        .length,
      color: STAGE_COLORS[index] || "hsl(var(--primary))",
      percentage:
        data.beneficiaries.length > 0
          ? Math.round(
              (data.beneficiaries.filter((b) => b.da_wa_stage === stage)
                .length /
                data.beneficiaries.length) *
                100
            )
          : 0,
    }))
  }, [data.beneficiaries])

  if (data.loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-purple-600" />
          Stage Distribution
        </CardTitle>
        <CardDescription>
          Number of beneficiaries at each da&apos;wa stage
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 sm:h-80 md:h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 0, right: 20, top: 5, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border"
                horizontal={false}
              />
              <XAxis
                type="number"
                className="text-xs"
                tick={{ fontSize: 10 }}
                allowDecimals={false}
                
              />
              <YAxis
                type="category"
                dataKey="stage"
                className="text-xs"
                width={70}
                dx={-60} 
                tick={{ fontSize: 10 }}
                
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number, _: string, entry: any) => [
                  `${value} (${entry.payload.percentage}%)`,
                  "Beneficiaries",
                ]}
                labelFormatter={(_, payload) =>
                  payload?.[0]?.payload?.stageFull || ""
                }
              />
              <Bar
                dataKey="count"
                radius={[0, 4, 4, 0]}
                maxBarSize={28}
                label={{
                  position: "right",
                  fontSize: 10,
                  dx: 15,
                  fill: "hsl(var(--muted-foreground))",
                  formatter: (value) => (typeof value === "number" && value > 0 ? value : ""),
                  
                }}
              >
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mt-4 pt-4 border-t">
          {chartData.map((item) => (
            <div
              key={item.stageAr}
              className="flex items-center gap-1.5 text-xs sm:text-sm"
            >
              <div
                className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-muted-foreground whitespace-nowrap">
                {item.stageFull}: {item.count} ({item.percentage}%)
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
