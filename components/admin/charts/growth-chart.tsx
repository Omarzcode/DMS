"use client"

import { useMemo } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
import { TrendingUp } from "lucide-react"
import {
  format,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
} from "date-fns"
import type { DashboardData } from "@/hooks/use-dashboard-data"
import { getDateFromTimestamp } from "@/hooks/use-dashboard-data"

interface GrowthChartProps {
  data: DashboardData
}

export function GrowthChart({ data }: GrowthChartProps) {
  const chartData = useMemo(() => {
    const now = new Date()
    const months = eachMonthOfInterval({
      start: startOfMonth(subMonths(now, 11)),
      end: startOfMonth(now),
    })

    let cumulative = 0
    const beforeWindow = data.beneficiaries.filter(
      (b) => getDateFromTimestamp(b.created_at) < months[0]
    ).length
    cumulative = beforeWindow

    return months.map((month) => {
      const monthEnd = endOfMonth(month)
      const newInMonth = data.beneficiaries.filter((b) => {
        const created = getDateFromTimestamp(b.created_at)
        return created >= month && created <= monthEnd
      }).length

      cumulative += newInMonth

      return {
        month: format(month, "MMM yyyy"),
        monthShort: format(month, "MMM"),
        new: newInMonth,
        total: cumulative,
      }
    })
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
          <TrendingUp className="h-5 w-5 text-green-600" />
          Beneficiary Growth
        </CardTitle>
        <CardDescription>
          New beneficiaries and cumulative total over the last 12 months
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ left: 0, right: 10, top: 10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0}
                  />
                </linearGradient>
                <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(142, 76%, 36%)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(142, 76%, 36%)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border"
              />
              <XAxis
                dataKey="monthShort"
                className="text-xs"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
                height={30}
              />
              <YAxis
                className="text-xs"
                width={40}
                tick={{ fontSize: 10 }}
                dx={-20}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelFormatter={(_, payload) =>
                  payload?.[0]?.payload?.month || ""
                }
              />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                formatter={(value) => (
                                    <span style={{ marginLeft: "4px", marginRight: "2px" }}>{value}</span>
                                )}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="hsl(var(--primary))"
                fill="url(#colorTotal)"
                strokeWidth={2}
                name="Total"
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Area
                type="monotone"
                dataKey="new"
                stroke="hsl(142, 76%, 36%)"
                fill="url(#colorNew)"
                strokeWidth={2}
                name="New"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}