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
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart3,
  Sparkles,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Users,
  Activity,
  UserCheck,
  UserX,
  Layers,
  Trophy,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { AnalyticsThreeSummaryGrid } from "@/components/admin/analytics-three-summary-grid"
import { AttendanceTrendChart } from "@/components/admin/charts/attendance-trend-chart"
import { BeneficiaryTopAttendanceTable } from "@/components/admin/charts/beneficiary-top-attendance-table"
import { ActivityTopPerformersTable } from "@/components/admin/charts/activity-top-performers-table"
import { PreacherLeaderboardTable } from "@/components/admin/charts/preacher-leaderboard-table"
import { BeneficiaryKpiSummary } from "@/components/admin/charts/beneficiary-kpi-summary"
import { ActivityKpiSummary } from "@/components/admin/charts/activity-kpi-summary"
import { ActivityCategoryBreakdown } from "@/components/admin/charts/activity-category-breakdown"
import { GrowthChart } from "@/components/admin/charts/growth-chart"
import { StageDistributionChart } from "@/components/admin/charts/stage-distribution-chart"
import { InactiveBeneficiaries } from "@/components/admin/charts/inactive-beneficiaries"
import { useAuth } from "@/hooks/use-auth"

export default function AdminDashboard() {
  const data = useDashboardData()
  const { userRole } = useAuth()
  const isAdmin = userRole === "admin"

  return (
    <AuthGuard requiredRole="admin">
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset className="bg-gradient-to-br from-primary/5 via-secondary/5 to-background">
          {/* Header */}
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/80 backdrop-blur-md px-4 sm:px-6">
            <SidebarTrigger className="-mr-1 text-primary hover:bg-muted" />
            <Separator orientation="vertical" className="ml-2 h-4 bg-muted" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-foreground font-semibold">
                    Admin Dashboard
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

          {/* Main Content */}
          <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 max-w-7xl mx-auto w-full">
            {/* Page Title Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 gradient-bg-primary rounded-xl shadow-lg shrink-0">
                  <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold gradient-text-primary leading-tight">
                    Admin Executive Dashboard
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Sparkles className="h-3.5 w-3.5 text-secondary shrink-0" />
                    Consolidated intelligence across Employees, Beneficiaries, and Activities.
                  </p>
                </div>
              </div>
            </div>

            {/* Error Alert */}
            {data.error && (
              <Card className="border-destructive/50 bg-destructive/5 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  </div>
                  <p className="text-sm text-destructive flex-1">
                    {data.error}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={data.refresh}
                    className="border-destructive/30 text-destructive hover:bg-destructive/10 text-xs"
                  >
                    Retry
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* ── Top Central Summary: 3 Pillars Grid ── */}
            <AnalyticsThreeSummaryGrid data={data} />

            {/* ── Exploration Tabs ── */}
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="bg-muted/40 p-1 border border-border/50 rounded-xl">
                <TabsTrigger
                  value="overview"
                  className="gap-1.5 text-xs data-[state=active]:bg-card"
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  Executive Overview
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

              {/* ── Tab 1: Executive Overview ── */}
              <TabsContent value="overview" className="space-y-6 m-0">
                {/* Attendance Trends */}
                <AttendanceTrendChart data={data} />

                {/* 2-Column Leaderboards Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <BeneficiaryTopAttendanceTable data={data} />
                  <ActivityTopPerformersTable data={data} />
                </div>

                {/* Preachers Leaderboard */}
                {isAdmin && <PreacherLeaderboardTable data={data} />}

                {/* Growth and Stage Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <GrowthChart data={data} />
                  <StageDistributionChart data={data} />
                </div>

                {/* Inactive Beneficiaries Follow-Up */}
                <InactiveBeneficiaries data={data} />
              </TabsContent>

              {/* ── Tab 2: Beneficiaries Analytics Summary ── */}
              <TabsContent value="beneficiaries" className="space-y-6 m-0">
                <BeneficiaryKpiSummary data={data} />
                <BeneficiaryTopAttendanceTable data={data} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <GrowthChart data={data} />
                  <StageDistributionChart data={data} />
                </div>
                <InactiveBeneficiaries data={data} />
              </TabsContent>

              {/* ── Tab 3: Activities Analytics Summary ── */}
              <TabsContent value="activities" className="space-y-6 m-0">
                <ActivityKpiSummary data={data} />
                <AttendanceTrendChart data={data} />
                <ActivityTopPerformersTable data={data} />
                <ActivityCategoryBreakdown data={data} />
              </TabsContent>

              {/* ── Tab 4: Employees Analytics Summary ── */}
              <TabsContent value="employees" className="space-y-6 m-0">
                {isAdmin && <PreacherLeaderboardTable data={data} />}
              </TabsContent>
            </Tabs>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  )
}
