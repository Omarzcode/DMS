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
import { usePathname, useRouter } from "next/navigation" // قم بتعديل هذا السطرimport { Logo } from "@/components/ui/logo"
import { Logo } from "../ui/logo"

const adminMenuItems = [
  {
    title: "لوحة التحكم",
    url: "/admin",
    icon: BarChart3,
  },
  {
    title: "إدارة المستخدمين",
    url: "/admin/users",
    icon: Shield,
  },
]

const analyticsMenuItems = [
  {
    title: "نظرة عامة",
    url: "/admin/analytics",
    icon: TrendingUp,
  },
  {
    title: "الموظفون",
    url: "/admin/analytics/preachers",
    icon: UserCheck,
  },
  {
    title: "المستفيدون",
    url: "/admin/analytics/beneficiaries",
    icon: Users,
  },
  {
    title: "الأنشطة",
    url: "/admin/analytics/activities",
    icon: Activity,
  },
]

const managementMenuItems = [
  {
    title: "المستفيدون",
    url: "/admin/beneficiaries",
    icon: Users,
  },
  {
    title: "الأنشطة",
    url: "/admin/activities",
    icon: Calendar,
  },
  
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
    <Sidebar className="bg-gradient-to-b from-white to-purple-50/50 border-r border-purple-100">
      <SidebarHeader className="border-b border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="px-2 py-3">
          <Logo />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-purple-700 font-semibold">الرئيسية</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.url} 
                    tooltip={item.title}
                    className="hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100 data-[active=true]:bg-gradient-to-r data-[active=true]:from-purple-200 data-[active=true]:to-pink-200 data-[active=true]:text-purple-800 transition-all duration-200"
                  >
                    <Link href={item.url}>
                      <item.icon className="text-purple-600" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="bg-purple-200" />

        <SidebarGroup>
          <SidebarGroupLabel className="text-purple-700 font-semibold">التحليلات المتقدمة</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analyticsMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.url} 
                    tooltip={item.title}
                    className="hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100 data-[active=true]:bg-gradient-to-r data-[active=true]:from-purple-200 data-[active=true]:to-pink-200 data-[active=true]:text-purple-800 transition-all duration-200"
                  >
                    <Link href={item.url}>
                      <item.icon className="text-purple-600" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="bg-purple-200" />

        <SidebarGroup>
          <SidebarGroupLabel className="text-purple-700 font-semibold">الإدارة الشاملة</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.url} 
                    tooltip={item.title}
                    className="hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100 data-[active=true]:bg-gradient-to-r data-[active=true]:from-purple-200 data-[active=true]:to-pink-200 data-[active=true]:text-purple-800 transition-all duration-200"
                  >
                    <Link href={item.url}>
                      <item.icon className="text-purple-600" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="relative">
            <Avatar className="h-10 w-10 ring-2 ring-purple-200">
              <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || ""} />
              <AvatarFallback className="gradient-bg-primary text-white font-semibold">
                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "م"}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -top-1 -right-1 h-4 w-4 gradient-bg-secondary rounded-full flex items-center justify-center">
              <Shield className="h-2 w-2 text-white" />
            </div>
          </div>
          <div className="flex flex-1 flex-col min-w-0">
            <span className="text-sm font-semibold text-purple-800 truncate">
              {user?.displayName || "المدير"}
            </span>
            <span className="text-xs text-purple-600 truncate">{user?.email}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-9 w-9 text-purple-600 hover:text-purple-800 hover:bg-purple-100 transition-all duration-200"
            aria-label="تسجيل الخروج"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}