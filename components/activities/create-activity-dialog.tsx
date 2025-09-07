"use client"

import type React from "react"

import { useState } from "react"
import { collection, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Loader2, Plus, AlertCircle, CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { Activity } from "@/lib/firestore-collections"

interface CreateActivityDialogProps {
  onActivityCreated?: (activity: Activity) => void
  activityType?: "maqari" | "events" | "lessons" | "sections"
  children?: React.ReactNode
}

const activityTypeLabels = {
  maqari: "Maqra'a",
  events: "Event",
  lessons: "Lesson",
  sections: "Section",
}

const activityTypeDescriptions = {
  maqari: "Create a personal recitation circle for your beneficiaries",
  events: "Create a central event for all preachers and beneficiaries",
  lessons: "Create an educational lesson or class",
  sections: "Create a study section or group activity",
}

export function CreateActivityDialog({ onActivityCreated, activityType, children }: CreateActivityDialogProps) {
  const { user, userRole } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>()

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: activityType || "maqari",
  })

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Reset form when closing
      setFormData({
        name: "",
        description: "",
        type: activityType || "maqari",
      })
      setSelectedDate(undefined)
      setError(null)
    }
  }

  const canCreateActivityType = (type: string) => {
    if (type === "maqari") return true // Both admin and preacher can create maqari
    return userRole === "admin" // Only admin can create central activities
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Validation
    if (!formData.name.trim()) {
      setError("Please enter an activity name")
      return
    }

    if (!canCreateActivityType(formData.type)) {
      setError("You don't have permission to create this type of activity")
      return
    }

    try {
      setLoading(true)
      setError(null)

      const newActivity: Omit<Activity, "id"> = {
        name: formData.name.trim(),
        creator_id: user.uid,
        creator_name: user.displayName || user.email || "Unknown",
        created_at: new Date(),
        ...(selectedDate && { event_date: selectedDate }),
        ...(formData.description && { description: formData.description.trim() }),
      }

      const docRef = await addDoc(collection(db, formData.type), newActivity)
      const createdActivity = { id: docRef.id, ...newActivity }

      // Call callback if provided
      onActivityCreated?.(createdActivity)

      // Close dialog and reset form
      setOpen(false)
    } catch (error) {
      console.error("Error creating activity:", error)
      setError("Failed to create activity. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Activity
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New {activityTypeLabels[formData.type as keyof typeof activityTypeLabels]}</DialogTitle>
          <DialogDescription>
            {activityTypeDescriptions[formData.type as keyof typeof activityTypeDescriptions]}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!activityType && (
            <div className="space-y-2">
              <Label htmlFor="type">Activity Type *</Label>
              <Select value={formData.type} onValueChange={(value: "maqari" | "events" | "lessons" | "sections") => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maqari">Maqra'a (Personal)</SelectItem>
                 
                    <>
                      <SelectItem value="events">Event (Central)</SelectItem>
                      <SelectItem value="lessons">Lesson (Central)</SelectItem>
                      <SelectItem value="sections">Section (Central)</SelectItem>
                    </>
                 
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Activity Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={`Enter ${activityTypeLabels[formData.type as keyof typeof activityTypeLabels].toLowerCase()} name`}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the activity, its goals, or any special instructions"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Event Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                `Create ${activityTypeLabels[formData.type as keyof typeof activityTypeLabels]}`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
