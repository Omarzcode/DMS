"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, query, where, getCountFromServer } from "firebase/firestore"
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
import { AttendanceDialog } from "./attendance-dialog"
import { ViewAttendeesDialog } from "./view-attendees-dialog"

const activityTypeLabels: { [key: string]: string } = { maqari: "Maqra'a", events: "Event", lessons: "Lesson", sections: "Section" }
const activityTypeIcons: { [key: string]: React.ElementType } = { maqari: BookOpen, events: Calendar, lessons: ActivityIcon, sections: Users }

export function AllActivities() {
  const [activities, setActivities] = useState<(Activity & { type: string })[]>([])
  const [attendanceCounts, setAttendanceCounts] = useState<Record<string, number>>({})
  const [filteredActivities, setFilteredActivities] = useState<(Activity & { type: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [error, setError] = useState<string | null>(null)

  const fetchAllActivities = async () => {
    try {
      setLoading(true)
      const activityTypes = ["maqari", "events", "lessons", "sections"];
      const snapshots = await Promise.all(activityTypes.map(type => getDocs(collection(db, type))));

      const allActivities = snapshots.flatMap((snapshot, index) => 
        snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, type: activityTypes[index] }))
      ) as (Activity & { type: string })[];

      allActivities.sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0));
      setActivities(allActivities);

      const counts: Record<string, number> = {};
      for (const activity of allActivities) {
        const attendanceQuery = query(collection(db, "attendance"), where("activity_id", "==", activity.id), where("present", "==", true));
        const snapshot = await getCountFromServer(attendanceQuery);
        counts[activity.id] = snapshot.data().count;
      }
      setAttendanceCounts(counts);

    } catch (error) {
      console.error("Error fetching activities:", error)
      setError("Failed to load activities")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAllActivities() }, [])
  useEffect(() => {
    let filtered = activities;
    if (searchTerm) {
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.creator_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.description && a.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (typeFilter !== "all") {
      filtered = filtered.filter(a => a.type === typeFilter);
    }
    setFilteredActivities(filtered);
  }, [activities, searchTerm, typeFilter, attendanceCounts])

  const handleActivityCreated = () => { fetchAllActivities() }
  const handleAttendanceSaved = (activityId: string, newCount: number) => {
    setAttendanceCounts(prevCounts => ({ ...prevCounts, [activityId]: newCount }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="h-6 w-6" />
          <h2 className="text-xl sm:text-2xl font-bold truncate">All Activities</h2>
          <Badge variant="secondary">{activities.length}</Badge>
        </div>
        <div className="w-full sm:w-auto">
          <CreateActivityDialog onActivityCreated={handleActivityCreated}>
            <Button className="w-full sm:w-auto"> 
              <Plus className="h-4 w-4 mr-2" /> 
              Create Activity 
            </Button>
          </CreateActivityDialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search activities..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="pl-10 h-10 sm:h-11" 
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(activityTypeLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredActivities.map((activity) => {
          const IconComponent = activityTypeIcons[activity.type] || Calendar;
          return (
            <Card key={`${activity.type}-${activity.id}`} className="card-responsive">
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2 min-w-0">
                    <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <span className="truncate">{activity.name}</span>
                  </CardTitle>
                  <Badge 
                    variant={activity.type === "maqari" ? "secondary" : "default"}
                    className="text-xs flex-shrink-0"
                  >
                    {activityTypeLabels[activity.type]}
                  </Badge>
                </div>
                <CardDescription className="truncate">Created by {activity.creator_name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-4 sm:p-6 pt-0">
                {activity.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                    {activity.description}
                  </p>
                )}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>{attendanceCounts[activity.id] || 0} attendees</span>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <ViewAttendeesDialog activity={activity}>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        disabled={(attendanceCounts[activity.id] || 0) === 0}
                        className="flex-1 sm:flex-none text-xs"
                      >
                        View
                      </Button>
                    </ViewAttendeesDialog>
                    <AttendanceDialog activity={activity} onAttendanceSaved={handleAttendanceSaved}>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1 sm:flex-none text-xs"
                      >
                        Log Attendance
                      </Button>
                    </AttendanceDialog>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  Created: {activity.created_at ? format(new Date(activity.created_at.seconds * 1000), "PPp") : 'Unknown'}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}