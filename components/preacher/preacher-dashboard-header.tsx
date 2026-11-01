"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { AddBeneficiaryDialog } from "@/components/beneficiaries/add-beneficiary-dialog"
import { CreateActivityDialog } from "@/components/activities/create-activity-dialog"
import { Button } from "@/components/ui/button"
import {
  UserPlus,
  BookOpen,
  Calendar,
} from "lucide-react"
import Link from "next/link"

export function PreacherDashboardHeader() {
  const { user } = useAuth()
  const [isAddBeneficiaryOpen, setIsAddBeneficiaryOpen] = useState(false)
  const [createType, setCreateType] = useState<"maqari" | "events" | null>(null)

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Preacher"

  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-border/60">
      <div className="space-y-1.5 min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex-wrap">
          <span>Preacher Workspace</span>
          <span className="text-border">/</span>
          <span className="text-primary font-medium">All Folders Access</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate" title={`Welcome back, ${displayName}`}>
          Welcome back, {displayName}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Log attendance, track engagement, and manage Maqra&apos;a study circles and central events.
        </p>
      </div>

      {/* Quick Action Commands */}
      <div className="flex items-center gap-2.5 flex-wrap shrink-0">
        <Button
          onClick={() => setIsAddBeneficiaryOpen(true)}
          size="sm"
          className="h-9 px-3.5 gap-1.5 text-xs font-medium shadow-xs transition-all hover:translate-y-[-1px]"
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span>Add Beneficiary</span>
        </Button>

        <Button
          onClick={() => setCreateType("maqari")}
          size="sm"
          variant="outline"
          className="h-9 px-3.5 gap-1.5 text-xs font-medium bg-card/60 hover:bg-accent/40 hover:border-primary/40 border-border/70 transition-all hover:translate-y-[-1px]"
        >
          <BookOpen className="h-3.5 w-3.5 text-primary" />
          <span>+ Maqra&apos;a</span>
        </Button>

        <Button
          onClick={() => setCreateType("events")}
          size="sm"
          variant="outline"
          className="h-9 px-3.5 gap-1.5 text-xs font-medium bg-card/60 hover:bg-accent/40 hover:border-primary/40 border-border/70 transition-all hover:translate-y-[-1px]"
        >
          <Calendar className="h-3.5 w-3.5 text-primary" />
          <span>+ Event</span>
        </Button>
      </div>

      {/* Modal Dialogs */}
      <AddBeneficiaryDialog
        open={isAddBeneficiaryOpen}
        onOpenChange={setIsAddBeneficiaryOpen}
      />

      <CreateActivityDialog
        open={createType !== null}
        onOpenChange={(open) => !open && setCreateType(null)}
        activityType={createType || "maqari"}
      />
    </div>
  )
}
