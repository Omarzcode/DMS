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
import {
  ShieldAlert,
  Flame,
  UserCheck,
  UserMinus,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import type { DashboardData } from "@/hooks/use-dashboard-data"
import { getDateFromTimestamp } from "@/hooks/use-dashboard-data"
import { formatDistanceToNow } from "date-fns"

interface BeneficiaryEngagementDistributionProps {
  data: DashboardData
}

export function BeneficiaryEngagementDistribution({
  data,
}: BeneficiaryEngagementDistributionProps) {
  const [selectedTier, setSelectedTier] = useState<string | null>(null)

  const tiers = useMemo(() => {
    const activeBeneficiaries = data.beneficiaries.filter((b) => !b.deleted)
    const total = activeBeneficiaries.length

    // Compute attendance rates
    const attendanceCountMap = new Map<string, { total: number; attended: number; lastDate: Date | null }>()

    data.attendance.forEach((rec) => {
      const bId = rec.beneficiary_id
      if (!bId) return
      const cur = attendanceCountMap.get(bId) || { total: 0, attended: 0, lastDate: null }
      cur.total += 1
      if (rec.present) {
        cur.attended += 1
        const logDate = getDateFromTimestamp(rec.logged_at)
        if (!cur.lastDate || logDate > cur.lastDate) {
          cur.lastDate = logDate
        }
      }
      attendanceCountMap.set(bId, cur)
    })

    const high: typeof activeBeneficiaries = [] // >= 80% with >= 1 session
    const regular: typeof activeBeneficiaries = [] // 50% - 79%
    const occasional: typeof activeBeneficiaries = [] // 1% - 49%
    const unengaged: typeof activeBeneficiaries = [] // 0 attendance or 0 sessions logged

    activeBeneficiaries.forEach((b) => {
      const att = attendanceCountMap.get(b.id)
      if (!att || att.attended === 0) {
        unengaged.push(b)
      } else {
        const rate = (att.attended / att.total) * 100
        if (rate >= 80) high.push(b)
        else if (rate >= 50) regular.push(b)
        else occasional.push(b)
      }
    })

    return [
      {
        id: "high",
        name: "Champions",
        range: "≥ 80% Attendance",
        count: high.length,
        pct: total > 0 ? Math.round((high.length / total) * 100) : 0,
        color: "text-emerald-400",
        bg: "bg-emerald-500/10 border-emerald-500/20",
        barColor: "bg-emerald-500",
        icon: Flame,
        description: "Consistent core learners",
        members: high,
      },
      {
        id: "regular",
        name: "Regulars",
        range: "50% - 79% Attendance",
        count: regular.length,
        pct: total > 0 ? Math.round((regular.length / total) * 100) : 0,
        color: "text-blue-400",
        bg: "bg-blue-500/10 border-blue-500/20",
        barColor: "bg-blue-500",
        icon: UserCheck,
        description: "Attending regularly",
        members: regular,
      },
      {
        id: "occasional",
        name: "Occasional",
        range: "< 50% Attendance",
        count: occasional.length,
        pct: total > 0 ? Math.round((occasional.length / total) * 100) : 0,
        color: "text-amber-400",
        bg: "bg-amber-500/10 border-amber-500/20",
        barColor: "bg-amber-500",
        icon: UserMinus,
        description: "Low consistency, needs encouragement",
        members: occasional,
      },
      {
        id: "unengaged",
        name: "Needs Follow-up",
        range: "0 Recorded Attendance",
        count: unengaged.length,
        pct: total > 0 ? Math.round((unengaged.length / total) * 100) : 0,
        color: "text-rose-400",
        bg: "bg-rose-500/10 border-rose-500/20",
        barColor: "bg-rose-500",
        icon: ShieldAlert,
        description: "Zero sessions attended or new contact",
        members: unengaged,
      },
    ]
  }, [data.beneficiaries, data.attendance])

  const activeSelectedTier = tiers.find((t) => t.id === selectedTier)

  return (
    <Card className="border border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden shadow-sm">
      <CardHeader className="p-4 sm:p-6 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              <CardTitle className="text-lg font-bold tracking-tight">
                Engagement Health Distribution
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Beneficiaries segmented into attendance tiers to identify strong learners and at-risk members.
            </CardDescription>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            {data.beneficiaries.filter((b) => !b.deleted).length} Total Members
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Tier Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {tiers.map((tier) => {
            const Icon = tier.icon
            const isSelected = selectedTier === tier.id

            return (
              <div
                key={tier.id}
                onClick={() =>
                  setSelectedTier(isSelected ? null : tier.id)
                }
                className={`p-4 rounded-xl border transition-all cursor-pointer ${tier.bg} ${
                  isSelected
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-md"
                    : "hover:border-border hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold ${tier.color}`}>
                    {tier.name}
                  </span>
                  <Icon className={`h-4 w-4 ${tier.color}`} />
                </div>

                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-2xl font-mono font-bold text-foreground">
                    {tier.count}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {tier.pct}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full ${tier.barColor}`}
                    style={{ width: `${tier.pct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{tier.range}</span>
                  <span className="underline hover:text-foreground text-[10px]">
                    {isSelected ? "Hide" : "View"}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Selected Tier Member List preview */}
        {activeSelectedTier && (
          <div className="p-4 rounded-xl border border-border/60 bg-background/50 space-y-3 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${activeSelectedTier.color}`}>
                  {activeSelectedTier.name} ({activeSelectedTier.count} Members)
                </span>
                <span className="text-xs text-muted-foreground">
                  — {activeSelectedTier.description}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTier(null)}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
              {activeSelectedTier.members.slice(0, 30).map((m) => (
                <div
                  key={m.id}
                  className="p-2.5 rounded-lg border border-border/40 bg-card/40 flex items-center justify-between text-xs"
                >
                  <div className="truncate pr-2">
                    <p className="font-medium text-foreground truncate">
                      {m.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {m.phone || "No phone"} • {m.da_wa_stage}
                    </p>
                  </div>
                  {m.phone && (
                    <a
                      href={`tel:${m.phone}`}
                      className="p-1 rounded bg-muted hover:text-primary transition-colors shrink-0"
                      title="Call"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
            {activeSelectedTier.count > 30 && (
              <p className="text-[11px] text-muted-foreground text-center">
                Showing first 30 of {activeSelectedTier.count} members
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
