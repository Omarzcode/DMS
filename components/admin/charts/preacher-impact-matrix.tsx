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
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Award,
  Users,
  CalendarCheck,
  Search,
  ArrowUpDown,
  BookOpen,
  Sparkles,
} from "lucide-react"
import type { DashboardData } from "@/hooks/use-dashboard-data"

interface PreacherImpactMatrixProps {
  data: DashboardData
}

interface PreacherStatRow {
  id: string
  name: string
  email: string
  role: string
  beneficiaryCount: number
  committedCount: number
  sessionsCount: number
  attendanceLoggedCount: number
  advancementRate: number // % of assigned who reached Regular or Committed
}

export function PreacherImpactMatrix({ data }: PreacherImpactMatrixProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"beneficiaries" | "advancement" | "sessions">("beneficiaries")

  const preacherStats = useMemo(() => {
    if (!data.preachers || data.preachers.length === 0) return []

    const rows: PreacherStatRow[] = data.preachers.map((preacher) => {
      // Beneficiaries assigned to this preacher
      const assigned = data.beneficiaries.filter((b) => b.da_i_id === preacher.id)
      const committed = assigned.filter(
        (b) => b.da_wa_stage === "Regular Attendance" || b.da_wa_stage === "Committed Learner"
      ).length

      // Sessions/activities created by this preacher
      const sessions = data.activities.all.filter((a) => a.creator_id === preacher.id).length

      // Attendance records logged by this preacher
      const attendance = data.attendance.filter((att) => att.logged_by_id === preacher.id).length

      const advancementRate = assigned.length > 0 ? Math.round((committed / assigned.length) * 100) : 0

      return {
        id: preacher.id,
        name: preacher.name || "Unnamed Da'i",
        email: preacher.email || "No email",
        role: preacher.role,
        beneficiaryCount: assigned.length,
        committedCount: committed,
        sessionsCount: sessions,
        attendanceLoggedCount: attendance,
        advancementRate,
      }
    })

    // Filter
    const filtered = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.email.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Sort
    return filtered.sort((a, b) => {
      if (sortBy === "advancement") return b.advancementRate - a.advancementRate
      if (sortBy === "sessions") return b.sessionsCount - a.sessionsCount
      return b.beneficiaryCount - a.beneficiaryCount
    })
  }, [data.preachers, data.beneficiaries, data.activities.all, data.attendance, searchTerm, sortBy])

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

  const topPreacher = preacherStats[0]

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
        <div>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Preacher Mentorship & Impact Leaderboard
          </CardTitle>
          <CardDescription>
            Comparative activity sessions, assigned beneficiary engagement, and advancement ratios per volunteer.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search preacher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs rounded-lg"
            />
          </div>

          <div className="flex items-center gap-1 p-0.5 bg-muted/60 rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => setSortBy("beneficiaries")}
              title="Sort by Beneficiaries"
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                sortBy === "beneficiaries"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Contacts
            </button>
            <button
              type="button"
              onClick={() => setSortBy("advancement")}
              title="Sort by Advancement"
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                sortBy === "advancement"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Advancement
            </button>
            <button
              type="button"
              onClick={() => setSortBy("sessions")}
              title="Sort by Sessions"
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                sortBy === "sessions"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sessions
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {topPreacher && topPreacher.beneficiaryCount > 0 && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-primary/5 to-transparent border border-emerald-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                #1
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Most Active Mentor</p>
                <p className="text-sm font-bold text-foreground">{topPreacher.name}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">Engagement Rate</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {topPreacher.advancementRate}% Advanced
              </span>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-semibold text-xs">Preacher / Mentor</TableHead>
                <TableHead className="font-semibold text-xs text-center">Role</TableHead>
                <TableHead className="font-semibold text-xs text-center">Assigned Contacts</TableHead>
                <TableHead className="font-semibold text-xs text-center">High Engagement</TableHead>
                <TableHead className="font-semibold text-xs text-center">Sessions Held</TableHead>
                <TableHead className="font-semibold text-xs text-center">Logs Recorded</TableHead>
                <TableHead className="font-semibold text-xs text-right">Advancement Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preacherStats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                    No preacher statistics available.
                  </TableCell>
                </TableRow>
              ) : (
                preacherStats.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm text-foreground">{row.name}</p>
                        <p className="text-xs text-muted-foreground">{row.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={row.role === "admin" ? "default" : "secondary"}
                        className="text-[11px] font-medium"
                      >
                        {row.role === "admin" ? "Admin" : "Da'i"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-bold text-sm">
                      {row.beneficiaryCount}
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                        {row.committedCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-xs font-medium">
                      {row.sessionsCount}
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {row.attendanceLoggedCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-sm text-foreground">
                        {row.advancementRate}%
                      </span>
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
