import { AuthGuard } from "@/components/auth/auth-guard"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { PreacherSidebar } from "@/components/preacher/preacher-sidebar"
import { MyMaqari } from "@/components/activities/my-maqari"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbLink } from "@/components/ui/breadcrumb"

export default function MyMaqariPage() {
  return (
    <AuthGuard requiredRole="da'i">
      <SidebarProvider>
        <PreacherSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/80 backdrop-blur-md px-6">
            <SidebarTrigger className="-ml-1 text-primary hover:bg-muted" />
            <Separator orientation="vertical" className="mr-2 h-4 bg-muted" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard" className="text-muted-foreground hover:text-foreground">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-foreground font-semibold">My Maqari</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>

          <div className="flex flex-1 flex-col gap-4 p-4">
            <MyMaqari />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  )
}
