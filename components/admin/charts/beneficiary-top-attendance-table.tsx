"use client"

import { useState, useMemo } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Trophy,
  Medal,
  Search,
  Phone,
  MessageCircle,
  Calendar,
  User,
  SlidersHorizontal,
  Download,
  Flame,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
} from "lucide-react"
import type { DashboardData } from "@/hooks/use-dashboard-data"
import { getDateFromTimestamp } from "@/hooks/use-dashboard-data"
import { formatDistanceToNow, format } from "date-fns"

interface BeneficiaryTopAttendanceTableProps {
  data: DashboardData
}

export function BeneficiaryTopAttendanceTable({
  data,
}: BeneficiaryTopAttendanceTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [minSessions, setMinSessions] = useState<string>("1")
  const [sortBy, setSortBy] = useState<"rate" | "count">("rate")
  const [stageFilter, setStageFilter] = useState<string>("all")
  const [viewLimit, setViewLimit] = useState<number>(20)

  // Map preachers by ID for fast lookup
  const preacherMap = useMemo(() => {
    const map = new Map<string, string>()
    data.preachers.forEach((p) => {
      map.set(p.id, p.name || p.email)
    })
    return map
  }, [data.preachers])

  // Compute beneficiary metrics
  const computedBeneficiaries = useMemo(() => {
    const activeBeneficiaries = data.beneficiaries.filter((b) => !b.deleted)

    // Group attendance records by beneficiary
    const attendanceByBeneficiary = new Map<
      string,
      { total: number; attended: number; lastDate: Date | null }
    >()

    data.attendance.forEach((rec) => {
      const bId = rec.beneficiary_id
      if (!bId) return

      const existing = attendanceByBeneficiary.get(bId) || {
        total: 0,
        attended: 0,
        lastDate: null,
      }

      existing.total += 1
      if (rec.present) {
        existing.attended += 1
        const logDate = getDateFromTimestamp(rec.logged_at)
        if (!existing.lastDate || logDate > existing.lastDate) {
          existing.lastDate = logDate
        }
      }

      attendanceByBeneficiary.set(bId, existing)
    })

    return activeBeneficiaries.map((b) => {
      const att = attendanceByBeneficiary.get(b.id) || {
        total: 0,
        attended: 0,
        lastDate: null,
      }

      const rate = att.total > 0 ? (att.attended / att.total) * 100 : 0
      const assignedPreacher = b.da_i_id
        ? preacherMap.get(b.da_i_id) || "Assigned Da'i"
        : "Unassigned"

      return {
        id: b.id,
        name: b.name || "Unknown Member",
        phone: b.phone || "",
        stage: b.da_wa_stage || "New Contact",
        assignedPreacher,
        totalSessions: att.total,
        attendedSessions: att.attended,
        attendanceRate: Math.round(rate),
        lastAttended: att.lastDate,
        createdAt: getDateFromTimestamp(b.created_at),
      }
    })
  }, [data.beneficiaries, data.attendance, preacherMap])

  // Filter and sort for the Top 20
  const filteredAndSorted = useMemo(() => {
    const minSessCount = parseInt(minSessions, 10) || 1

    return computedBeneficiaries
      .filter((item) => {
        // Minimum sessions logged requirement
        if (item.totalSessions < minSessCount) return false

        // Must have attended at least 1 session
        if (item.attendedSessions === 0) return false

        // Stage filter
        if (stageFilter !== "all" && item.stage !== stageFilter) return false

        // Search term
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase()
          const matchName = item.name.toLowerCase().includes(q)
          const matchPhone = item.phone.toLowerCase().includes(q)
          const matchPreacher = item.assignedPreacher.toLowerCase().includes(q)
          return matchName || matchPhone || matchPreacher
        }

        return true
      })
      .sort((a, b) => {
        if (sortBy === "rate") {
          // Primary: Rate descending, Secondary: Total attended descending
          if (b.attendanceRate !== a.attendanceRate) {
            return b.attendanceRate - a.attendanceRate
          }
          return b.attendedSessions - a.attendedSessions
        } else {
          // Primary: Total attended descending, Secondary: Rate descending
          if (b.attendedSessions !== a.attendedSessions) {
            return b.attendedSessions - a.attendedSessions
          }
          return b.attendanceRate - a.attendanceRate
        }
      })
      .slice(0, viewLimit)
  }, [computedBeneficiaries, minSessions, stageFilter, searchTerm, sortBy, viewLimit])

  // CSV Export handler
  const exportToCsv = () => {
    const headers = [
      "Rank",
      "Beneficiary Name",
      "Phone",
      "Stage",
      "Assigned Da'i",
      "Attendance Rate (%)",
      "Attended Sessions",
      "Total Sessions",
      "Last Attended",
    ]
    const rows = filteredAndSorted.map((item, index) => [
      index + 1,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.phone}"`,
      `"${item.stage}"`,
      `"${item.assignedPreacher}"`,
      `${item.attendanceRate}%`,
      item.attendedSessions,
      item.totalSessions,
      item.lastAttended ? format(item.lastAttended, "yyyy-MM-dd") : "Never",
    ])

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `top_beneficiaries_attendance_${format(new Date(), "yyyy-MM-dd")}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Helper for stage colors
  const getStageBadge = (stage: string) => {
    switch (stage) {
      case "Committed Learner":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      case "Regular Attendance":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20"
      case "Initial Interest":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20"
      default:
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
    }
  }

  // Helper for attendance rate bar colors
  const getRateColor = (rate: number) => {
    if (rate >= 80) return "bg-emerald-500 text-emerald-400"
    if (rate >= 60) return "bg-amber-500 text-amber-400"
    return "bg-rose-500 text-rose-400"
  }

  return (
    <Card className="border border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden shadow-sm">
      <CardHeader className="p-4 sm:p-6 border-b border-border/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Trophy className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl font-bold tracking-tight">
                Top {viewLimit} Beneficiaries by Attendance
              </CardTitle>
            </div>
            <CardDescription className="text-sm text-muted-foreground">
              Ranked by attendance rate with total sessions attended, Da&apos;wa stages, and direct contact options.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCsv}
              className="gap-1.5 text-xs h-9 bg-card hover:bg-muted"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>

            <Select
              value={viewLimit.toString()}
              onValueChange={(val) => setViewLimit(parseInt(val, 10))}
            >
              <SelectTrigger className="h-9 w-[110px] text-xs bg-card">
                <SelectValue placeholder="Show limit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20">Top 20</SelectItem>
                <SelectItem value="35">Top 35</SelectItem>
                <SelectItem value="50">Top 50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filter controls row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-4 mt-2 border-t border-border/40">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or da'i..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 text-xs bg-background/50 border-border/60"
            />
          </div>

          {/* Min Sessions Filter */}
          <Select value={minSessions} onValueChange={setMinSessions}>
            <SelectTrigger className="h-9 text-xs bg-background/50 border-border/60">
              <div className="flex items-center gap-1.5 truncate">
                <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
                  {minSessions === "1"
                    ? "Min 1 Session (All)"
                    : `Min ${minSessions} Sessions`}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Min 1 Session (All)</SelectItem>
              <SelectItem value="3">Min 3 Sessions (Regular)</SelectItem>
              <SelectItem value="5">Min 5 Sessions (Committed)</SelectItem>
              <SelectItem value="8">Min 8 Sessions (Core)</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort By Toggle */}
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as "rate" | "count")}
          >
            <SelectTrigger className="h-9 text-xs bg-background/50 border-border/60">
              <div className="flex items-center gap-1.5 truncate">
                <Flame className="h-3.5 w-3.5 text-amber-400" />
                <span>
                  {sortBy === "rate"
                    ? "Sort: Highest Rate %"
                    : "Sort: Most Sessions"}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rate">Highest Rate %</SelectItem>
              <SelectItem value="count">Most Attended Sessions</SelectItem>
            </SelectContent>
          </Select>

          {/* Stage Filter */}
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="h-9 text-xs bg-background/50 border-border/60">
              <div className="flex items-center gap-1.5 truncate">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{stageFilter === "all" ? "All Stages" : stageFilter}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Da&apos;wa Stages</SelectItem>
              <SelectItem value="Committed Learner">Committed Learner</SelectItem>
              <SelectItem value="Regular Attendance">Regular Attendance</SelectItem>
              <SelectItem value="Initial Interest">Initial Interest</SelectItem>
              <SelectItem value="New Contact">New Contact</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {filteredAndSorted.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="p-3 rounded-full bg-muted/40 mb-3 text-muted-foreground">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-foreground text-sm">No beneficiaries match filters</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Try adjusting the minimum sessions filter or clearing your search criteria.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("")
                setMinSessions("1")
                setStageFilter("all")
              }}
              className="mt-4 text-xs"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-4 w-16 text-center">Rank</th>
                    <th className="py-3 px-4">Beneficiary</th>
                    <th className="py-3 px-4">Da&apos;wa Stage</th>
                    <th className="py-3 px-4">Assigned Da&apos;i</th>
                    <th className="py-3 px-4 text-center">Sessions</th>
                    <th className="py-3 px-4 w-48">Attendance Rate</th>
                    <th className="py-3 px-4 text-right">Last Seen</th>
                    <th className="py-3 px-4 text-center w-24">Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredAndSorted.map((item, index) => {
                    const isTop1 = index === 0
                    const isTop2 = index === 1
                    const isTop3 = index === 2

                    const cleanPhone = item.phone.replace(/[^0-9]/g, "")
                    const waUrl = cleanPhone
                      ? `https://wa.me/${cleanPhone.startsWith("0") ? "2" + cleanPhone : cleanPhone}`
                      : null

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-muted/30 transition-colors group"
                      >
                        {/* Rank Badge */}
                        <td className="py-3 px-4 text-center">
                          {isTop1 ? (
                            <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-black font-extrabold text-xs shadow-md shadow-amber-500/20">
                              1
                            </div>
                          ) : isTop2 ? (
                            <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-tr from-slate-300 to-zinc-100 text-zinc-900 font-bold text-xs shadow-sm">
                              2
                            </div>
                          ) : isTop3 ? (
                            <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-tr from-amber-700 to-amber-500 text-white font-bold text-xs shadow-sm">
                              3
                            </div>
                          ) : (
                            <span className="text-xs font-mono font-medium text-muted-foreground">
                              #{index + 1}
                            </span>
                          )}
                        </td>

                        {/* Beneficiary Name & Phone */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            {item.name}
                            {item.attendanceRate >= 90 && item.totalSessions >= 3 && (
                              <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            )}
                          </div>
                          {item.phone && (
                            <div className="text-xs text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3 text-muted-foreground/70" />
                              {item.phone}
                            </div>
                          )}
                        </td>

                        {/* Da'wa Stage */}
                        <td className="py-3 px-4">
                          <Badge
                            variant="outline"
                            className={`text-[11px] font-medium border ${getStageBadge(item.stage)}`}
                          >
                            {item.stage}
                          </Badge>
                        </td>

                        {/* Assigned Preacher */}
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {item.assignedPreacher}
                        </td>

                        {/* Sessions Count */}
                        <td className="py-3 px-4 text-center">
                          <div className="font-mono text-sm font-semibold text-foreground">
                            {item.attendedSessions}
                            <span className="text-xs text-muted-foreground font-normal">
                              {" "}/ {item.totalSessions}
                            </span>
                          </div>
                        </td>

                        {/* Rate Progress Bar */}
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-between text-xs font-mono mb-1">
                            <span className="font-bold text-foreground">
                              {item.attendanceRate}%
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {item.attendedSessions === item.totalSessions
                                ? "Perfect"
                                : `${item.attendedSessions} attended`}
                            </span>
                          </div>
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                item.attendanceRate >= 80
                                  ? "bg-emerald-500"
                                  : item.attendanceRate >= 60
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              }`}
                              style={{ width: `${Math.min(item.attendanceRate, 100)}%` }}
                            />
                          </div>
                        </td>

                        {/* Last Attended */}
                        <td className="py-3 px-4 text-right">
                          {item.lastAttended ? (
                            <div className="text-xs font-medium text-foreground">
                              {format(item.lastAttended, "MMM d, yyyy")}
                              <div className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(item.lastAttended, {
                                  addSuffix: true,
                                })}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              Never
                            </span>
                          )}
                        </td>

                        {/* Contact Action */}
                        <td className="py-3 px-4 text-center">
                          {waUrl ? (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
                              title="Message via WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          ) : item.phone ? (
                            <a
                              href={`tel:${item.phone}`}
                              className="inline-flex p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title="Call"
                            >
                              <Phone className="h-4 w-4" />
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="block md:hidden divide-y divide-border/40">
              {filteredAndSorted.map((item, index) => {
                const isTop1 = index === 0
                const isTop2 = index === 1
                const isTop3 = index === 2

                const cleanPhone = item.phone.replace(/[^0-9]/g, "")
                const waUrl = cleanPhone
                  ? `https://wa.me/${cleanPhone.startsWith("0") ? "2" + cleanPhone : cleanPhone}`
                  : null

                return (
                  <div key={item.id} className="p-4 space-y-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        {isTop1 ? (
                          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-black font-extrabold text-xs shadow-md">
                            1
                          </div>
                        ) : isTop2 ? (
                          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-tr from-slate-300 to-zinc-100 text-zinc-900 font-bold text-xs shadow-sm">
                            2
                          </div>
                        ) : isTop3 ? (
                          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-tr from-amber-700 to-amber-500 text-white font-bold text-xs shadow-sm">
                            3
                          </div>
                        ) : (
                          <span className="text-xs font-mono font-semibold text-muted-foreground w-6">
                            #{index + 1}
                          </span>
                        )}

                        <div>
                          <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                            {item.name}
                            {item.attendanceRate >= 90 && item.totalSessions >= 3 && (
                              <Sparkles className="h-3 w-3 text-amber-400" />
                            )}
                          </h4>
                          <span className="text-xs text-muted-foreground">
                            Da&apos;i: {item.assignedPreacher}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={`text-[10px] font-medium border ${getStageBadge(item.stage)}`}
                      >
                        {item.stage}
                      </Badge>
                    </div>

                    {/* Progress Bar & Rate */}
                    <div className="space-y-1.5 bg-background/50 p-2.5 rounded-lg border border-border/40">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-mono text-muted-foreground">
                          {item.attendedSessions} of {item.totalSessions} sessions attended
                        </span>
                        <span
                          className={`font-mono font-bold text-sm ${
                            item.attendanceRate >= 80
                              ? "text-emerald-400"
                              : item.attendanceRate >= 60
                              ? "text-amber-400"
                              : "text-rose-400"
                          }`}
                        >
                          {item.attendanceRate}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            item.attendanceRate >= 80
                              ? "bg-emerald-500"
                              : item.attendanceRate >= 60
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                          style={{ width: `${Math.min(item.attendanceRate, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Mobile Footer with Last Seen & Contact Action */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {item.lastAttended
                            ? `Last seen ${formatDistanceToNow(item.lastAttended, { addSuffix: true })}`
                            : "Never attended"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-medium border border-emerald-500/20"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            WhatsApp
                          </a>
                        )}
                        {item.phone && (
                          <a
                            href={`tel:${item.phone}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted text-muted-foreground hover:text-foreground text-xs"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            Call
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
