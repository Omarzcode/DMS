import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { TrendingUp } from "lucide-react"

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
  trendUp = true
}: StatsCardProps) {
  return (
    <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1 gradient-text-primary">{value}</p>
            {trend && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className={`h-3 w-3 ${!trendUp && 'rotate-180'}`} />
                {trend}
              </p>
            )}
          </div>
          <div className="p-2 sm:p-3 rounded-full bg-gradient-to-br from-purple-100 to-pink-100">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}