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
import {
  BarChart3,
  Sparkles,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Users,
  Activity,
  UserX,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { DashboardStats } from "@/components/admin/dashboard-stats"
import { GrowthChart } from "@/components/admin/charts/growth-chart"
import { StageDistributionChart } from "@/components/admin/charts/stage-distribution-chart"
import { PreacherPerformanceChart } from "@/components/admin/charts/preacher-performance-chart"
import { AttendanceTrendChart } from "@/components/admin/charts/attendance-trend-chart"
import { ActivityEngagementChart } from "@/components/admin/charts/activity-engagement-chart"
import { InactiveBeneficiaries } from "@/components/admin/charts/inactive-beneficiaries"
import { useAuth } from "@/hooks/use-auth"

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

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
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/80 backdrop-blur-md px-6">
            <SidebarTrigger className="-ml-1 text-primary hover:bg-muted" />
            <Separator
              orientation="vertical"
              className="mr-2 h-4 bg-muted"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-foreground font-semibold">
                    Admin Dashboard
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {data.loading ? "Updating..." : "Last updated just now"}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={data.refresh}
                disabled={data.loading}
                className="gap-2"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${data.loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex flex-1 flex-col gap-8 p-6 max-w-[1600px] mx-auto w-full">
            {/* Page Title */}
            <div className="space-y-1 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2.5 gradient-bg-primary rounded-xl shadow-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold gradient-text-primary leading-normal">
                    Main Dashboard
                  </h1>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-secondary" />
                    Overview of system performance and key metrics
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
                    className="border-destructive/30 text-destructive hover:bg-destructive/10"
                  >
                    Retry
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* ── Section 1: Key Metrics ── */}
            <section>
              <SectionHeader
                icon={TrendingUp}
                title="Key Metrics"
                description="High-level summary of important numbers"
              />
              <div className="animate-slide-up">
                <DashboardStats data={data} />
              </div>
            </section>

            <Separator className="bg-border/60" />

            {/* ── Section 2: Growth & Distribution ── */}
            <section>
              <SectionHeader
                icon={Users}
                title="Growth & Distribution"
                description="Beneficiary growth trends and stage breakdown"
              />
              <div className="flex flex-col gap-6">
                <GrowthChart data={data} />
                <StageDistributionChart data={data} />
              </div>
            </section>

            <Separator className="bg-border/60" />

            {/* ── Section 3: Attendance ── */}
            <section>
              <SectionHeader
                icon={Activity}
                title="Attendance Tracking"
                description="Weekly and monthly attendance patterns"
              />
              <div className="w-full">
                <AttendanceTrendChart data={data} />
              </div>
            </section>

            {/* ── Section 4: Performance & Engagement (Admin Only) ── */}
            {isAdmin && (
              <>
                <Separator className="bg-border/60" />
                <section>
                  <SectionHeader
                    icon={BarChart3}
                    title="Performance & Engagement"
                    description="Preacher performance and activity participation metrics"
                  />
                  <div className="flex flex-col gap-6">
                    <PreacherPerformanceChart data={data} />
                    <ActivityEngagementChart data={data} />
                  </div>
                </section>
              </>
            )}

            <Separator className="bg-border/60" />

            {/* ── Section 5: Inactive Beneficiaries ── */}
            <section className="pb-6">
              <SectionHeader
                icon={UserX}
                title="Inactive Beneficiaries"
                description="Beneficiaries who need follow-up or re-engagement"
              />
              <InactiveBeneficiaries data={data} />
            </section>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  )
}