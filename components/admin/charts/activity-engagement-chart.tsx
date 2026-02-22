"use client"

import { useMemo } from "react"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell,
    ResponsiveContainer,
} from "recharts"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart3 } from "lucide-react"
import type { DashboardData } from "@/hooks/use-dashboard-data"

interface ActivityEngagementChartProps {
    data: DashboardData
}

const TYPE_COLORS: Record<string, string> = {
    maqari: "hsl(210, 79%, 56%)",
    events: "hsl(262, 83%, 58%)",
    lessons: "hsl(142, 76%, 36%)",
    sections: "hsl(38, 92%, 50%)",
}

const TYPE_LABELS: Record<string, string> = {
    maqari: "Maqra'a",
    events: "Event",
    lessons: "Lesson",
    sections: "Section",
}

export function ActivityEngagementChart({
    data,
}: ActivityEngagementChartProps) {
    const chartData = useMemo(() => {
        return data.activities.all
            .map((activity) => {
                const attendeeCount = data.attendance.filter(
                    (a) => a.activity_id === activity.id && a.present
                ).length

                return {
                    name:
                        activity.name.length > 20
                            ? activity.name.slice(0, 20) + "..."
                            : activity.name,
                    fullName: activity.name,
                    type: TYPE_LABELS[activity.type] || activity.type,
                    attendees: attendeeCount,
                    color: TYPE_COLORS[activity.type] || "hsl(var(--primary))",
                }
            })
            .sort((a, b) => b.attendees - a.attendees)
            .slice(0, 15) // Top 15
    }, [data])

    if (data.loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-64 mt-1" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[400px] w-full" />
                </CardContent>
            </Card>
        )
    }

    if (chartData.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-cyan-600" />
                        Activity Engagement
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-8">
                        No activity data available.
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-cyan-600" />
                    Activity Engagement
                </CardTitle>
                <CardDescription>
                    Top activities ranked by number of attendees
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            layout="vertical"
                            margin={{ left: 10 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                className="stroke-border"
                                horizontal={false}
                            />
                            <XAxis type="number" className="text-xs" />
                            <YAxis
                                type="category"
                                dataKey="name"
                                className="text-xs"
                                width={140}
                                tick={{ fontSize: 11 }}
                                dx={-60}
                                // Add this formatter
                                tickFormatter={(value) =>
                                    value.length > 10 ? `${value.substring(0, 10)}...` : value
                                }
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "hsl(var(--background))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                }}
                                formatter={(value: number, _: string, entry: any) => [
                                    `${value} attendees`,
                                    entry.payload.type,
                                ]}
                                labelFormatter={(_, payload) =>
                                    payload?.[0]?.payload?.fullName || ""
                                }
                            />
                            <Bar dataKey="attendees" radius={[0, 4, 4, 0]} maxBarSize={25}>
                                {chartData.map((entry, index) => (
                                    <Cell key={index} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}