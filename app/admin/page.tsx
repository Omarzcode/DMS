import { AuthGuard } from "@/components/auth/auth-guard"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { DashboardStats } from "@/components/admin/dashboard-stats"
import { BeneficiaryDistributionChart } from "@/components/admin/beneficiary-distribution-chart"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { BarChart3, Sparkles } from "lucide-react"

export default function AdminDashboard() {
  return (
    <AuthGuard requiredRole="admin">
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset className="bg-gradient-to-br from-purple-50/30 via-pink-50/30 to-orange-50/30">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-purple-100 bg-white/80 backdrop-blur-sm px-4">
            <SidebarTrigger className="-ml-1 text-purple-600 hover:bg-purple-100" />
            <Separator orientation="vertical" className="mr-2 h-4 bg-purple-200" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-purple-800 font-semibold">لوحة تحكم المدير</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>

          <div className="flex flex-1 flex-col gap-6 p-6">
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2 gradient-bg-primary rounded-xl shadow-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold gradient-text-primary leading-normal">لوحة التحكم الرئيسية</h1>
                  <p className="text-lg text-muted-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    نظرة شاملة على أداء نظام إدارة الدعوة والمقاييس الرئيسية
                  </p>
                </div>
              </div>
            </div>

            <div className="animate-slide-up">
              <DashboardStats />
            </div>
            
            <div className="animate-scale-in" style={{ animationDelay: '0.2s' }}>
              <BeneficiaryDistributionChart />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  )
}