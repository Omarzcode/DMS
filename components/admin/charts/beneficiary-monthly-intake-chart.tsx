"use client"

import { useMemo } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts"
import { UserPlus, TrendingUp } from "lucide-react"
import type { DashboardData } from "@/hooks/use-dashboard-data"
import { getDateFromTimestamp } from "@/hooks/use-dashboard-data"
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns"

interface BeneficiaryMonthlyIntakeChartProps {
  data: DashboardData
}

export function BeneficiaryMonthlyIntakeChart({
  data,
}: BeneficiaryMonthlyIntakeChartProps) {
  const chartData = useMemo(() => {
    const activeBeneficiaries = data.beneficiaries.filter((b) => !b.deleted)
    const now = new Date()

    // Last 6 months array
    const months = []
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i)
      const start = startOfMonth(monthDate)
      const end = endOfMonth(monthDate)
      const label = format(monthDate, "MMM yy")

      const added = activeBeneficiaries.filter((b) => {
        const created = getDateFromTimestamp(b.created_at)
        return created >= start && created <= end
      }).length

      months.push({
        month: label,
        count: added,
        isCurrent: i === 0,
      })
    }

    return months
  }, [data.beneficiaries])

  const totalRecent = chartData.reduce((acc, curr) => acc + curr.count, 0)

  return (
    <Card className="border border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden shadow-sm">
      <CardHeader className="p-4 sm:p-6 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400">
                <TrendingUp className="h-4 w-4" />
              </div>
              <CardTitle className="text-lg font-bold tracking-tight">
                Monthly Member Intake
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              New beneficiaries joined per month over the past 6 months.
            </CardDescription>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
            {totalRecent} joined in last 6 months
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                opacity={0.3}
                vertical={false}
              />
              <XAxis
                dataKey="month"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload
                    return (
                      <div className="rounded-lg border border-border/80 bg-background/95 backdrop-blur-md p-3 shadow-xl text-xs space-y-1">
                        <p className="font-bold text-foreground">{item.month}</p>
                        <p className="text-violet-400 font-semibold font-mono">
                          {item.count} new beneficiaries
                        </p>
                        {item.isCurrent && (
                          <span className="text-[10px] text-muted-foreground block">
                            (Current ongoing month)
                          </span>
                        )}
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isCurrent ? "#8b5cf6" : "#6366f1"}
                    opacity={entry.isCurrent ? 1 : 0.75}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
