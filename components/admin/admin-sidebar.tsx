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
import { BarChart3, Users, UserCheck, Calendar, LogOut, Shield, TrendingUp, Activity } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Logo } from "../ui/logo"

const adminMenuItems = [
  { title: "لوحة التحكم", url: "/admin", icon: BarChart3 },
  { title: "إدارة المستخدمين", url: "/admin/users", icon: Shield },
]

const analyticsMenuItems = [
  { title: "نظرة عامة", url: "/admin/analytics", icon: TrendingUp },
  { title: "الموظفون", url: "/admin/analytics/preachers", icon: UserCheck },
  { title: "المستفيدون", url: "/admin/analytics/beneficiaries", icon: Users },
  { title: "الأنشطة", url: "/admin/analytics/activities", icon: Activity },
]

const managementMenuItems = [
  { title: "المستفيدون", url: "/admin/beneficiaries", icon: Users },
  { title: "الأنشطة", url: "/admin/activities", icon: Calendar },
]

export function AdminSidebar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/')
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  return (
    <Sidebar className="bg-sidebar border-r border-border">
      <SidebarHeader className="border-b border-border bg-gradient-to-r from-secondary/10 to-background">
        <div className="px-2 py-3">
          <Logo />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary font-semibold">الرئيسية</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.url} 
                    tooltip={item.title}
                    className="hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent data-[active=true]:text-primary transition-all duration-200"
                  >
                    <Link href={item.url}>
                      <item.icon className="text-primary" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="bg-border/50" />

        {/* Analytics Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary font-semibold">التحليلات المتقدمة</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analyticsMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.url} 
                    tooltip={item.title}
                    className="hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent data-[active=true]:text-primary transition-all duration-200"
                  >
                    <Link href={item.url}>
                      <item.icon className="text-primary" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="bg-border/50" />

        {/* Management Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary font-semibold">الإدارة الشاملة</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.url} 
                    tooltip={item.title}
                    className="hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent data-[active=true]:text-primary transition-all duration-200"
                  >
                    <Link href={item.url}>
                      <item.icon className="text-primary" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border bg-gradient-to-r from-secondary/10 to-background">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="relative">
            <Avatar className="h-10 w-10 ring-2 ring-primary/20">
              <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || ""} />
              <AvatarFallback className="bg-primary text-white font-semibold">
                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "م"}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-secondary rounded-full flex items-center justify-center border-2 border-background">
              <Shield className="h-2 w-2 text-white" />
            </div>
          </div>
          <div className="flex flex-1 flex-col min-w-0">
            <span className="text-sm font-semibold text-foreground truncate">
              {user?.displayName || "المدير"}
            </span>
            <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-sidebar-accent transition-all duration-200"
            aria-label="تسجيل الخروج"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}