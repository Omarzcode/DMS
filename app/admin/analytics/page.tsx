"use client"

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart3,
  RefreshCw,
  Users,
  Activity,
  UserCheck,
  TrendingUp,
} from "lucide-react"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { AnalyticsThreeSummaryGrid } from "@/components/admin/analytics-three-summary-grid"
import { AttendanceTrendChart } from "@/components/admin/charts/attendance-trend-chart"
import { BeneficiaryTopAttendanceTable } from "@/components/admin/charts/beneficiary-top-attendance-table"
import { ActivityTopPerformersTable } from "@/components/admin/charts/activity-top-performers-table"
import { PreacherLeaderboardTable } from "@/components/admin/charts/preacher-leaderboard-table"
import { BeneficiaryKpiSummary } from "@/components/admin/charts/beneficiary-kpi-summary"
import { ActivityKpiSummary } from "@/components/admin/charts/activity-kpi-summary"

export default function AnalyticsHubPage() {
  const data = useDashboardData()

  return (
    <AuthGuard requiredRole="admin">
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset>
          {/* Header */}
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
                  <BreadcrumbPage className="text-foreground font-semibold">
                    Analytics Hub
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
                className="gap-2 text-xs"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${data.loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 max-w-7xl mx-auto w-full">
            {/* Title Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    Analytics Overview Hub
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Unified performance intelligence across Employees, Beneficiaries, and Activities.
                  </p>
                </div>
              </div>
            </div>

            {/* 3 Pillar Summary Cards */}
            <AnalyticsThreeSummaryGrid data={data} />

            {/* Comprehensive Tabs */}
            <Tabs defaultValue="all" className="space-y-6">
              <TabsList className="bg-muted/40 p-1 border border-border/50 rounded-xl">
                <TabsTrigger
                  value="all"
                  className="gap-1.5 text-xs data-[state=active]:bg-card"
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  Executive View
                </TabsTrigger>
                <TabsTrigger
                  value="beneficiaries"
                  className="gap-1.5 text-xs data-[state=active]:bg-card"
                >
                  <Users className="h-3.5 w-3.5" />
                  Beneficiaries Summary
                </TabsTrigger>
                <TabsTrigger
                  value="activities"
                  className="gap-1.5 text-xs data-[state=active]:bg-card"
                >
                  <Activity className="h-3.5 w-3.5" />
                  Activities Summary
                </TabsTrigger>
                <TabsTrigger
                  value="employees"
                  className="gap-1.5 text-xs data-[state=active]:bg-card"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  Employees Summary
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-6 m-0">
                <AttendanceTrendChart data={data} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <BeneficiaryTopAttendanceTable data={data} />
                  <ActivityTopPerformersTable data={data} />
                </div>
                <PreacherLeaderboardTable data={data} />
              </TabsContent>

              <TabsContent value="beneficiaries" className="space-y-6 m-0">
                <BeneficiaryKpiSummary data={data} />
                <BeneficiaryTopAttendanceTable data={data} />
              </TabsContent>

              <TabsContent value="activities" className="space-y-6 m-0">
                <ActivityKpiSummary data={data} />
                <AttendanceTrendChart data={data} />
                <ActivityTopPerformersTable data={data} />
              </TabsContent>

              <TabsContent value="employees" className="space-y-6 m-0">
                <PreacherLeaderboardTable data={data} />
              </TabsContent>
            </Tabs>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  )
}
