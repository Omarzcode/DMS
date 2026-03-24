"use client"

import { useState, useCallback } from "react"
import { collection, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Loader2,
  Plus,
  AlertCircle,
  CalendarIcon,
  BookOpen,
  Users,
  Activity as ActivityIcon,
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { Activity } from "@/lib/firestore-collections"

// ─── Types ───────────────────────────────────────────────────────

type ActivityType = "maqari" | "events" | "lessons" | "sections"

interface CreateActivityDialogProps {
  onActivityCreated?: (activity: Activity) => void
  activityType?: ActivityType
  children?: React.ReactNode
}

interface FormData {
  name: string
  description: string
  type: ActivityType
}

interface FormErrors {
  name?: string
  type?: string
}

// ─── Constants ───────────────────────────────────────────────────

const ACTIVITY_CONFIG: Record<
  ActivityType,
  {
    label: string
    description: string
    icon: React.ElementType
    placeholder: string
  }
> = {
  maqari: {
    label: "Maqra'a",
    description: "Create a personal recitation circle for your beneficiaries.",
    icon: BookOpen,
    placeholder: "e.g., Weekly Quran Circle",
  },
  events: {
    label: "Event",
    description:
      "Create a central event for all preachers and beneficiaries.",
    icon: CalendarIcon,
    placeholder: "e.g., Community Gathering",
  },
  lessons: {
    label: "Lesson",
    description: "Create an educational lesson or class.",
    icon: ActivityIcon,
    placeholder: "e.g., Fiqh Fundamentals",
  },
  sections: {
    label: "Section",
    description: "Create a study section or group activity.",
    icon: Users,
    placeholder: "e.g., Youth Study Group",
  },
}

const NAME_MAX_LENGTH = 100
const DESCRIPTION_MAX_LENGTH = 500

// ─── Component ───────────────────────────────────────────────────

export function CreateActivityDialog({
  onActivityCreated,
  activityType,
  children,
}: CreateActivityDialogProps) {
  const { user, userRole } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()

  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    type: activityType || "maqari",
  })

  // ─── Helpers ─────────────────────────────────────────────────

  const currentConfig = ACTIVITY_CONFIG[formData.type]

  const canCreateActivity =
    userRole === "admin" || userRole === "da'i"

  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      description: "",
      type: activityType || "maqari",
    })
    setSelectedDate(undefined)
    setError(null)
    setFieldErrors({})
  }, [activityType])

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      resetForm()
    }
  }

  const updateField = <K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear field error when user starts typing
    if (fieldErrors[field as keyof FormErrors]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
    }
    // Clear global error
    if (error) setError(null)
  }

  // ─── Validation ──────────────────────────────────────────────

  const validate = (): boolean => {
    const errors: FormErrors = {}

    const trimmedName = formData.name.trim()
    if (!trimmedName) {
      errors.name = "Activity name is required."
    } else if (trimmedName.length < 3) {
      errors.name = "Name must be at least 3 characters."
    } else if (trimmedName.length > NAME_MAX_LENGTH) {
      errors.name = `Name must be ${NAME_MAX_LENGTH} characters or less.`
    }

    if (!canCreateActivity) {
      setError("You don't have permission to create activities.")
      return false
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ─── Submit ──────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!validate()) return

    try {
      setLoading(true)
      setError(null)

      const newActivity: Omit<Activity, "id"> = {
        name: formData.name.trim(),
        creator_id: user.uid,
        creator_name: user.displayName || user.email || "Unknown",
        created_at: new Date(),
        ...(selectedDate && { event_date: selectedDate }),
        ...(formData.description.trim() && {
          description: formData.description.trim(),
        }),
      }

      const docRef = await addDoc(
        collection(db, formData.type),
        newActivity
      )
      const createdActivity = { id: docRef.id, ...newActivity }

      toast.success(`${currentConfig.label} created`, {
        description: `"${formData.name.trim()}" has been created successfully.`,
      })

      onActivityCreated?.(createdActivity)
      setOpen(false)
    } catch (err) {
      console.error("Error creating activity:", err)
      const message =
        err instanceof Error ? err.message : "An unknown error occurred"
      setError(`Failed to create activity: ${message}`)
      toast.error("Failed to create activity")
    } finally {
      setLoading(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────

  const TypeIcon = currentConfig.icon

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogTrigger asChild>
        {children || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Activity
          </Button>
        )}
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <TypeIcon className="h-4 w-4 text-primary" />
            </div>
            Create New {currentConfig.label}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{currentConfig.description}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Global Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Activity Type Selector (only if not pre-set) */}
          {!activityType && (
            <div className="space-y-2">
              <Label htmlFor="type">
                Activity Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value: ActivityType) =>
                  updateField("type", value)
                }
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(ACTIVITY_CONFIG) as [
                      ActivityType,
                      (typeof ACTIVITY_CONFIG)[ActivityType],
                    ][]
                  ).map(([key, config]) => {
                    const Icon = config.icon
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {config.label}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Activity Name */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="name">
                Activity Name <span className="text-destructive">*</span>
              </Label>
              <span
                className={cn(
                  "text-xs",
                  formData.name.length > NAME_MAX_LENGTH
                    ? "text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {formData.name.length}/{NAME_MAX_LENGTH}
              </span>
            </div>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder={currentConfig.placeholder}
              maxLength={NAME_MAX_LENGTH + 10} // Allow slight overshoot for UX, validation catches it
              className={cn(
                fieldErrors.name && "border-destructive focus-visible:ring-destructive"
              )}
              autoFocus
            />
            {fieldErrors.name && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {fieldErrors.name}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Description</Label>
              <span
                className={cn(
                  "text-xs",
                  formData.description.length > DESCRIPTION_MAX_LENGTH
                    ? "text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {formData.description.length}/{DESCRIPTION_MAX_LENGTH}
              </span>
            </div>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Describe the activity, its goals, or any special instructions..."
              rows={3}
              maxLength={DESCRIPTION_MAX_LENGTH + 10}
              className="resize-none"
            />
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <Label>
              Event Date{" "}
              <span className="text-muted-foreground text-xs font-normal">
                (Optional)
              </span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="ml-2 h-4 w-4" />
                  {selectedDate
                    ? format(selectedDate, "PPP")
                    : "Select a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {selectedDate && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2 text-muted-foreground"
                onClick={() => setSelectedDate(undefined)}
              >
                Clear date
              </Button>
            )}
          </div>

          {/* Footer */}
          <ResponsiveDialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                !formData.name.trim() ||
                formData.name.trim().length < 3
              }
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create {currentConfig.label}
                </>
              )}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
