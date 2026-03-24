"use client"

import { useMemo } from "react"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
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
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Users } from "lucide-react"
import type { DashboardData } from "@/hooks/use-dashboard-data"

interface PreacherPerformanceChartProps {
    data: DashboardData
}

export function PreacherPerformanceChart({
    data,
}: PreacherPerformanceChartProps) {
    const chartData = useMemo(() => {
        const activePreachers = data.preachers.filter(
            (p) => p.role === "da'i"
        )

        return activePreachers
            .map((preacher) => {
                const beneficiaryCount = data.beneficiaries.filter(
                    (b) => b.da_i_id === preacher.id
                ).length

                const attendanceRecords = data.attendance.filter((a) => {
                    const ben = data.beneficiaries.find(
                        (b) =>
                            b.id === a.beneficiary_id && b.da_i_id === preacher.id
                    )
                    return !!ben && a.present
                }).length

                const advancedStages = [
                    "Committed Learner",
                    
                ]
                const advancedCount = data.beneficiaries.filter(
                    (b) =>
                        b.da_i_id === preacher.id &&
                        advancedStages.includes(b.da_wa_stage)
                ).length

                // Truncate name for Y-axis display
                const displayName =
                    preacher.name.length > 16
                        ? preacher.name.slice(0, 16) + "…"
                        : preacher.name

                return {
                    name: displayName,
                    fullName: preacher.name,
                    beneficiaries: beneficiaryCount,
                    attendance: attendanceRecords,
                    advanced: advancedCount,
                    total: beneficiaryCount + attendanceRecords + advancedCount,
                }
            })
            .sort((a, b) => b.beneficiaries - a.beneficiaries)
    }, [data])

    // Dynamic chart height based on number of preachers
    const chartHeight = useMemo(() => {
        const minHeight = 300
        const perBar = 50
        return Math.max(minHeight, chartData.length * perBar)
    }, [chartData])

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
                        <Users className="h-5 w-5 text-indigo-600" />
                        Preacher Performance
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-8">
                        No preacher data available.
                    </p>
                </CardContent>
            </Card>
        )
    }

    // Custom tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.length) return null

        const preacherData = payload[0]?.payload
        if (!preacherData) return null

        return (
            <div className="rounded-lg border bg-background p-3 shadow-lg min-w-[180px]">
                <p className="font-medium text-sm mb-2 border-b pb-2">
                    {preacherData.fullName}
                </p>
                <div className="space-y-1.5">
                    {payload.map((entry: any, index: number) => (
                        <div
                            key={index}
                            className="flex items-center justify-between gap-4 text-xs"
                        >
                            <div className="flex items-center gap-1.5">
                                <div
                                    className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
                                    style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-muted-foreground">
                                    {entry.name}
                                </span>
                            </div>
                            <span className="font-medium tabular-nums">
                                {entry.value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-indigo-600" />
                            Preacher Performance
                        </CardTitle>
                        <CardDescription>
                            Beneficiaries, attendance, and advanced stage counts per
                            preacher
                        </CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                        {chartData.length} preachers
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                {/* Horizontal bar chart — scales with number of preachers */}
                <div
                    className="w-full overflow-y-auto"
                    style={{ maxHeight: "500px" }}
                >
                    <div style={{ height: `${chartHeight}px`, minHeight: "300px" }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartData}
                                layout="vertical"
                                margin={{ left: 10, right: 20, top: 10, bottom: 10 }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    className="stroke-border"
                                    horizontal={false}
                                />
                                <XAxis
                                    type="number"
                                    className="text-xs"
                                    tick={{ fontSize: 10 }}
                                    tickMargin={10}
                                    allowDecimals={false}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    className="text-xs"
                                    width={130}
                                    tick={{ fontSize: 10 }}
                                    tickMargin={80}
                                    interval={0}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    wrapperStyle={{
                                        fontSize: "11px",
                                        paddingTop: "12px",
                                    }}
                                    // This function wraps the text and adds a left margin to it
                                    formatter={(value) => (
                                    <span style={{ marginLeft: "4px", marginRight: "4px" }}>{value}</span>
                                )}
                                />
                                <Bar
                                    dataKey="beneficiaries"
                                    fill="hsl(var(--primary))"
                                    name="Beneficiaries"
                                    radius={[0, 4, 4, 0]}
                                    maxBarSize={20}
                                />
                                <Bar
                                    dataKey="attendance"
                                    fill="hsl(142, 76%, 36%)"
                                    name="Attendance"
                                    radius={[0, 4, 4, 0]}
                                    maxBarSize={20}
                                />
                                <Bar
                                    dataKey="advanced"
                                    fill="hsl(38, 92%, 50%)"
                                    name="Advanced"
                                    radius={[0, 4, 4, 0]}
                                    maxBarSize={20}

                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Summary cards for top performers */}
                {chartData.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-3">
                            Top Performers
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                            {chartData.slice(0, 4).map((preacher) => (
                                <div
                                    key={preacher.fullName}
                                    className="p-3 rounded-lg bg-muted/50 border border-border/50"
                                >
                                    <p
                                        className="text-xs font-medium truncate mb-1"
                                        title={preacher.fullName}
                                    >
                                        {preacher.fullName}
                                    </p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xl font-bold">
                                            {preacher.beneficiaries}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                            beneficiaries
                                        </span>
                                    </div>
                                    <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                                        <span>{preacher.attendance} att.</span>
                                        <span>{preacher.advanced} adv.</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}