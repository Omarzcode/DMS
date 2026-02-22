"use client"

import { useMemo } from "react"
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
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
import { Activity } from "lucide-react"
import {
    format,
    subWeeks,
    startOfWeek,
    endOfWeek,
    eachWeekOfInterval,
} from "date-fns"
import type { DashboardData } from "@/hooks/use-dashboard-data"
import { getDateFromTimestamp } from "@/hooks/use-dashboard-data"

interface AttendanceTrendChartProps {
    data: DashboardData
}

export function AttendanceTrendChart({ data }: AttendanceTrendChartProps) {
    const chartData = useMemo(() => {
        const now = new Date()
        const weeks = eachWeekOfInterval({
            start: startOfWeek(subWeeks(now, 11)),
            end: startOfWeek(now),
        })

        return weeks.map((weekStart) => {
            const weekEnd = endOfWeek(weekStart)

            const weekRecords = data.attendance.filter((a) => {
                const d = getDateFromTimestamp(a.logged_at)
                return d >= weekStart && d <= weekEnd
            })

            const byType: Record<string, number> = {
                maqari: 0,
                events: 0,
                lessons: 0,
                sections: 0,
            }

            weekRecords.forEach((r) => {
                if (r.present && r.activity_type && byType[r.activity_type] !== undefined) {
                    byType[r.activity_type]++
                }
            })

            return {
                week: format(weekStart, "MMM d"),
                maqari: byType.maqari,
                events: byType.events,
                lessons: byType.lessons,
                sections: byType.sections,
                total: weekRecords.filter((r) => r.present).length,
            }
        })
    }, [data.attendance])

    if (data.loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-64 mt-1" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[300px] w-full" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-orange-600" />
                    Attendance Trends
                </CardTitle>
                <CardDescription>
                    Weekly attendance across all activity types (last 12 weeks)
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                className="stroke-border"
                            />
                            <XAxis dataKey="week" className="text-xs" />
                            <YAxis className="text-xs"                 dx={-20}
/>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "hsl(var(--background))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                }}
                            />
                            <Legend

                                // This function wraps the text and adds a left margin to it
                                formatter={(value) => (
                                    <span style={{ marginLeft: "4px", marginRight: "2px" }}>{value}</span>
                                )}
                            />                <Line
                                type="monotone"
                                dataKey="maqari"
                                stroke="hsl(210, 79%, 56%)"
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                name="Maqari"
                            />
                            <Line
                                type="monotone"
                                dataKey="events"
                                stroke="hsl(262, 83%, 58%)"
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                name="Events"
                            />
                            <Line
                                type="monotone"
                                dataKey="lessons"
                                stroke="hsl(142, 76%, 36%)"
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                name="Lessons"
                            />
                            <Line
                                type="monotone"
                                dataKey="sections"
                                stroke="hsl(38, 92%, 50%)"
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                name="Sections"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}