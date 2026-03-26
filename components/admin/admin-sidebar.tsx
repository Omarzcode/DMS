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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  BarChart3,
  Users,
  UserCheck,
  Calendar,
  Shield,
  Activity,
  Palette,
  BookOpen,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Logo } from "../ui/logo"
import { ThemeToggleButton } from "@/components/ui/theme-toggle"
import { LogoutDialog } from "@/components/ui/logout-dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

// ─── Nav data ─────────────────────────────────────────────────────────────────

const adminMenuItems = [
  { title: "Dashboard", url: "/admin", icon: BarChart3 },
  { title: "User Management", url: "/admin/users", icon: Shield },
]

const analyticsMenuItems = [
  { title: "Employees", url: "/admin/analytics/preachers", icon: UserCheck },
  { title: "Beneficiaries", url: "/admin/analytics/beneficiaries", icon: Users },
  { title: "Activities", url: "/admin/analytics/activities", icon: Activity },
]

const managementMenuItems = [
  { title: "Beneficiaries", url: "/admin/beneficiaries", icon: Users },
]

const activitySubItems = [
  { title: "Overview", url: "/admin/activities", icon: Calendar },
  { title: "Maqra'a", url: "/admin/activities/maqari", icon: BookOpen },
  { title: "Events", url: "/admin/activities/events", icon: Calendar },
  { title: "Lessons", url: "/admin/activities/lessons", icon: Activity },
  { title: "Sections", url: "/admin/activities/sections", icon: Users },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminSidebar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const { isMobile, setOpenMobile } = useSidebar()

  const handleLogout = async () => {
    await logout()
    router.push("/")
  }

  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false)
  }

  const activitiesOpen = pathname.startsWith("/admin/activities")

  return (
    <Sidebar side="left" dir="ltr" className="bg-sidebar border-r border-border">

      {/* ── Logo ── */}
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-1 py-2">
          <Logo size={32} />
          <span className="text-sm font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            EMS
          </span>
        </div>
      </SidebarHeader>

      {/* ── Theme toggle ── */}
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

        {/* ── Main ── */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary font-semibold">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url} onClick={closeOnMobile}>
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

        {/* ── Analytics ── */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary font-semibold">
            Analytics
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analyticsMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url} onClick={closeOnMobile}>
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

        {/* ── Management ── */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary font-semibold">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>

              {managementMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.url)}
                    tooltip={item.title}
                  >
                    <Link href={item.url} onClick={closeOnMobile}>
                      <item.icon className="text-primary" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* ── Activities collapsible ── */}
              <Collapsible
                defaultOpen={activitiesOpen}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={activitiesOpen} tooltip="All Activities" className="w-full flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="text-primary" />
                        <span>All Activities</span>
                      </div>
                      <ChevronRight className={cn("ml-auto h-4 w-4 transition-transform duration-200", "group-data-[state=open]/collapsible:rotate-90")} />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {activitySubItems.map((sub) => (
                        <SidebarMenuSubItem key={sub.url}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname === sub.url}
                          >
                            <Link href={sub.url} onClick={closeOnMobile}>
                              <sub.icon className="h-3.5 w-3.5" />
                              <span>{sub.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      {/* ── Footer ── */}
      <SidebarFooter>
        <div className="flex items-center gap-3 px-2 py-3 group-data-[collapsible=icon]:justify-center">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage
              src={user?.photoURL || ""}
              alt={user?.displayName || ""}
            />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {user?.displayName?.charAt(0) || "A"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-medium text-foreground truncate">
              {user?.displayName || "Administrator"}
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
