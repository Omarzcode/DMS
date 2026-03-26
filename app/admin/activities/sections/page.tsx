import { AuthGuard } from "@/components/auth/auth-guard"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbLink,
} from "@/components/ui/breadcrumb"
import { ActivityList } from "@/components/activities/activity-list"
import { MobileActivitySubNav } from "@/components/activities/mobile-activity-subnav"

export default function AdminSectionsPage() {
  return (
    <AuthGuard requiredRole="admin">
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/80 backdrop-blur-md px-4 sm:px-6">
            <SidebarTrigger className="-ml-1 text-primary hover:bg-muted" />
            <Separator orientation="vertical" className="mr-2 h-4 bg-muted" />
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
                    href="/admin/activities"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Activities
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-foreground font-semibold">
                    Sections
                  </BreadcrumbPage>
                </BreadcrumbItem>                
              </BreadcrumbList>
            </Breadcrumb>
          </header>

          <div className="flex flex-1 flex-col gap-4 p-4">
            <MobileActivitySubNav basePath="/admin/activities" />
            <ActivityList type="sections" title="All Sections" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  )
}