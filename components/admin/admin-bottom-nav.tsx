"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Users, CalendarDays, TrendingUp, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { title: "Dashboard",      url: "/admin",                         icon: BarChart3   },
  { title: "Beneficiaries",  url: "/admin/beneficiaries",           icon: Users       },
  { title: "Activities",     url: "/admin/activities",              icon: CalendarDays },
  { title: "Analytics",      url: "/admin/analytics/preachers",     icon: TrendingUp  },
  { title: "Users",          url: "/admin/users",                   icon: Shield      },
]

export function AdminBottomNav() {
  const pathname = usePathname()

  const isActive = (url: string) => {
    if (url === "/admin") return pathname === "/admin"
    if (url.startsWith("/admin/analytics")) return pathname.startsWith("/admin/analytics")
    return pathname.startsWith(url)
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border safe-area-pb"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const active = isActive(item.url)
          return (
            <Link
              key={item.url}
              href={item.url}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full px-1 min-w-0",
                "transition-colors duration-150",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              <item.icon
                className={cn("h-5 w-5 shrink-0", active && "stroke-[2.5]")}
                aria-hidden="true"
              />
              <span className="text-[10px] font-medium leading-none truncate max-w-full">
                {item.title}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
