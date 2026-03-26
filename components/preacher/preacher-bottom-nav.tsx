"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Users, BookOpen, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { title: "Dashboard",     url: "/dashboard",                icon: BarChart3    },
  { title: "Beneficiaries", url: "/dashboard/beneficiaries", icon: Users        },
  { title: "Maqari",        url: "/dashboard/maqari",        icon: BookOpen     },
  { title: "Activities",    url: "/dashboard/activities",    icon: CalendarDays },
]

export function PreacherBottomNav() {
  const pathname = usePathname()

  const isActive = (url: string) => {
    if (url === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(url)
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border safe-area-pb"
      aria-label="Mobile navigation"
    >
      <div className="flex items-end justify-around h-16 px-1">
        {navItems.map((item) => {
          const active = isActive(item.url)
          return (
            <Link
              key={item.url}
              href={item.url}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full py-2 px-1 min-w-0",
                "transition-colors duration-200",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              <div className={cn(
                "flex items-center justify-center w-12 h-7 rounded-full transition-all duration-200",
                active ? "bg-primary/15" : "bg-transparent"
              )}>
                <item.icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-all duration-200",
                    active ? "stroke-[2.5]" : "stroke-[1.75]"
                  )}
                  aria-hidden="true"
                />
              </div>
              <span className={cn(
                "text-[10px] leading-none truncate max-w-full transition-all duration-200",
                active ? "font-semibold" : "font-medium"
              )}>
                {item.title}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
