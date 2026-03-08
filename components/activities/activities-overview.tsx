"use client"

import { useState, useEffect, useCallback } from "react"
import { collection, getCountFromServer } from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BookOpen,
  Calendar,
  Users,
  Activity as ActivityIcon,
  RefreshCw,
  ArrowRight,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface TypeStats {
  count:    number
  loading:  boolean
}

interface OverviewStats {
  maqari:   TypeStats
  events:   TypeStats
  lessons:  TypeStats
  sections: TypeStats
}

interface ActivitiesOverviewProps {
  /**
   * Base path for the type sub-pages.
   * e.g. "/admin/activities" → links become "/admin/activities/events"
   *      "/dashboard/activities" → "/dashboard/activities/events"
   */
  basePath: string
  /** Heading shown above the cards */
  title?: string
  description?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPES = ["maqari", "events", "lessons", "sections"] as const
type ActivityType = typeof TYPES[number]

const TYPE_CONFIG: Record<
  ActivityType,
  {
    label:       string
    description: string
    icon:        React.ElementType
    color:       string
    bgColor:     string
    hoverBorder: string
  }
> = {
  maqari: {
    label:       "Maqra'a",
    description: "Personal recitation circles",
    icon:        BookOpen,
    color:       "text-blue-600 dark:text-blue-400",
    bgColor:     "bg-blue-50 dark:bg-blue-900/20",
    hoverBorder: "hover:border-blue-300 dark:hover:border-blue-700",
  },
  events: {
    label:       "Events",
    description: "Community & central events",
    icon:        Calendar,
    color:       "text-purple-600 dark:text-purple-400",
    bgColor:     "bg-purple-50 dark:bg-purple-900/20",
    hoverBorder: "hover:border-purple-300 dark:hover:border-purple-700",
  },
  lessons: {
    label:       "Lessons",
    description: "Educational classes & lessons",
    icon:        ActivityIcon,
    color:       "text-green-600 dark:text-green-400",
    bgColor:     "bg-green-50 dark:bg-green-900/20",
    hoverBorder: "hover:border-green-300 dark:hover:border-green-700",
  },
  sections: {
    label:       "Sections",
    description: "Study sections & group activities",
    icon:        Users,
    color:       "text-orange-600 dark:text-orange-400",
    bgColor:     "bg-orange-50 dark:bg-orange-900/20",
    hoverBorder: "hover:border-orange-300 dark:hover:border-orange-700",
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ActivitiesOverview({
  basePath,
  title = "Activities",
  description = "Select a category to view and manage activities.",
}: ActivitiesOverviewProps) {
  const [stats, setStats] = useState<OverviewStats>({
    maqari:   { count: 0, loading: true },
    events:   { count: 0, loading: true },
    lessons:  { count: 0, loading: true },
    sections: { count: 0, loading: true },
  })
  const [globalLoading, setGlobalLoading] = useState(true)
  const [error, setError]                 = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setGlobalLoading(true)
    setError(null)

    // Mark all as loading
    setStats({
      maqari:   { count: 0, loading: true },
      events:   { count: 0, loading: true },
      lessons:  { count: 0, loading: true },
      sections: { count: 0, loading: true },
    })

    try {
      const results = await Promise.all(
        TYPES.map(async (type) => {
          try {
            const snap = await getCountFromServer(collection(db, type))
            return { type, count: snap.data().count }
          } catch {
            return { type, count: 0 }
          }
        })
      )

      const newStats = { ...stats }
      results.forEach(({ type, count }) => {
        newStats[type] = { count, loading: false }
      })
      setStats(newStats)
    } catch (err) {
      console.error("Error fetching overview stats:", err)
      setError("Failed to load statistics.")
    } finally {
      setGlobalLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const total = TYPES.reduce(
    (sum, t) => sum + stats[t].count,
    0
  )

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {description}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchStats}
          disabled={globalLoading}
          aria-label="Refresh stats"
          title="Refresh"
        >
          <RefreshCw
            className={cn("h-4 w-4", globalLoading && "animate-spin")}
            aria-hidden="true"
          />
        </Button>
      </div>

      {/* ── Error ── */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive flex-1">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchStats}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Total banner ── */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold">
              {globalLoading ? (
                <Skeleton className="h-8 w-16 inline-block" />
              ) : (
                total
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              Total Activities Across All Types
            </div>
          </div>
          <Calendar
            className="h-10 w-10 text-primary/30"
            aria-hidden="true"
          />
        </CardContent>
      </Card>

      {/* ── Type cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TYPES.map((type) => {
          const config = TYPE_CONFIG[type]
          const stat   = stats[type]
          const Icon   = config.icon

          return (
            <Link
              key={type}
              href={`${basePath}/${type}`}
              className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
            >
              <Card
                className={cn(
                  "h-full cursor-pointer transition-all duration-200",
                  "hover:shadow-md",
                  config.hoverBorder
                )}
              >
                <CardHeader className="pb-2">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center mb-2",
                      config.bgColor
                    )}
                  >
                    <Icon
                      className={cn("h-5 w-5", config.color)}
                      aria-hidden="true"
                    />
                  </div>
                  <CardTitle className="text-base">
                    {config.label}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {config.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div>
                      {stat.loading ? (
                        <Skeleton className="h-8 w-12" />
                      ) : (
                        <span
                          className={cn(
                            "text-3xl font-bold",
                            config.color
                          )}
                        >
                          {stat.count}
                        </span>
                      )}
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {config.label}s
                      </div>
                    </div>
                    <ArrowRight
                      className={cn(
                        "h-5 w-5 transition-transform duration-200",
                        "group-hover:translate-x-1",
                        config.color
                      )}
                      aria-hidden="true"
                    />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}