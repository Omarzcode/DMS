"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { AddBeneficiaryDialog } from "@/components/beneficiaries/add-beneficiary-dialog"
import { CreateActivityDialog } from "@/components/activities/create-activity-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  UserPlus,
  BookOpen,
  Calendar,
  Folder,
  Sparkles,
  ShieldCheck,
} from "lucide-react"
import Link from "next/link"

export function PreacherDashboardHeader() {
  const { user } = useAuth()
  const [isAddBeneficiaryOpen, setIsAddBeneficiaryOpen] = useState(false)
  const [createType, setCreateType] = useState<"maqari" | "events" | null>(null)

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Preacher"

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-border/50">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Welcome back, {displayName}
          </h1>
          <Badge variant="outline" className="gap-1 text-xs py-0.5 border-primary/30 text-primary bg-primary/5">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Preacher (Full Access)</span>
          </Badge>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>Full access to Beneficiaries, Maqra'a circles, and Central Events across all folders.</span>
        </p>
      </div>

      {/* Quick Action Commands */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          onClick={() => setIsAddBeneficiaryOpen(true)}
          size="sm"
          className="gap-1.5 text-xs shadow-xs"
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span>Add Beneficiary</span>
        </Button>

        <Button
          onClick={() => setCreateType("maqari")}
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs shadow-2xs hover:border-primary/40"
        >
          <BookOpen className="h-3.5 w-3.5 text-primary" />
          <span>+ Maqra'a</span>
        </Button>

        <Button
          onClick={() => setCreateType("events")}
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs shadow-2xs hover:border-primary/40"
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
