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
import { BarChart3, Users, BookOpen, Calendar, LogOut, Activity, Heart } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation" // قم بتعديل هذا السطرimport { Logo } from "../ui/logo"
import { Logo } from "../ui/logo"

const preacherMenuItems = [
  {
    title: "لوحة التحكم",
    url: "/dashboard",
    icon: BarChart3,
  },
  {
    title: "المستفيدون المكلفون",
    url: "/dashboard/beneficiaries",
    icon: Users,
  },
  {
    title: "مقارئي الشخصية",
    url: "/dashboard/maqari",
    icon: BookOpen,
  },
]

const activitiesMenuItems = [
  {
    title: "جميع الأنشطة",
    url: "/dashboard/activities",
    icon: Calendar,
  },
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
    <Sidebar className="bg-gradient-to-b from-white to-blue-50/50 border-r border-blue-100">
      <SidebarHeader className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="px-2 py-3">
          <Logo />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-blue-700 font-semibold">الرئيسية</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {preacherMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.url} 
                    tooltip={item.title}
                    className="hover:bg-gradient-to-r hover:from-blue-100 hover:to-purple-100 data-[active=true]:bg-gradient-to-r data-[active=true]:from-blue-200 data-[active=true]:to-purple-200 data-[active=true]:text-blue-800 transition-all duration-200"
                  >
                    <Link href={item.url}>
                      <item.icon className="text-blue-600" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="bg-blue-200" />

        <SidebarGroup>
          <SidebarGroupLabel className="text-blue-700 font-semibold">الأنشطة والفعاليات</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {activitiesMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.url} 
                    tooltip={item.title}
                    className="hover:bg-gradient-to-r hover:from-blue-100 hover:to-purple-100 data-[active=true]:bg-gradient-to-r data-[active=true]:from-blue-200 data-[active=true]:to-purple-200 data-[active=true]:text-blue-800 transition-all duration-200"
                  >
                    <Link href={item.url}>
                      <item.icon className="text-blue-600" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-blue-100 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="relative">
            <Avatar className="h-10 w-10 ring-2 ring-blue-200">
              <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || ""} />
              <AvatarFallback className="gradient-bg-primary text-white font-semibold">
                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "د"}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -top-1 -right-1 h-4 w-4 gradient-bg-secondary rounded-full flex items-center justify-center">
              <Heart className="h-2 w-2 text-white" />
            </div>
          </div>
          <div className="flex flex-1 flex-col min-w-0">
            <span className="text-sm font-semibold text-blue-800 truncate">
              {user?.displayName || "الداعية"}
            </span>
            <span className="text-xs text-blue-600 truncate">{user?.email}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-9 w-9 text-blue-600 hover:text-blue-800 hover:bg-blue-100 transition-all duration-200"
            aria-label="تسجيل الخروج"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}