"use client"

import { useMemo } from "react"
import { AuthGuard } from "@/components/auth/auth-guard"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbLink,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  RefreshCw,
  AlertCircle,
  Calendar,
  Users,
  TrendingUp,
  UserCheck,
} from "lucide-react"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { PreacherEventsAttendanceChart } from "@/components/admin/charts/preacher-events-attendance-chart"
import { PreacherLeaderboardTable } from "@/components/admin/charts/preacher-leaderboard-table"
import { Logo } from "@/components/ui/logo"

export default function PreacherAnalyticsPage() {
  const data = useDashboardData()

  // ─── High-Level Summary Stats ────────────────────────────────
  const summary = useMemo(() => {
    if (!data.activities.all || !data.attendance) {
      return { activePreachers: 0, totalEvents: 0, totalAttendees: 0, avgPerEvent: 0 }
    }

    const preacherMap = new Map<
      string,
      { id: string; name: string; email: string }
    >()

    data.preachers.forEach((p) => {
      preacherMap.set(p.id, {
        id: p.id,
        name: p.name || "Preacher",
        email: p.email || "",
      })
    })

    data.activities.all.forEach((act) => {
      if (act.creator_id && !preacherMap.has(act.creator_id)) {
        preacherMap.set(act.creator_id, {
          id: act.creator_id,
          name: act.creator_name || "Preacher",
          email: "",
        })
      } else if (act.creator_name) {
        const found = Array.from(preacherMap.values()).find(
          (p) =>
            p.name.trim().toLowerCase() === act.creator_name.trim().toLowerCase()
        )
        if (!found) {
          preacherMap.set(`name_${act.creator_name}`, {
            id: `name_${act.creator_name}`,
            name: act.creator_name,
            email: "",
          })
        }
      }
    })

    let activeCount = 0
    let totalEvents = 0
    let totalAttendees = 0

    Array.from(preacherMap.values()).forEach((p) => {
      const activitiesMade = data.activities.all.filter((act) => {
        const idMatch = act.creator_id && act.creator_id === p.id
        const nameMatch =
          act.creator_name &&
          p.name &&
          act.creator_name.trim().toLowerCase() ===
            p.name.trim().toLowerCase()
        return idMatch || nameMatch
      })

      const eventsCount = activitiesMade.length
      const activityIds = new Set(activitiesMade.map((a) => a.id))

      const presentRecords = data.attendance.filter(
        (att) => activityIds.has(att.activity_id) && att.present === true
      )
      const attendeesCount = presentRecords.length

      // Only count active preachers (both events > 0 and attendees > 0)
      if (eventsCount > 0 && attendeesCount > 0) {
        activeCount += 1
        totalEvents += eventsCount
        totalAttendees += attendeesCount
      }
    })

    const avgPerEvent =
      totalEvents > 0 ? Number((totalAttendees / totalEvents).toFixed(1)) : 0

    return {
      activePreachers: activeCount,
      totalEvents,
      totalAttendees,
      avgPerEvent,
    }
  }, [data.preachers, data.activities.all, data.attendance])

  return (
    <AuthGuard requiredRole="admin">
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/80 backdrop-blur-md px-4 sm:px-6">
            <SidebarTrigger className="-mr-1 text-primary hover:bg-muted" />
            <Separator orientation="vertical" className="ml-2 h-4 bg-muted" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    href="/admin"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Admin
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    href="/admin/analytics"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Analytics
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-foreground font-semibold">
                    Preachers
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="mr-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {data.loading ? "Updating..." : "Real-time sync"}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={data.refresh}
                disabled={data.loading}
                className="gap-2"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${
                    data.loading ? "animate-spin" : ""
                  }`}
                />
                Refresh
              </Button>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
            {/* Page Header */}
            <div className="flex items-center gap-3.5">
              <Logo size={48} />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Preacher Analytics
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Tracking events organized by each preacher and the attendees engaged in those events.
                </p>
              </div>
            </div>

            {data.error && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <p className="text-sm text-destructive flex-1">
                    {data.error}
                  </p>
                  <Button variant="outline" size="sm" onClick={data.refresh}>
                    Retry
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Active Preachers */}
              <Card className="border border-border/50 bg-card/60 backdrop-blur-md shadow-2xs">
                <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Active Preachers
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1 tabular-nums">
                      {data.loading ? "..." : summary.activePreachers}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      With events & attendees
                    </p>
                  </div>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <UserCheck className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                </CardContent>
              </Card>

              {/* Total Events Hosted */}
              <Card className="border border-border/50 bg-card/60 backdrop-blur-md shadow-2xs">
                <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Events Hosted
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                      {data.loading ? "..." : summary.totalEvents}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Across all active sessions
                    </p>
                  </div>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                </CardContent>
              </Card>

              {/* Total Attendees Reached */}
              <Card className="border border-border/50 bg-card/60 backdrop-blur-md shadow-2xs">
                <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Total Attendees
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-1 tabular-nums">
                      {data.loading ? "..." : summary.totalAttendees}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Turnout in their events
                    </p>
                  </div>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                </CardContent>
              </Card>

              {/* Avg Attendance per Event */}
              <Card className="border border-border/50 bg-card/60 backdrop-blur-md shadow-2xs">
                <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Avg Turnout
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
                      {data.loading ? "..." : `${summary.avgPerEvent}`}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Attendees per event
                    </p>
                  </div>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                    <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Custom Preacher Events & Attendance Chart */}
            <PreacherEventsAttendanceChart data={data} />

            {/* Detailed Table */}
            <PreacherLeaderboardTable data={data} />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  )
}
