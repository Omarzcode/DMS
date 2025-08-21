"use client"

import { useState, useEffect } from "react"
import { AuthGuard } from "@/components/auth/auth-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar, Users, Search, CheckCircle, Clock } from "lucide-react"
import { collection, query, where, onSnapshot, addDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"

interface Activity {
  id: string
  title: string
  type: "event" | "lesson" | "section" | "maqari"
  date: Date
  status: "upcoming" | "ongoing" | "completed"
  createdBy: string
}

interface Beneficiary {
  id: string
  name: string
  phone: string
  assignedPreacher: string
}

interface AttendanceRecord {
  activityId: string
  beneficiaryId: string
  present: boolean
  loggedBy: string
  loggedAt: Date
}

export default function AttendancePage() {
  const { user } = useAuth()
  const [activities, setActivities] = useState<Activity[]>([])
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [selectedActivity, setSelectedActivity] = useState<string>("")
  const [attendance, setAttendance] = useState<Record<string, boolean>>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return

    // Load activities (both central activities and user's maqari)
    const activitiesQuery = query(collection(db, "activities"))
    const unsubscribeActivities = onSnapshot(activitiesQuery, (snapshot) => {
      const activitiesData = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate() || new Date(),
        }))
        .filter(
          (activity) => activity.createdBy === user.uid || ["event", "lesson", "section"].includes(activity.type),
        ) as Activity[]

      setActivities(activitiesData)
    })

    // Load beneficiaries assigned to this preacher
    const beneficiariesQuery = query(collection(db, "beneficiaries"), where("assignedPreacher", "==", user.uid))
    const unsubscribeBeneficiaries = onSnapshot(beneficiariesQuery, (snapshot) => {
      const beneficiariesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Beneficiary[]

      setBeneficiaries(beneficiariesData)
      setLoading(false)
    })

    return () => {
      unsubscribeActivities()
      unsubscribeBeneficiaries()
    }
  }, [user])

  const handleAttendanceChange = (beneficiaryId: string, present: boolean) => {
    setAttendance((prev) => ({
      ...prev,
      [beneficiaryId]: present,
    }))
  }

  const saveAttendance = async () => {
    if (!selectedActivity || !user) return

    setSaving(true)
    try {
      const attendanceRecords = Object.entries(attendance).map(([beneficiaryId, present]) => ({
        activityId: selectedActivity,
        beneficiaryId,
        present,
        loggedBy: user.uid,
        loggedAt: Timestamp.now(),
      }))

      // Save all attendance records
      const promises = attendanceRecords.map((record) => addDoc(collection(db, "attendance"), record))

      await Promise.all(promises)

      // Reset form
      setAttendance({})
      setSelectedActivity("")

      alert("Attendance saved successfully!")
    } catch (error) {
      console.error("Error saving attendance:", error)
      alert("Error saving attendance. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const filteredBeneficiaries = beneficiaries.filter(
    (beneficiary) =>
      beneficiary.name.toLowerCase().includes(searchTerm.toLowerCase()) || beneficiary.phone.includes(searchTerm),
  )

  const selectedActivityData = activities.find((a) => a.id === selectedActivity)

  if (loading) {
    return (
      <AuthGuard allowedRoles={["da'i"]}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard allowedRoles={["da'i"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance Tracking</h1>
          <p className="text-gray-600">Log attendance for your assigned beneficiaries</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Activity</CardTitle>
            <CardDescription>Choose an activity to log attendance for</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedActivity === activity.id
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedActivity(activity.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{activity.title}</h3>
                      <div className="flex items-center text-sm text-gray-600 mt-1">
                        <Calendar className="h-4 w-4 mr-1" />
                        {activity.date.toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {activity.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedActivity && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Mark Attendance</CardTitle>
                  <CardDescription>Activity: {selectedActivityData?.title}</CardDescription>
                </div>
                <Button onClick={saveAttendance} disabled={saving}>
                  {saving ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Save Attendance
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search beneficiaries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="space-y-2">
                  {filteredBeneficiaries.map((beneficiary) => (
                    <div key={beneficiary.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id={beneficiary.id}
                        checked={attendance[beneficiary.id] || false}
                        onCheckedChange={(checked) => handleAttendanceChange(beneficiary.id, checked as boolean)}
                      />
                      <label htmlFor={beneficiary.id} className="flex-1 cursor-pointer">
                        <div className="font-medium">{beneficiary.name}</div>
                        <div className="text-sm text-gray-600">{beneficiary.phone}</div>
                      </label>
                    </div>
                  ))}
                </div>

                {filteredBeneficiaries.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No beneficiaries found</h3>
                    <p className="text-gray-600">
                      {searchTerm ? "Try adjusting your search terms." : "No beneficiaries assigned to you yet."}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthGuard>
  )
}
