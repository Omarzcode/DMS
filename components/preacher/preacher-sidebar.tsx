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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BarChart3, Users, BookOpen, Calendar, Palette } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Logo } from "../ui/logo"
import { ThemeToggleButton } from "@/components/ui/theme-toggle"
import { LogoutDialog } from "@/components/ui/logout-dialog"

const preacherMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
  { title: "Assigned Beneficiaries", url: "/dashboard/beneficiaries", icon: Users },
  { title: "Quranic Readings", url: "/dashboard/maqari", icon: BookOpen },
]

const activitiesMenuItems = [
  { title: "All Activities", url: "/dashboard/activities", icon: Calendar },
]

export function PreacherSidebar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push("/")
  }

  return (
    <Sidebar side="left" dir="ltr" className="bg-sidebar border-r border-border">
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-1 py-2">
          <Logo size={32} />
          <span className="text-sm font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            EMS
          </span>
        </div>
      </SidebarHeader>

      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">
            Theme
          </span>
        </div>
        <ThemeToggleButton />
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary font-semibold">Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {preacherMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                    <Link href={item.url}>
                      <item.icon className="text-primary" />
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
          <SidebarGroupLabel className="text-primary font-semibold">Activities</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {activitiesMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                    <Link href={item.url}>
                      <item.icon className="text-primary" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-3 px-2 py-3 group-data-[collapsible=icon]:justify-center">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || ""} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {user?.displayName?.charAt(0) || "P"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-medium text-foreground truncate">
              {user?.displayName || "Preacher"}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {user?.email}
            </span>
          </div>
          <LogoutDialog onLogout={handleLogout} />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}