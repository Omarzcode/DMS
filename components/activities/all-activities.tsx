"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, query, where, getCountFromServer } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Search, Plus, BookOpen, Users, ActivityIcon } from "lucide-react"
import { format } from "date-fns"
import type { Activity as BaseActivity } from "@/lib/firestore-collections"

type Activity = BaseActivity & {
  description?: string
  creator_name: string
  name: string
  created_at?: { seconds: number }
}
import { CreateActivityDialog } from "./create-activity-dialog"
import { AttendanceDialog } from "./attendance-dialog"
import { ViewAttendeesDialog } from "./view-attendees-dialog" // تأكد من وجود هذا الاستيراد

const activityTypeLabels: { [key: string]: string } = { maqari: "Maqra'a", events: "Event", lessons: "Lesson", sections: "Section" }
const activityTypeIcons: { [key: string]: React.ElementType } = { maqari: BookOpen, events: Calendar, lessons: ActivityIcon, sections: Users }

export function AllActivities() {
  const [activities, setActivities] = useState<(Activity & { type: string })[]>([])
  const [attendanceCounts, setAttendanceCounts] = useState<Record<string, number>>({})
  const [filteredActivities, setFilteredActivities] = useState<(Activity & { type: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")

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

    } catch (error) { console.error("Error fetching activities:", error) } 
    finally { setLoading(false) }
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

  const handleAttendanceChange = (activityId: string, newCount: number) => {
    setAttendanceCounts(prevCounts => ({ ...prevCounts, [activityId]: newCount }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          <h2 className="text-2xl font-bold">All Activities</h2>
          <Badge variant="secondary">{activities.length}</Badge>
        </div>
        <CreateActivityDialog onActivityCreated={fetchAllActivities}>
          <Button> <Plus className="h-4 w-4 mr-2" /> Create Activity </Button>
        </CreateActivityDialog>
      </div>
      
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search activities..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Filter by type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(activityTypeLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredActivities.map((activity) => {
          const IconComponent = activityTypeIcons[activity.type] || Calendar;
          return (
            <Card key={`${activity.type}-${activity.id}`}>
              <CardHeader>
                <div className="flex items-center justify-between"><CardTitle className="text-lg flex items-center gap-2"><IconComponent className="h-5 w-5" />{activity.name}</CardTitle><Badge variant={activity.type === "maqari" ? "secondary" : "default"}>{activityTypeLabels[activity.type]}</Badge></div>
                <CardDescription>Created by {activity.creator_name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {activity.description && <p className="text-sm text-muted-foreground">{activity.description}</p>}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4" /><span>{attendanceCounts[activity.id] || 0} attendees</span></div>
                  <div className="flex items-center gap-2">
                    <ViewAttendeesDialog activity={activity} onAttendanceUpdated={handleAttendanceChange}><Button variant="secondary" size="sm" disabled={(attendanceCounts[activity.id] || 0) === 0}>View</Button></ViewAttendeesDialog>
                    <AttendanceDialog activity={activity} onAttendanceSaved={handleAttendanceChange}><Button variant="outline" size="sm">Log Attendance</Button></AttendanceDialog>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">Created: {activity.created_at ? format(new Date((activity.created_at as any).seconds * 1000), "PPp") : 'Unknown'}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
