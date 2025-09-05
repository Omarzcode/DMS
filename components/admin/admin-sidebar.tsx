    "use client"
    
    import { useAuth } from "@/hooks/use-auth"
    import {
      Sidebar,
      SidebarContent,
      SidebarFooter,
      SidebarGroup,
      SidebarGroupContent,
      SidebarGroupLabel,
      SidebarHeader,
      SidebarMenu,
      SidebarMenuButton,
      SidebarMenuItem,
      SidebarSeparator,
    } from "@/components/ui/sidebar"
    import { Button } from "@/components/ui/button"
    import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
    import { BarChart3, Users, UserCheck, Calendar, LogOut, Shield, BookOpen, TrendingUp, Activity } from "lucide-react"
    import Link from "next/link"
    import { usePathname } from "next/navigation"
    import { Logo } from "@/components/ui/logo"
    
    const adminMenuItems = [
      {
        title: "Dashboard",
        url: "/admin",
        icon: BarChart3,
      },
      {
        title: "User Management",
        url: "/admin/users",
        icon: Shield,
      },
    ]
    
    const analyticsMenuItems = [
      {
        title: "Overview",
        url: "/admin/analytics",
        icon: TrendingUp,
      },
      {
        title: "Preachers",
        url: "/admin/analytics/preachers",
        icon: UserCheck,
      },
      {
        title: "Beneficiaries",
        url: "/admin/analytics/beneficiaries",
        icon: Users,
      },
      {
        title: "Activities",
        url: "/admin/analytics/activities",
        icon: Activity,
      },
    ]
    
    const managementMenuItems = [
      {
        title: "Beneficiaries",
        url: "/admin/beneficiaries",
        icon: Users,
      },
      {
        title: "Activities",
        url: "/admin/activities",
        icon: Calendar,
      },
      {
        title: "Lessons",
        url: "/admin/lessons",
        icon: BookOpen,
      },
    ]
    
    export function AdminSidebar() {
      const { user, logout } = useAuth()
      const pathname = usePathname()
    
      const handleLogout = async () => {
        try {
          await logout()
        } catch (error) {
          console.error("Error logging out:", error)
        }
      }
    
      return (
        <Sidebar>
          <SidebarHeader className="border-b border-sidebar-border">
            <div className="px-2 py-2">
                <Logo />
            </div>
          </SidebarHeader>
    
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>الرئيسية</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminMenuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
    
            <SidebarSeparator />
    
            <SidebarGroup>
              <SidebarGroupLabel>التحليلات</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {analyticsMenuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
    
            <SidebarSeparator />
    
            <SidebarGroup>
              <SidebarGroupLabel>الإدارة</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {managementMenuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
    
          <SidebarFooter className="border-t border-sidebar-border">
            <div className="flex items-center gap-3 px-2 py-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || ""} />
                <AvatarFallback>{user?.displayName?.charAt(0) || user?.email?.charAt(0) || "A"}</AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col min-w-0">
                <span className="text-sm font-medium truncate">{user?.displayName || "Admin"}</span>
                <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label="تسجيل الخروج"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
      )
    }
    

