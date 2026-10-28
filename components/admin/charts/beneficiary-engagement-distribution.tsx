"use client"

import { useMemo, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ShieldAlert,
  Flame,
  BookOpen,
  Calendar,
  Sparkles,
  Phone,
  UserCheck,
} from "lucide-react"
import type { DashboardData } from "@/hooks/use-dashboard-data"
import { getDateFromTimestamp } from "@/hooks/use-dashboard-data"

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

    // Track maqari & events count for each beneficiary
    const activityMap = new Map<
      string,
      { maqari: number; events: number; total: number }
    >()

    data.attendance.forEach((rec) => {
      const bId = rec.beneficiary_id
      if (!bId) return

      const isPresent =
        rec.present === true ||
        (rec.present === undefined &&
          (rec as unknown as { attended?: boolean }).attended !== false)

      if (!isPresent) return

      const cur = activityMap.get(bId) || { maqari: 0, events: 0, total: 0 }
      const type = (rec.activity_type || "").toLowerCase()
      if (type === "maqari" || type === "maqraa" || type.includes("maqr")) {
        cur.maqari += 1
      } else if (type === "events" || type === "event") {
        cur.events += 1
      }
      cur.total += 1
      activityMap.set(bId, cur)
    })

    const both: typeof activeBeneficiaries = []
    const maqariOnly: typeof activeBeneficiaries = []
    const eventsOnly: typeof activeBeneficiaries = []
    const unengaged: typeof activeBeneficiaries = []

    activeBeneficiaries.forEach((b) => {
      const act = activityMap.get(b.id)
      if (!act || act.total === 0) {
        unengaged.push(b)
      } else if (act.maqari > 0 && act.events > 0) {
        both.push(b)
      } else if (act.maqari > 0) {
        maqariOnly.push(b)
      } else {
        eventsOnly.push(b)
      }
    })

    return [
      {
        id: "both",
        name: "Both Activities",
        count: both.length,
        pct: total > 0 ? Math.round((both.length / total) * 100) : 0,
        color: "text-amber-400",
        bg: "bg-amber-500/10 border-amber-500/20",
        barColor: "bg-amber-500",
        icon: Flame,
        description: "Attended both Maqra'as & Events",
        members: both,
      },
      {
        id: "maqari",
        name: "Maqra'a Only",
        count: maqariOnly.length,
        pct: total > 0 ? Math.round((maqariOnly.length / total) * 100) : 0,
        color: "text-emerald-400",
        bg: "bg-emerald-500/10 border-emerald-500/20",
        barColor: "bg-emerald-500",
        icon: BookOpen,
        description: "Active in Maqra'a sessions only",
        members: maqariOnly,
      },
      {
        id: "events",
        name: "Events Only",
        count: eventsOnly.length,
        pct: total > 0 ? Math.round((eventsOnly.length / total) * 100) : 0,
        color: "text-blue-400",
        bg: "bg-blue-500/10 border-blue-500/20",
        barColor: "bg-blue-500",
        icon: Calendar,
        description: "Attended general events only",
        members: eventsOnly,
      },
      {
        id: "unengaged",
        name: "Needs Follow-up",
        count: unengaged.length,
        pct: total > 0 ? Math.round((unengaged.length / total) * 100) : 0,
        color: "text-rose-400",
        bg: "bg-rose-500/10 border-rose-500/20",
        barColor: "bg-rose-500",
        icon: ShieldAlert,
        description: "No sessions attended yet",
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
                Activity Distribution
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Beneficiaries categorized by participation in Maqra&apos;as and Events.
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
                onClick={() => setSelectedTier(isSelected ? null : tier.id)}
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

                <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full ${tier.barColor}`}
                    style={{ width: `${tier.pct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="truncate pr-1">{tier.description}</span>
                  <span className="underline hover:text-foreground text-[10px] shrink-0">
                    {isSelected ? "Hide" : "View"}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Selected Tier List */}
        {activeSelectedTier && (
          <div className="p-4 rounded-xl border border-border/60 bg-background/50 space-y-3 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${activeSelectedTier.color}`}
                >
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
                    <p className="font-medium text-foreground truncate">{m.name}</p>
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
