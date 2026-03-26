import { AuthGuard } from "@/components/auth/auth-guard"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { PreacherSidebar } from "@/components/preacher/preacher-sidebar"
import { PreacherStats } from "@/components/preacher/preacher-stats"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { Heart, Sparkles, Users } from "lucide-react"

export default function PreacherDashboard() {
  return (
    <AuthGuard requiredRole="da'i">
      <SidebarProvider>
        <PreacherSidebar />
        <SidebarInset className="bg-gradient-to-br bg-background">
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/80 backdrop-blur-md px-4 sm:px-6">
            <SidebarTrigger className="-mr-1 text-primary hover:bg-muted" />
            <Separator orientation="vertical" className="ml-2 h-4 bg-muted" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-foreground font-semibold">Preacher Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>

          <div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 sm:p-6">
            <div className="space-y-2 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="p-1.5 sm:p-2 gradient-bg-primary rounded-xl shadow-lg shrink-0">
                  <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold gradient-text-primary leading-tight">Welcome back!</h1>
                  <p className="text-sm sm:text-base text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                    <span>Overview of your activities and assigned beneficiaries</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="animate-slide-up">
              <PreacherStats />
            </div>


          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  )
}
