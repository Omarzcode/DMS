"use client"

import { useState, useEffect } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, Search, Plus, BookOpen, Users, ActivityIcon, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import type { Activity } from "@/lib/firestore-collections"
import { CreateActivityDialog } from "./create-activity-dialog"

const activityTypeLabels = {
  maqari: "Maqra'a",
  events: "Event",
  lessons: "Lesson",
  sections: "Section",
}

const activityTypeIcons = {
  maqari: BookOpen,
  events: Calendar,
  lessons: ActivityIcon,
  sections: Users,
}

export function AllActivities() {
  const { userRole } = useAuth()
  const [activities, setActivities] = useState<(Activity & { type: string })[]>([])
  const [filteredActivities, setFilteredActivities] = useState<(Activity & { type: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAllActivities()
  }, [])

  useEffect(() => {
    filterActivities()
  }, [activities, searchTerm, typeFilter])

  const fetchAllActivities = async () => {
    try {
      setLoading(true)

      // Fetch all activity types
      const [maqariSnapshot, eventsSnapshot, lessonsSnapshot, sectionsSnapshot] = await Promise.all([
        getDocs(collection(db, "maqari")),
        getDocs(collection(db, "events")),
        getDocs(collection(db, "lessons")),
        getDocs(collection(db, "sections")),
      ])

      const allActivities = [
        ...maqariSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), type: "maqari" })),
        ...eventsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), type: "events" })),
        ...lessonsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), type: "lessons" })),
        ...sectionsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), type: "sections" })),
      ] as (Activity & { type: string })[]

      // Sort by creation date (newest first)
      allActivities.sort((a, b) => {
        const dateA = new Date(a.created_at.seconds * 1000)
        const dateB = new Date(b.created_at.seconds * 1000)
        return dateB.getTime() - dateA.getTime()
      })

      setActivities(allActivities)
      setError(null)
    } catch (error) {
      console.error("Error fetching activities:", error)
      setError("Failed to load activities")
    } finally {
      setLoading(false)
    }
  }

  const filterActivities = () => {
    let filtered = activities

    if (searchTerm) {
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.creator_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (a.description && a.description.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((a) => a.type === typeFilter)
    }

    setFilteredActivities(filtered)
  }

  const handleActivityCreated = (newActivity: Activity) => {
    // We'll need to refetch to get the type, or we can pass it from the dialog
    fetchAllActivities()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          <h2 className="text-2xl font-bold">All Activities</h2>
          <Badge variant="secondary">{activities.length}</Badge>
        </div>
        {userRole === "admin" && (
          <CreateActivityDialog onActivityCreated={handleActivityCreated}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Activity
            </Button>
          </CreateActivityDialog>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search activities by name, creator, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="maqari">Maqari</SelectItem>
            <SelectItem value="events">Events</SelectItem>
            <SelectItem value="lessons">Lessons</SelectItem>
            <SelectItem value="sections">Sections</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Activities Grid */}
      {filteredActivities.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {activities.length === 0 ? "No activities found" : "No activities match your filters"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredActivities.map((activity) => {
            const IconComponent = activityTypeIcons[activity.type as keyof typeof activityTypeIcons]
            return (
              <Card key={`${activity.type}-${activity.id}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <IconComponent className="h-5 w-5" />
                      {activity.name}
                    </CardTitle>
                    <Badge variant={activity.type === "maqari" ? "secondary" : "default"}>
                      {activityTypeLabels[activity.type as keyof typeof activityTypeLabels]}
                    </Badge>
                  </div>
                  <CardDescription>Created by {activity.creator_name}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activity.description && <p className="text-sm text-muted-foreground">{activity.description}</p>}

                  {activity.event_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(activity.event_date.seconds * 1000), "PPP")}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>0 attendees</span>
                    </div>
                    <Button variant="outline" size="sm">
                      Log Attendance
                    </Button>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Created: {format(new Date(activity.created_at.seconds * 1000), "PPp")}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
