"use client"

import { useMemo, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Users,
  TrendingUp,
  Target,
  Sparkles,
  ArrowUpRight,
  Filter,
} from "lucide-react"
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns"
import type { DashboardData } from "@/hooks/use-dashboard-data"
import { getDateFromTimestamp } from "@/hooks/use-dashboard-data"

interface CohortRetentionTableProps {
  data: DashboardData
}

interface CohortRow {
  name: string
  periodKey: string
  total: number
  newContact: number
  initialInterest: number
  regularAttendance: number
  committedLearner: number
  retentionRate: number // % in regular or committed
}

export function CohortRetentionTable({ data }: CohortRetentionTableProps) {
  const [filterMode, setFilterMode] = useState<"month" | "batch">("month")

  const { cohorts, overallRetention, totalLearners, activeCohortsCount } = useMemo(() => {
    if (!data.beneficiaries || data.beneficiaries.length === 0) {
      return {
        cohorts: [],
        overallRetention: 0,
        totalLearners: 0,
        activeCohortsCount: 0,
      }
    }

    const cohortMap = new Map<string, CohortRow>()

    if (filterMode === "month") {
      // Generate last 6 months as buckets
      const now = new Date()
      for (let i = 5; i >= 0; i--) {
        const m = subMonths(now, i)
        const key = format(m, "yyyy-MM")
        const label = format(m, "MMM yyyy")
        cohortMap.set(key, {
          name: label,
          periodKey: key,
          total: 0,
          newContact: 0,
          initialInterest: 0,
          regularAttendance: 0,
          committedLearner: 0,
          retentionRate: 0,
        })
      }

      data.beneficiaries.forEach((b) => {
        const d = getDateFromTimestamp(b.created_at)
        const key = format(d, "yyyy-MM")
        let row = cohortMap.get(key)
        if (!row) {
          // If older or future, group into an Earlier / Other cohort
          return
        }

        row.total += 1
        if (b.da_wa_stage === "New Contact") row.newContact += 1
        else if (b.da_wa_stage === "Initial Interest") row.initialInterest += 1
        else if (b.da_wa_stage === "Regular Attendance") row.regularAttendance += 1
        else if (b.da_wa_stage === "Committed Learner") row.committedLearner += 1
      })
    } else {
      // Group by batch
      data.beneficiaries.forEach((b) => {
        const batchName = b.batch?.trim() || "General Enrollment"
        let row = cohortMap.get(batchName)
        if (!row) {
          row = {
            name: batchName,
            periodKey: batchName,
            total: 0,
            newContact: 0,
            initialInterest: 0,
            regularAttendance: 0,
            committedLearner: 0,
            retentionRate: 0,
          }
          cohortMap.set(batchName, row)
        }

        row.total += 1
        if (b.da_wa_stage === "New Contact") row.newContact += 1
        else if (b.da_wa_stage === "Initial Interest") row.initialInterest += 1
        else if (b.da_wa_stage === "Regular Attendance") row.regularAttendance += 1
        else if (b.da_wa_stage === "Committed Learner") row.committedLearner += 1
      })
    }

    const rows: CohortRow[] = []
    let sumRetained = 0
    let sumTotal = 0

    cohortMap.forEach((row) => {
      const retained = row.regularAttendance + row.committedLearner
      row.retentionRate = row.total > 0 ? Math.round((retained / row.total) * 100) : 0
      sumRetained += retained
      sumTotal += row.total
      rows.push(row)
    })

    const overall = sumTotal > 0 ? Math.round((sumRetained / sumTotal) * 100) : 0

    return {
      cohorts: rows,
      overallRetention: overall,
      totalLearners: sumRetained,
      activeCohortsCount: rows.filter((r) => r.total > 0).length,
    }
  }, [data.beneficiaries, filterMode])

  if (data.loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
        <div>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Stage Progression & Cohort Retention
          </CardTitle>
          <CardDescription>
            Conversion rates of beneficiaries moving from initial contact into regular and committed participation.
          </CardDescription>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-lg self-start sm:self-center">
          <button
            type="button"
            onClick={() => setFilterMode("month")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              filterMode === "month"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            By Join Month
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("batch")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              filterMode === "batch"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            By Batch / Group
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Metric Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/10">
            <span className="text-xs text-muted-foreground block font-medium">
              Overall Retention Rate
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-primary">
                {overallRetention}%
              </span>
              <span className="text-xs text-muted-foreground">
                (Regular & Committed)
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/50 border border-border">
            <span className="text-xs text-muted-foreground block font-medium">
              Active Engaged Learners
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {totalLearners}
              </span>
              <span className="text-xs text-muted-foreground">
                of {data.beneficiaries.length} total
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/50 border border-border">
            <span className="text-xs text-muted-foreground block font-medium">
              Active Cohorts Tracked
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {activeCohortsCount}
              </span>
              <span className="text-xs text-muted-foreground">
                {filterMode === "month" ? "monthly periods" : "groups"}
              </span>
            </div>
          </div>
        </div>

        {/* Cohort Table */}
        <div className="rounded-xl border border-border overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-semibold text-xs">Cohort / Period</TableHead>
                <TableHead className="font-semibold text-xs text-center">Total</TableHead>
                <TableHead className="font-semibold text-xs text-center">New Contact</TableHead>
                <TableHead className="font-semibold text-xs text-center">Initial Interest</TableHead>
                <TableHead className="font-semibold text-xs text-center">Regular Attendance</TableHead>
                <TableHead className="font-semibold text-xs text-center">Committed</TableHead>
                <TableHead className="font-semibold text-xs min-w-[140px]">Retention Velocity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cohorts.length === 0 || cohorts.every((c) => c.total === 0) ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                    No beneficiary records found for this view.
                  </TableCell>
                </TableRow>
              ) : (
                cohorts.map((row) => (
                  <TableRow key={row.periodKey} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="font-medium text-sm">
                      {row.name}
                    </TableCell>
                    <TableCell className="text-center font-bold text-sm">
                      {row.total}
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {row.newContact}
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {row.initialInterest}
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                        {row.regularAttendance}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                        {row.committedLearner}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-foreground">
                            {row.retentionRate}%
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {row.regularAttendance + row.committedLearner}/{row.total}
                          </span>
                        </div>
                        <Progress
                          value={row.retentionRate}
                          className="h-1.5"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
