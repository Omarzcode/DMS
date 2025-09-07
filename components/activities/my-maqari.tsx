"use client"

import { useState, useEffect } from "react"
import { collection, query, where, getDocs, doc, deleteDoc, getCountFromServer } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BookOpen, Search, Plus, Calendar, Users, Trash2, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import type { Activity } from "@/lib/firestore-collections"
import { CreateActivityDialog } from "./create-activity-dialog"
import { AttendanceDialog } from "./attendance-dialog"
import { ViewAttendeesDialog } from "./view-attendees-dialog"

export function MyMaqari() {
  const { user } = useAuth()
  const [maqari, setMaqari] = useState<Activity[]>([])
  const [attendanceCounts, setAttendanceCounts] = useState<Record<string, number>>({})
  const [filteredMaqari, setFilteredMaqari] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { if (user) { fetchMaqari() } }, [user])
  useEffect(() => { filterMaqari() }, [maqari, searchTerm, attendanceCounts])

  const fetchMaqari = async () => {
    if (!user) return
    setLoading(true)
    try {
      const q = query(collection(db, "maqari"), where("creator_id", "==", user.uid))
      const querySnapshot = await getDocs(q)
      const maqariData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Activity[]
      setMaqari(maqariData)

      const counts: Record<string, number> = {};
      for (const maqra of maqariData) {
        const attendanceQuery = query(collection(db, "attendance"), where("activity_id", "==", maqra.id), where("present", "==", true));
        const snapshot = await getCountFromServer(attendanceQuery);
        counts[maqra.id] = snapshot.data().count;
      }
      setAttendanceCounts(counts);

    } catch (error) {
      console.error("Error fetching maqari:", error)
      setError("Failed to load maqari")
    } finally {
      setLoading(false)
    }
  }

  const filterMaqari = () => {
    let filtered = maqari;
    if (searchTerm) {
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    setFilteredMaqari(filtered);
  }

  const handleMaqraCreated = () => { fetchMaqari() }

  const handleDeleteMaqra = async (maqraId: string) => {
    if (!confirm("Are you sure you want to delete this maqra'a? This action cannot be undone.")) return;
    try {
      setDeletingId(maqraId);
      await deleteDoc(doc(db, "maqari", maqraId));
      setMaqari((prev) => prev.filter((m) => m.id !== maqraId));
    } catch (error) {
      setError("Failed to delete maqra'a");
    } finally {
      setDeletingId(null);
    }
  }

  const handleAttendanceSaved = (activityId: string, newCount: number) => {
    setAttendanceCounts(prevCounts => ({ ...prevCounts, [activityId]: newCount }));
  };

  if (loading) { /* ... Skeleton code ... */ }
  if (error) { /* ... Error Alert code ... */ }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          <h2 className="text-2xl font-bold">My Maqari</h2>
          <Badge variant="secondary">{maqari.length}</Badge>
        </div>
        <CreateActivityDialog activityType="maqari" onActivityCreated={handleMaqraCreated}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Maqra'a
          </Button>
        </CreateActivityDialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search maqari..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Maqari Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredMaqari.map((maqra) => (
          <Card key={maqra.id}>
            <CardHeader>
              <CardTitle className="text-lg">{maqra.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between pt-2">
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <Users className="h-4 w-4" />
    <span>{attendanceCounts[maqra.id] || 0} attendees</span>
  </div>
  <div className="flex items-center gap-2">
      {/* الزر الجديد لعرض الحضور */}
      <ViewAttendeesDialog activity={{ ...maqra, type: 'maqari' }}>
        <Button variant="secondary" size="sm" disabled={(attendanceCounts[maqra.id] || 0) === 0}>View</Button>
      </ViewAttendeesDialog>

      {/* زر تسجيل الحضور الحالي */}
      <AttendanceDialog activity={{ ...maqra, type: 'maqari' }} onAttendanceSaved={handleAttendanceSaved}>
        <Button variant="outline" size="sm">Manage</Button>
      </AttendanceDialog>
  </div>
</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}