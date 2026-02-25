import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon, TrendingUp } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: string
  trendUp?: boolean
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp = true,
}: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {trend && (
              <p
                className={`text-xs mt-1 flex items-center gap-1 ${
                  trendUp ? "text-green-600" : "text-red-600"
                }`}
              >
                <TrendingUp
                  className={`h-3 w-3 ${!trendUp && "rotate-180"}`}
                />
                {trend}
              </p>
            )}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}