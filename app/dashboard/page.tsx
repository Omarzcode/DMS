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
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-white/80 backdrop-blur-sm px-4">
            <SidebarTrigger className="-ml-1 text-primary hover:bg-primary" />
            <Separator orientation="vertical" className="mr-2 h-4 bg-primary" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-primary font-semibold">لوحة تحكم الداعية</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>

          <div className="flex flex-1 flex-col gap-6 p-6">
            <div className="space-y-3 animate-fade-in ">
              <div className="flex items-center gap-3">
                <div className="p-2 gradient-bg-primary rounded-xl shadow-lg">
                  <Heart className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold gradient-text-primary leading-normal">أهلاً وسهلاً بعودتك!</h1>
                  <p className="text-lg text-muted-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    نظرة عامة على أنشطتك الهندسية والمستفيدين المكلفين بك
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