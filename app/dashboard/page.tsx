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
        <SidebarInset className="bg-gradient-to-br from-blue-50/30 via-purple-50/30 to-pink-50/30">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-blue-100 bg-white/80 backdrop-blur-sm px-4">
            <SidebarTrigger className="-ml-1 text-blue-600 hover:bg-blue-100" />
            <Separator orientation="vertical" className="mr-2 h-4 bg-blue-200" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-blue-800 font-semibold">لوحة تحكم الداعية</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>

          <div className="flex flex-1 flex-col gap-6 p-6">
            <div className="space-y-4 animate-fade-in">
  <div className="flex flex-wrap items-center gap-4">
    {/* الأيقونة */}
    <div className="p-3 gradient-bg-primary rounded-2xl shadow-lg flex-shrink-0">
      <Heart className="h-7 w-7 text-white" />
    </div>

    {/* النصوص */}
    <div className="min-w-0">
      <h1 className="text-3xl sm:text-4xl font-bold gradient-text-primary leading-snug">
        أهلاً وسهلاً بعودتك!
      </h1>
      <p className="text-base sm:text-lg text-muted-foreground flex items-center gap-2 mt-2 leading-relaxed">
        <Sparkles className="h-4 w-4 text-blue-500 flex-shrink-0" />
        <span className="truncate sm:whitespace-normal">
          نظرة عامة على أنشطتك الدعوية والمستفيدين المكلفين بك
        </span>
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