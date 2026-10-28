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
  useSidebar,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  BarChart3,
  Users,
  BookOpen,
  Calendar,
  Activity,
  ChevronRight,
  Layers,
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

const preacherMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
  { title: "Assigned Beneficiaries", url: "/dashboard/beneficiaries", icon: Users },
  { title: "Quranic Readings", url: "/dashboard/maqari", icon: BookOpen },
]

const activitySubItems = [
  { title: "Overview", url: "/dashboard/activities", icon: Calendar },
  { title: "Maqra'a", url: "/dashboard/activities/maqari", icon: BookOpen },
  { title: "Events", url: "/dashboard/activities/events", icon: Calendar },
  { title: "Lessons", url: "/dashboard/activities/lessons", icon: Activity },
  { title: "Sections", url: "/dashboard/activities/sections", icon: Users },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function PreacherSidebar() {
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

  const activitiesOpen = pathname.startsWith("/dashboard/activities")

  return (
    <Sidebar side="left" dir="ltr" className="border-r border-sidebar-border/30">

      {/* ── Glass Header Card ── */}
      <SidebarHeader className="p-3 pb-2">
        <div className="flex items-center justify-between gap-2.5 p-2 rounded-2xl bg-card/40 dark:bg-card/25 border border-border/40 dark:border-white/[0.06] backdrop-blur-md shadow-2xs transition-all">
          <Link
            href="/dashboard"
            onClick={closeOnMobile}
            className="flex items-center gap-2.5 min-w-0 group/brand focus-visible:outline-none"
          >
            <div className="relative flex items-center justify-center p-1 rounded-xl bg-background/80 dark:bg-white/[0.04] border border-border/40 shadow-2xs group-hover/brand:border-primary/40 group-hover/brand:scale-105 transition-all">
              <Logo size={26} />
            </div>
            <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-foreground">EMS</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" title="Online" />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground/75 truncate">
                Preacher Portal
              </span>
            </div>
          </Link>
          <div className="group-data-[collapsible=icon]:hidden shrink-0">
            <ThemeToggleButton />
          </div>
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
              {preacherMenuItems.map((item) => {
                const isActive =
                  item.url === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.url)
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

        {/* ── Activities Section ── */}
        <SidebarGroup className="p-1">
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-2.5 py-1 mb-0.5">
            Activities
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              <Collapsible
                defaultOpen={activitiesOpen}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={activitiesOpen}
                      tooltip="All Activities"
                      className="w-full flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Layers className={cn("transition-colors shrink-0", activitiesOpen ? "text-primary" : "text-muted-foreground")} />
                        <span className="font-medium truncate">All Activities</span>
                      </div>
                      <ChevronRight
                        className={cn(
                          "ml-auto h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform duration-200 group-data-[collapsible=icon]:hidden",
                          "group-data-[state=open]/collapsible:rotate-90 group-data-[state=open]/collapsible:text-primary"
                        )}
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

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

      </SidebarContent>

      {/* ── Glass Footer Profile Card ── */}
      <SidebarFooter className="p-3 pt-2">
        <div className="p-2 rounded-2xl bg-card/40 dark:bg-card/25 border border-border/40 dark:border-white/[0.06] backdrop-blur-md shadow-2xs flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1.5 transition-all">
          <div className="relative shrink-0">
            <Avatar className="h-9 w-9 ring-1 ring-border/50">
              <AvatarImage
                src={user?.photoURL || ""}
                alt={user?.displayName || ""}
              />
              <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                {user?.displayName?.charAt(0) || "P"}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
          </div>
          <div className="flex flex-1 flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-xs font-semibold text-foreground truncate">
              {user?.displayName || "Preacher"}
            </span>
            <span className="text-[11px] text-muted-foreground/75 truncate">
              {user?.email}
            </span>
          </div>
          <div className="group-data-[collapsible=icon]:hidden shrink-0">
            <LogoutDialog onLogout={handleLogout} />
          </div>
        </div>
      </SidebarFooter>

    </Sidebar>
  )
}
