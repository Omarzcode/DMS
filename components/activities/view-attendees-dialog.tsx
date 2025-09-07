"use client"

import { useState, useEffect } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, UserCheck } from "lucide-react"
import type { Activity, AttendanceRecord } from "@/lib/firestore-collections"

interface ViewAttendeesDialogProps {
  activity: Activity & { type: string }
  children: React.ReactNode
}

export function ViewAttendeesDialog({ activity, children }: ViewAttendeesDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [attendees, setAttendees] = useState<AttendanceRecord[]>([])

  useEffect(() => {
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
        const attendeesData = snapshot.docs.map(doc => doc.data() as AttendanceRecord)
        setAttendees(attendeesData);
      } catch (error) {
        console.error("Error fetching attendees:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchAttendees()
  }, [open, activity.id])

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
              <div key={record.beneficiary_id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{record.beneficiary_name}</span>
                </div>
                <Badge variant="secondary">
                  {new Date(record.logged_at).toLocaleDateString()}
                </Badge>
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