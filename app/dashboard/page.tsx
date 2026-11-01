import { AuthGuard } from "@/components/auth/auth-guard"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { PreacherSidebar } from "@/components/preacher/preacher-sidebar"
import { PreacherStats } from "@/components/preacher/preacher-stats"
import { BeneficiaryIntakeWidget } from "@/components/preacher/beneficiary-intake-widget"
import { PreacherWorkspace } from "@/components/preacher/preacher-workspace"
import { PreacherDashboardHeader } from "@/components/preacher/preacher-dashboard-header"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"

export default function PreacherDashboard() {
  return (
    <AuthGuard requiredRole="da'i">
      <SidebarProvider>
        <PreacherSidebar />
        <SidebarInset className="bg-background">
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/80 backdrop-blur-md px-4 sm:px-6">
            <SidebarTrigger className="-ml-1 text-primary hover:bg-muted" />
            <Separator orientation="vertical" className="ml-2 h-4 bg-muted" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-foreground font-semibold">Preacher Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>

          <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 max-w-7xl mx-auto w-full">
            {/* Header with Welcome and Quick Action Command Bar */}
            <PreacherDashboardHeader />

            {/* Scope Stats KPI Cards */}
            <div className="animate-fade-in">
              <PreacherStats />
            </div>

            {/* Beneficiary Intake & Real-time Database Check Widget */}
            <div className="animate-fade-in">
              <BeneficiaryIntakeWidget />
            </div>

            {/* Folder Session Workspace & Quick Attendance */}
            <div className="animate-fade-in">
              <PreacherWorkspace />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  )
}
