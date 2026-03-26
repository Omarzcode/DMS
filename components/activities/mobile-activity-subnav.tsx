"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { CalendarDays, BookOpen, Calendar, Activity, Users } from "lucide-react"

interface SubNavItem {
  title: string
  url: string
  icon: React.ElementType
}

function getSubItems(basePath: string): SubNavItem[] {
  return [
    { title: "Overview",  url: basePath,                  icon: CalendarDays },
    { title: "Maqra'a",   url: `${basePath}/maqari`,      icon: BookOpen     },
    { title: "Events",    url: `${basePath}/events`,      icon: Calendar     },
    { title: "Lessons",   url: `${basePath}/lessons`,     icon: Activity     },
    { title: "Sections",  url: `${basePath}/sections`,    icon: Users        },
  ]
}

interface MobileActivitySubNavProps {
  basePath: string
}

export function MobileActivitySubNav({ basePath }: MobileActivitySubNavProps) {
  const pathname = usePathname()
  const items = getSubItems(basePath)

  return (
    <div className="md:hidden -mx-4 px-4 border-b border-border bg-background">
      <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0 pt-1">
        {items.map((item) => {
          const active = pathname === item.url
          return (
            <Link
              key={item.url}
              href={item.url}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm font-medium rounded-t-lg transition-all duration-150 border-b-2 shrink-0",
                active
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {item.title}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
