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
import { BarChart3, Users, BookOpen, Calendar, LogOut, Heart } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Logo } from "../ui/logo"

const preacherMenuItems = [
  { title: "لوحة التحكم", url: "/dashboard", icon: BarChart3 },
  { title: "المستفيدون المكلفون", url: "/dashboard/beneficiaries", icon: Users },
  { title: "مقارئي الشخصية", url: "/dashboard/maqari", icon: BookOpen },
]

const activitiesMenuItems = [
  { title: "جميع الأنشطة", url: "/dashboard/activities", icon: Calendar },
]

export function PreacherSidebar() {
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
    <Sidebar className="bg-background border-r border-border">
      {/* Header with subtle Olive/Sage wash */}
      <SidebarHeader className="border-b border-border bg-gradient-to-r from-secondary/10 to-background">
        <div className="px-2 py-3">
          <Logo />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary font-semibold">الرئيسية</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {preacherMenuItems.map((item) => (
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

        <SidebarGroup>
          <SidebarGroupLabel className="text-primary font-semibold">الأنشطة والفعاليات</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {activitiesMenuItems.map((item) => (
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

      {/* Footer with consistent theme */}
      <SidebarFooter className="border-t border-border bg-gradient-to-r from-secondary/10 to-background">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="relative">
            <Avatar className="h-10 w-10 ring-2 ring-primary/20">
              <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || ""} />
              <AvatarFallback className="bg-primary text-white font-semibold">
                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "د"}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-secondary rounded-full flex items-center justify-center">
              <Heart className="h-2 w-2 text-white" />
            </div>
          </div>
          <div className="flex flex-1 flex-col min-w-0">
            <span className="text-sm font-semibold text-foreground truncate">
              {user?.displayName || "الداعية"}
            </span>
            <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
            aria-label="تسجيل الخروج"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}