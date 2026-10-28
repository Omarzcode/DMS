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
import { Users, RefreshCw, AlertCircle, Sparkles, Layers, UserX } from "lucide-react"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { BeneficiaryKpiSummary } from "@/components/admin/charts/beneficiary-kpi-summary"
import { BeneficiaryTopAttendanceTable } from "@/components/admin/charts/beneficiary-top-attendance-table"
import { BeneficiaryEngagementDistribution } from "@/components/admin/charts/beneficiary-engagement-distribution"
import { BeneficiaryMonthlyIntakeChart } from "@/components/admin/charts/beneficiary-monthly-intake-chart"
import { StageDistributionChart } from "@/components/admin/charts/stage-distribution-chart"
import { InactiveBeneficiaries } from "@/components/admin/charts/inactive-beneficiaries"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function BeneficiaryAnalyticsPage() {
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
                    Beneficiaries
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

          {/* Page Body */}
          <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 max-w-7xl mx-auto w-full">
            {/* Title & Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                      Beneficiary Analytics
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      Activity rates, top attendee rankings, monthly recruitment velocity, and retention health.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {data.error && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <p className="text-sm text-destructive flex-1">{data.error}</p>
                  <Button variant="outline" size="sm" onClick={data.refresh}>
                    Retry
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* 1. Core KPIs: Total, Active, Added this month, Avg Attendance */}
            <BeneficiaryKpiSummary data={data} />

            {/* 2. Top 20 Beneficiaries Leaderboard by Attendance Rate */}
            <BeneficiaryTopAttendanceTable data={data} />

            {/* 3. Engagement Distribution & Monthly Intake Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BeneficiaryEngagementDistribution data={data} />
              <BeneficiaryMonthlyIntakeChart data={data} />
            </div>

            {/* 4. Deep-dive tabs: Stage progression & Inactive follow-ups */}
            <Tabs defaultValue="stages" className="w-full space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">
                  Additional Insights
                </h3>
                <TabsList className="bg-muted/50 p-1">
                  <TabsTrigger value="stages" className="gap-1.5 text-xs">
                    <Layers className="h-3.5 w-3.5" />
                    Da&apos;wa Stages
                  </TabsTrigger>
                  <TabsTrigger value="inactive" className="gap-1.5 text-xs">
                    <UserX className="h-3.5 w-3.5" />
                    Inactive Members
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="stages" className="space-y-4 mt-0">
                <StageDistributionChart data={data} />
              </TabsContent>

              <TabsContent value="inactive" className="space-y-4 mt-0">
                <InactiveBeneficiaries data={data} />
              </TabsContent>
            </Tabs>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  )
}
