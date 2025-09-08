"use client"

import { useState, useEffect } from "react"
import { collection, query, where, getDocs, doc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, UserCheck, Trash2 } from "lucide-react"
import type { Activity, AttendanceRecord } from "@/lib/firestore-collections"
import { format } from "date-fns"

interface ViewAttendeesDialogProps {
  activity: Activity & { type: string }
  children: React.ReactNode
  onAttendanceUpdated?: (activityId: string, newCount: number) => void
}

export function ViewAttendeesDialog({ activity, children, onAttendanceUpdated }: ViewAttendeesDialogProps) {
  const { userRole } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [attendees, setAttendees] = useState<AttendanceRecord[]>([])

  const fetchAttendees = async () => {
    if (!open) return
    setLoading(true)
    try {
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("activity_id", "==", activity.id),
        where("present", "==", true)
      );
      const snapshot = await getDocs(attendanceQuery);
      const attendeesData = snapshot.docs.map(doc => ({...doc.data(), id: doc.id }) as AttendanceRecord)
      setAttendees(attendeesData);
    } catch (error) {
      console.error("Error fetching attendees:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAttendees()
  }, [open, activity.id])

  const handleRemoveAttendance = async (recordId: string) => {
    if (window.confirm("Are you sure you want to remove this attendance record?")) {
        try {
            await deleteDoc(doc(db, "attendance", recordId));
            const updatedAttendees = attendees.filter(att => att.id !== recordId);
            setAttendees(updatedAttendees);
            // Notify parent component to update the count
            onAttendanceUpdated?.(activity.id, updatedAttendees.length);
        } catch (error) {
            console.error("Error removing attendance:", error);
            alert("Failed to remove attendance record.");
        }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Attendees for "{activity.name}"</DialogTitle>
          <DialogDescription>
            A list of beneficiaries who attended this activity.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto pr-2 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : attendees.length > 0 ? (
            attendees.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{record.beneficiary_name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                        {(record.logged_at as any)?.toDate ? format((record.logged_at as any).toDate(), "PP") : ''}
                    </Badge>
                    {userRole === "admin" && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => handleRemoveAttendance(record.id)}>
                            <Trash2 className="h-4 w-4"/>
                        </Button>
                    )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">No attendees recorded for this activity yet.</p>
          )}
        </div>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Close
        </Button>
      </DialogContent>
    </Dialog>
  )
}
