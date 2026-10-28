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
  Search,
  Phone,
  MessageCircle,
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
  Download,
  Clock,
  User,
  ArrowUpDown,
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
  const [sortBy, setSortBy] = useState<"total" | "maqari" | "events">("total")
  const [stageFilter, setStageFilter] = useState<string>("all")
  const [viewLimit, setViewLimit] = useState<number>(20)

  // Fast preacher lookup map
  const preacherMap = useMemo(() => {
    const map = new Map<string, string>()
    data.preachers.forEach((p) => {
      map.set(p.id, p.name || p.email)
    })
    return map
  }, [data.preachers])

  // Compute exact session counts for each beneficiary
  const computedBeneficiaries = useMemo(() => {
    const activeBeneficiaries = data.beneficiaries.filter((b) => !b.deleted)

    // Map beneficiary ID -> count of Maqari, Events, and Total attended
    const statsMap = new Map<
      string,
      {
        maqariCount: number
        eventsCount: number
        otherCount: number
        totalCount: number
        lastDate: Date | null
      }
    >()

    data.attendance.forEach((rec) => {
      const bId = rec.beneficiary_id
      if (!bId) return

      // Only count if beneficiary actually attended
      const isPresent =
        rec.present === true ||
        (rec.present === undefined && (rec as unknown as { attended?: boolean }).attended !== false)

      if (!isPresent) return

      const cur = statsMap.get(bId) || {
        maqariCount: 0,
        eventsCount: 0,
        otherCount: 0,
        totalCount: 0,
        lastDate: null,
      }

      const type = (rec.activity_type || "").toLowerCase()
      if (type === "maqari" || type === "maqraa" || type.includes("maqr")) {
        cur.maqariCount += 1
      } else if (type === "events" || type === "event") {
        cur.eventsCount += 1
      } else {
        cur.otherCount += 1
      }

      cur.totalCount += 1

      const logDate = getDateFromTimestamp(rec.logged_at)
      if (!cur.lastDate || logDate > cur.lastDate) {
        cur.lastDate = logDate
      }

      statsMap.set(bId, cur)
    })

    return activeBeneficiaries.map((b) => {
      const stats = statsMap.get(b.id) || {
        maqariCount: 0,
        eventsCount: 0,
        otherCount: 0,
        totalCount: 0,
        lastDate: null,
      }

      const assignedPreacher = b.da_i_id
        ? preacherMap.get(b.da_i_id) || "Assigned Da'i"
        : "Unassigned"

      return {
        id: b.id,
        name: b.name || "Unknown Member",
        phone: b.phone || "",
        stage: b.da_wa_stage || "New Contact",
        assignedPreacher,
        maqariCount: stats.maqariCount,
        eventsCount: stats.eventsCount,
        otherCount: stats.otherCount,
        totalCount: stats.totalCount,
        lastAttended: stats.lastDate,
        createdAt: getDateFromTimestamp(b.created_at),
      }
    })
  }, [data.beneficiaries, data.attendance, preacherMap])

  // Filter and sort for the Top 20
  const filteredAndSorted = useMemo(() => {
    return computedBeneficiaries
      .filter((item) => {
        // Exclude members with 0 total sessions attended
        if (item.totalCount === 0) return false

        // Stage filter
        if (stageFilter !== "all" && item.stage !== stageFilter) return false

        // Search filter
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
        if (sortBy === "maqari") {
          if (b.maqariCount !== a.maqariCount) {
            return b.maqariCount - a.maqariCount
          }
          return b.totalCount - a.totalCount
        } else if (sortBy === "events") {
          if (b.eventsCount !== a.eventsCount) {
            return b.eventsCount - a.eventsCount
          }
          return b.totalCount - a.totalCount
        } else {
          // Default: Total sessions attended descending
          if (b.totalCount !== a.totalCount) {
            return b.totalCount - a.totalCount
          }
          if (b.maqariCount !== a.maqariCount) {
            return b.maqariCount - a.maqariCount
          }
          return b.eventsCount - a.eventsCount
        }
      })
      .slice(0, viewLimit)
  }, [computedBeneficiaries, stageFilter, searchTerm, sortBy, viewLimit])

  // CSV Export handler
  const exportToCsv = () => {
    const headers = [
      "Rank",
      "Beneficiary Name",
      "Phone",
      "Stage",
      "Assigned Da'i",
      "Maqari Attended",
      "Events Attended",
      "Total Sessions Attended",
      "Last Attended",
    ]
    const rows = filteredAndSorted.map((item, index) => [
      index + 1,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.phone}"`,
      `"${item.stage}"`,
      `"${item.assignedPreacher}"`,
      item.maqariCount,
      item.eventsCount,
      item.totalCount,
      item.lastAttended ? format(item.lastAttended, "yyyy-MM-dd") : "Never",
    ])

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute(
      "download",
      `top_beneficiaries_attendance_${format(new Date(), "yyyy-MM-dd")}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Helper for stage styling
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
              Direct count of Maqra&apos;as and Events each member attended. Ranked from highest to lowest.
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

        {/* Filter & Sort Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 mt-2 border-t border-border/40">
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

          {/* Sort By Mode */}
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as "total" | "maqari" | "events")}
          >
            <SelectTrigger className="h-9 text-xs bg-background/50 border-border/60">
              <div className="flex items-center gap-1.5 truncate">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
                  {sortBy === "total"
                    ? "Sort: Total Sessions (Maqari + Events)"
                    : sortBy === "maqari"
                    ? "Sort: Most Maqra'as Attended"
                    : "Sort: Most Events Attended"}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="total">Total Sessions Attended</SelectItem>
              <SelectItem value="maqari">Most Maqra&apos;as Attended</SelectItem>
              <SelectItem value="events">Most Events Attended</SelectItem>
            </SelectContent>
          </Select>

          {/* Stage Filter */}
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="h-9 text-xs bg-background/50 border-border/60">
              <div className="flex items-center gap-1.5 truncate">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{stageFilter === "all" ? "All Da'wa Stages" : stageFilter}</span>
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
            <h3 className="font-semibold text-foreground text-sm">
              No beneficiaries found
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Either no attendance records are logged yet or current filters returned no matches.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("")
                setStageFilter("all")
                setSortBy("total")
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
                    <th className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-emerald-400">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>Maqra&apos;as</span>
                      </div>
                    </th>
                    <th className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-blue-400">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Events</span>
                      </div>
                    </th>
                    <th className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-foreground font-bold">
                        <Layers className="h-3.5 w-3.5 text-amber-400" />
                        <span>Total Attended</span>
                      </div>
                    </th>
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
                      ? `https://wa.me/${
                          cleanPhone.startsWith("0") ? "2" + cleanPhone : cleanPhone
                        }`
                      : null

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-muted/30 transition-colors group"
                      >
                        {/* Rank Badge */}
                        <td className="py-3.5 px-4 text-center">
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

                        {/* Name & Phone */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            {item.name}
                            {item.totalCount >= 10 && (
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

                        {/* Stage */}
                        <td className="py-3.5 px-4">
                          <Badge
                            variant="outline"
                            className={`text-[11px] font-medium border ${getStageBadge(
                              item.stage
                            )}`}
                          >
                            {item.stage}
                          </Badge>
                        </td>

                        {/* Assigned Preacher */}
                        <td className="py-3.5 px-4 text-xs text-muted-foreground">
                          {item.assignedPreacher}
                        </td>

                        {/* Maqari Attended */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 font-mono font-bold text-xs border border-emerald-500/20">
                            {item.maqariCount}
                          </span>
                        </td>

                        {/* Events Attended */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 font-mono font-bold text-xs border border-blue-500/20">
                            {item.eventsCount}
                          </span>
                        </td>

                        {/* Total Attended */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-card border border-border/80 text-foreground font-mono font-extrabold text-sm shadow-sm">
                            {item.totalCount}
                          </span>
                        </td>

                        {/* Last Seen */}
                        <td className="py-3.5 px-4 text-right">
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
                        <td className="py-3.5 px-4 text-center">
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
                  ? `https://wa.me/${
                      cleanPhone.startsWith("0") ? "2" + cleanPhone : cleanPhone
                    }`
                  : null

                return (
                  <div
                    key={item.id}
                    className="p-4 space-y-3 hover:bg-muted/20 transition-colors"
                  >
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
                            {item.totalCount >= 10 && (
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
                        className={`text-[10px] font-medium border ${getStageBadge(
                          item.stage
                        )}`}
                      >
                        {item.stage}
                      </Badge>
                    </div>

                    {/* Counts Row */}
                    <div className="grid grid-cols-3 gap-2 bg-background/50 p-2.5 rounded-lg border border-border/40 text-center">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-muted-foreground block">
                          Maqra&apos;as
                        </span>
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          {item.maqariCount}
                        </span>
                      </div>
                      <div className="space-y-0.5 border-x border-border/40">
                        <span className="text-[10px] text-muted-foreground block">
                          Events
                        </span>
                        <span className="font-mono font-bold text-blue-400 text-sm">
                          {item.eventsCount}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-muted-foreground block">
                          Total
                        </span>
                        <span className="font-mono font-extrabold text-foreground text-sm">
                          {item.totalCount}
                        </span>
                      </div>
                    </div>

                    {/* Mobile Footer */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {item.lastAttended
                            ? `Last seen ${formatDistanceToNow(item.lastAttended, {
                                addSuffix: true,
                              })}`
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
