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
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Calendar,
  RefreshCw,
  AlertCircle,
  Activity,
  Layers,
  Trophy,
  Sparkles,
} from "lucide-react"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { ActivityKpiSummary } from "@/components/admin/charts/activity-kpi-summary"
import { AttendanceTrendChart } from "@/components/admin/charts/attendance-trend-chart"
import { ActivityCategoryBreakdown } from "@/components/admin/charts/activity-category-breakdown"
import { ActivityTopPerformersTable } from "@/components/admin/charts/activity-top-performers-table"

export default function ActivityAnalyticsPage() {
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
                  <BreadcrumbLink
                    href="/admin/analytics"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Analytics
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-foreground font-semibold">
                    Activities
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="mr-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {data.loading ? "Updating data..." : "Real-time sync"}
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

          {/* Main Body */}
          <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 max-w-7xl mx-auto w-full">
            {/* Title & Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                      Activity Analytics
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      Weekly attendance trajectory, educational category ratios, and top performing programs.
                    </p>
                  </div>
                </div>
              </div>

              {/* Status pill */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>All Activity Types Tracked</span>
                </span>
              </div>
            </div>

            {/* Error Message if any */}
            {data.error && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                  <p className="text-sm text-destructive flex-1">
                    {data.error}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={data.refresh}
                    className="text-xs"
                  >
                    Retry
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Top KPI Metric Cards */}
            <ActivityKpiSummary data={data} />

            {/* Tabs for Clean Organized Exploration */}
            <Tabs defaultValue="trends" className="space-y-6">
              <TabsList className="bg-muted/40 p-1 border border-border/50 rounded-xl">
                <TabsTrigger
                  value="trends"
                  className="gap-1.5 text-xs data-[state=active]:bg-card"
                >
                  <Activity className="h-3.5 w-3.5" />
                  Attendance Trends
                </TabsTrigger>
                <TabsTrigger
                  value="directory"
                  className="gap-1.5 text-xs data-[state=active]:bg-card"
                >
                  <Trophy className="h-3.5 w-3.5" />
                  Top Programs
                </TabsTrigger>
                <TabsTrigger
                  value="categories"
                  className="gap-1.5 text-xs data-[state=active]:bg-card"
                >
                  <Layers className="h-3.5 w-3.5" />
                  Category Share
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Attendance Trends (Enhanced) */}
              <TabsContent value="trends" className="space-y-6 m-0">
                <AttendanceTrendChart data={data} />
                <ActivityTopPerformersTable data={data} />
              </TabsContent>

              {/* Tab 2: Top Programs Directory */}
              <TabsContent value="directory" className="space-y-6 m-0">
                <ActivityTopPerformersTable data={data} />
                <ActivityCategoryBreakdown data={data} />
              </TabsContent>

              {/* Tab 3: Category Breakdown */}
              <TabsContent value="categories" className="space-y-6 m-0">
                <ActivityCategoryBreakdown data={data} />
                <AttendanceTrendChart data={data} />
              </TabsContent>
            </Tabs>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  )
}
