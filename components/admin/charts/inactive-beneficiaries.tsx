"use client"

import { useMemo, useState } from "react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { UserX, Search, X, Phone, Clock, ChevronDown, ChevronUp } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { DashboardData } from "@/hooks/use-dashboard-data"
import { getDateFromTimestamp } from "@/hooks/use-dashboard-data"
import { BeneficiaryDetailsDialog } from "@/components/beneficiaries/beneficiary-details-dialog"

interface InactiveBeneficiariesProps {
  data: DashboardData
}

const STAGE_LABELS: Record<string, string> = {
  "New Contact": "New Contact",
  "Initial Interest": "Initial Interest",
  "Regular Attendance": "Regular Attendance",
  "Committed Learner": "Committed Learner",
  
}

export function InactiveBeneficiaries({ data }: InactiveBeneficiariesProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [expanded, setExpanded] = useState(false)

  const inactiveList = useMemo(() => {
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    )

    // Find beneficiaries with no attendance in last 30 days
    const recentlyActiveIds = new Set(
      data.attendance
        .filter(
          (a) =>
            a.present &&
            getDateFromTimestamp(a.logged_at) >= thirtyDaysAgo
        )
        .map((a) => a.beneficiary_id)
    )

    return data.beneficiaries
      .filter((b) => !recentlyActiveIds.has(b.id))
      .map((b) => {
        // Find last attendance
        const lastAttendance = data.attendance
          .filter((a) => a.beneficiary_id === b.id && a.present)
          .sort(
            (a, c) =>
              getDateFromTimestamp(c.logged_at).getTime() -
              getDateFromTimestamp(a.logged_at).getTime()
          )[0]

        const preacher = data.preachers.find((p) => p.id === b.da_i_id)

        return {
          ...b,
          lastAttendanceDate: lastAttendance
            ? getDateFromTimestamp(lastAttendance.logged_at)
            : null,
          preacherName: preacher?.name || "Unassigned",
          stageLabel: STAGE_LABELS[b.da_wa_stage] || b.da_wa_stage,
        }
      })
      .sort((a, b) => {
        // Sort: never attended first, then by oldest last attendance
        if (!a.lastAttendanceDate && !b.lastAttendanceDate) return 0
        if (!a.lastAttendanceDate) return -1
        if (!b.lastAttendanceDate) return 1
        return (
          a.lastAttendanceDate.getTime() - b.lastAttendanceDate.getTime()
        )
      })
  }, [data])

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return inactiveList
    const lowered = searchTerm.toLowerCase()
    return inactiveList.filter(
      (b) =>
        b.name.toLowerCase().includes(lowered) ||
        b.phone?.toLowerCase().includes(lowered) ||
        b.preacherName.toLowerCase().includes(lowered)
    )
  }, [inactiveList, searchTerm])

  const displayList = expanded ? filtered : filtered.slice(0, 5)

  if (data.loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-red-600" />
              Inactive Beneficiaries
              <Badge variant="destructive" className="mr-1">
                {inactiveList.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Beneficiaries with no attendance in the last 30 days
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {inactiveList.length > 5 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or preacher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 pl-10 h-9"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setSearchTerm("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {searchTerm
              ? "No inactive beneficiaries match your search."
              : "All beneficiaries have been active recently!"}
          </p>
        ) : (
          <>
            <div className="space-y-2">
              {displayList.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <BeneficiaryDetailsDialog
                      beneficiaryId={b.id}
                      onUpdate={data.refresh}
                    >
                      <button
                        type="button"
                        className="font-medium text-sm truncate hover:text-primary hover:underline cursor-pointer text-left block max-w-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-sm"
                        title="Click to view profile"
                      >
                        {b.name}
                      </button>
                    </BeneficiaryDetailsDialog>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {b.phone}
                      </span>
                      <span>{b.preacherName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 mr-3">
                    <Badge variant="outline" className="text-[10px]">
                      {b.stageLabel}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {b.lastAttendanceDate
                        ? formatDistanceToNow(b.lastAttendanceDate, {
                            addSuffix: true,
                          })
                        : "Never"}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filtered.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full gap-1"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Show All ({filtered.length})
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
