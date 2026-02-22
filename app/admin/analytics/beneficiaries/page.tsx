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
import { Users, RefreshCw, AlertCircle } from "lucide-react"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { GrowthChart } from "@/components/admin/charts/growth-chart"
import { StageDistributionChart } from "@/components/admin/charts/stage-distribution-chart"
import { InactiveBeneficiaries } from "@/components/admin/charts/inactive-beneficiaries"

export default function BeneficiaryAnalyticsPage() {
  const data = useDashboardData()

  return (
    <AuthGuard requiredRole="admin">
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/80 backdrop-blur-md px-6">
            <SidebarTrigger className="-ml-1 text-primary hover:bg-muted" />
            <Separator orientation="vertical" className="mr-2 h-4 bg-muted" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/admin" className="text-muted-foreground hover:text-foreground">Admin</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/admin/analytics" className="text-muted-foreground hover:text-foreground">
                    Analytics
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-foreground font-semibold">Beneficiaries</BreadcrumbPage>
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

          <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <Users className="h-7 w-7 text-primary" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Beneficiary Analytics
                </h1>
                <p className="text-muted-foreground">
                  Growth trends, stage distribution, and inactive
                  beneficiary tracking.
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={data.refresh}
                  >
                    Retry
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GrowthChart data={data} />
              <StageDistributionChart data={data} />
            </div>

            <InactiveBeneficiaries data={data} />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  )
}