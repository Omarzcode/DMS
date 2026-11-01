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
  SidebarRail,
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
  BookOpen,
  ChevronRight,
  Layers,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Logo } from "../ui/logo"
import { ThemeToggleButton } from "@/components/ui/theme-toggle"
import { LogoutDialog } from "@/components/ui/logout-dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
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

const managementMenuItems = [
  { title: "Beneficiaries", url: "/admin/beneficiaries", icon: Users },
]

const activitySubItems = [
  { title: "Maqra'a", url: "/admin/activities/maqari", icon: BookOpen },
  { title: "Events", url: "/admin/activities/events", icon: Calendar },
  { title: "Lessons", url: "/admin/activities/lessons", icon: Activity },
  { title: "Sections", url: "/admin/activities/sections", icon: Users },
]

const analyticsMenuItems = [
  { title: "Employees", url: "/admin/analytics/preachers", icon: UserCheck },
  { title: "Beneficiaries", url: "/admin/analytics/beneficiaries", icon: Users },
  { title: "Activities", url: "/admin/analytics/activities", icon: Activity },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminSidebar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const { isMobile, setOpenMobile, state, toggleSidebar } = useSidebar()
  const isCollapsed = state === "collapsed"

  const handleLogout = async () => {
    await logout()
    router.push("/")
  }

  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false)
  }

  const activitiesOpen = pathname.startsWith("/admin/activities")

  return (
    <Sidebar side="left" dir="ltr" collapsible="offcanvas" className="border-r border-sidebar-border/30">

      {/* ── Glass Header Card ── */}
      <SidebarHeader className="p-3 pb-2 group-data-[collapsible=icon]:p-1.5 group-data-[collapsible=icon]:items-center">
        <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center gap-2.5 p-2 group-data-[collapsible=icon]:p-0 rounded-2xl bg-card/40 dark:bg-card/25 border border-border/40 dark:border-white/[0.06] backdrop-blur-md shadow-2xs group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:shadow-none transition-all w-full">
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  aria-label="Expand sidebar"
                  className="flex items-center justify-center size-9 rounded-xl bg-card/60 dark:bg-card/40 border border-border/60 dark:border-white/10 shadow-2xs hover:border-primary/50 hover:bg-primary/10 active:scale-95 transition-all cursor-pointer group/brand"
                >
                  <Logo size={22} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <span className="font-semibold">Expand Sidebar</span>
                <span className="text-muted-foreground block text-[10px]">EMS Admin Portal</span>
              </TooltipContent>
            </Tooltip>
          ) : (
            <>
              <Link
                href="/admin"
                onClick={closeOnMobile}
                className="flex items-center gap-2.5 min-w-0 group/brand focus-visible:outline-none"
              >
                <div className="relative flex items-center justify-center p-1 rounded-xl bg-background/80 dark:bg-white/[0.04] border border-border/40 shadow-2xs group-hover/brand:border-primary/40 group-hover/brand:scale-105 transition-all">
                  <Logo size={26} />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold tracking-tight text-foreground">EMS</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" title="Admin Active" />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground/75 truncate">
                    Admin Portal
                  </span>
                </div>
              </Link>
              <div className="shrink-0">
                <ThemeToggleButton />
              </div>
            </>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2 space-y-3">

        {/* ── Main Section ── */}
        <SidebarGroup className="p-1">
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-2.5 py-1 mb-0.5">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {adminMenuItems.map((item) => {
                const isActive = pathname === item.url
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link href={item.url} onClick={closeOnMobile}>
                        <item.icon className={cn("transition-colors", isActive ? "text-primary" : "text-muted-foreground")} />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Management Section ── */}
        <SidebarGroup className="p-1">
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-2.5 py-1 mb-0.5">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {managementMenuItems.map((item) => {
                const isActive = pathname.startsWith(item.url)
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link href={item.url} onClick={closeOnMobile}>
                        <item.icon className={cn("transition-colors", isActive ? "text-primary" : "text-muted-foreground")} />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}

              {/* ── Activities Collapsible ── */}
              <Collapsible
                defaultOpen={activitiesOpen}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <div
                    className={cn(
                      "flex items-center justify-between w-full rounded-lg transition-all duration-200 h-9",
                      activitiesOpen
                        ? "bg-primary/12 font-medium text-primary dark:bg-primary/20 relative before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-[2.5px] before:rounded-full before:bg-primary group-data-[collapsible=icon]:before:hidden"
                        : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground text-sidebar-foreground"
                    )}
                  >
                    {isCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href="/admin/activities"
                            onClick={closeOnMobile}
                            className="flex items-center justify-center w-full h-full p-2"
                            aria-label="Activities"
                          >
                            <Layers className={cn("h-4 w-4 shrink-0 transition-colors", activitiesOpen ? "text-primary" : "text-muted-foreground")} />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          Activities
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <>
                        <Link
                          href="/admin/activities"
                          onClick={closeOnMobile}
                          className="flex items-center gap-2.5 min-w-0 flex-1 h-full px-2.5 py-1.5"
                          title="Activities"
                        >
                          <Layers className={cn("h-4 w-4 shrink-0 transition-colors", activitiesOpen ? "text-primary" : "text-muted-foreground")} />
                          <span className="text-sm font-medium truncate">
                            Activities
                          </span>
                        </Link>
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            aria-label="Toggle activities sub-menu"
                            className="h-7 w-7 mr-1 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground/70 hover:text-foreground transition-all duration-200 shrink-0"
                          >
                            <ChevronRight
                              className={cn(
                                "h-3.5 w-3.5 transition-transform duration-200",
                                "group-data-[state=open]/collapsible:rotate-90 group-data-[state=open]/collapsible:text-primary"
                              )}
                            />
                          </button>
                        </CollapsibleTrigger>
                      </>
                    )}
                  </div>

                  <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200">
                    <SidebarMenuSub className="my-1.5 ml-3.5 border-l border-border/40 pl-2.5 space-y-1">
                      {activitySubItems.map((sub) => {
                        const isSubActive = pathname === sub.url
                        return (
                          <SidebarMenuSubItem key={sub.url}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isSubActive}
                            >
                              <Link href={sub.url} onClick={closeOnMobile}>
                                <sub.icon className={cn("h-3.5 w-3.5 transition-colors", isSubActive ? "text-primary" : "text-muted-foreground")} />
                                <span>{sub.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Analytics Section ── */}
        <SidebarGroup className="p-1">
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-2.5 py-1 mb-0.5">
            Analytics
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {analyticsMenuItems.map((item) => {
                const isActive = pathname === item.url
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link href={item.url} onClick={closeOnMobile}>
                        <item.icon className={cn("transition-colors", isActive ? "text-primary" : "text-muted-foreground")} />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      {/* ── Glass Footer Profile Card ── */}
      <SidebarFooter className="p-3 pt-2 group-data-[collapsible=icon]:p-1.5 group-data-[collapsible=icon]:items-center">
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative flex items-center justify-center size-9 rounded-xl hover:bg-sidebar-accent/80 transition-all cursor-pointer">
                <Avatar className="h-8 w-8 ring-1 ring-border/60">
                  <AvatarImage
                    src={user?.photoURL || ""}
                    alt={user?.displayName || ""}
                  />
                  <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                    {user?.displayName?.charAt(0) || "A"}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-1.5 ring-background" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <div className="text-xs font-semibold">{user?.displayName || "Administrator"}</div>
              <div className="text-[10px] text-muted-foreground">{user?.email}</div>
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="p-2 rounded-2xl bg-card/40 dark:bg-card/25 border border-border/40 dark:border-white/[0.06] backdrop-blur-md shadow-2xs flex items-center gap-2.5 transition-all">
            <div className="relative shrink-0">
              <Avatar className="h-9 w-9 ring-1 ring-border/50">
                <AvatarImage
                  src={user?.photoURL || ""}
                  alt={user?.displayName || ""}
                />
                <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                  {user?.displayName?.charAt(0) || "A"}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
            </div>
            <div className="flex flex-1 flex-col min-w-0">
              <span className="text-xs font-semibold text-foreground truncate">
                {user?.displayName || "Administrator"}
              </span>
              <span className="text-[11px] text-muted-foreground/75 truncate">
                {user?.email}
              </span>
            </div>
            <div className="shrink-0">
              <LogoutDialog onLogout={handleLogout} />
            </div>
          </div>
        )}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
