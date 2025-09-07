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
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2 gradient-bg-primary rounded-xl shadow-lg">
                  <Heart className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold gradient-text-primary">أهلاً وسهلاً بعودتك!</h1>
                  <p className="text-lg text-muted-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    نظرة عامة على أنشطتك الدعوية والمستفيدين المكلفين بك
                  </p>
                </div>
              </div>
            </div>

            <div className="animate-slide-up">
              <PreacherStats />
            </div>

            <div className="grid gap-6 md:grid-cols-2 animate-scale-in" style={{ animationDelay: '0.2s' }}>
              <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/50 p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 gradient-bg-secondary rounded-lg">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-blue-800">الإجراءات السريعة</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <div className="h-2 w-2 gradient-bg-primary rounded-full"></div>
                    <span>إضافة مستفيدين جدد</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <div className="h-2 w-2 gradient-bg-primary rounded-full"></div>
                    <span>إنشاء مقارئ شخصية</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <div className="h-2 w-2 gradient-bg-primary rounded-full"></div>
                    <span>تسجيل حضور الأنشطة</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <div className="h-2 w-2 gradient-bg-primary rounded-full"></div>
                    <span>تحديث تقدم المستفيدين</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-white to-purple-50/50 p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 gradient-bg-accent rounded-lg">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-purple-800">النشاط الأخير</h3>
                </div>
                <p className="text-sm text-purple-700 leading-relaxed">
                  أنشطتك وتحديثاتك الأخيرة ستظهر هنا. ابدأ بإضافة مستفيدين جدد أو إنشاء أنشطة لرؤية التقدم.
                </p>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  )
}