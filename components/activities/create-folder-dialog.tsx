"use client"

import { useState } from "react"
import { addDoc, collection } from "firebase/firestore"
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
import { FolderPlus, Loader2, Sparkles, Folder, Calendar } from "lucide-react"
import { toast } from "sonner"
import type { ActivityFolder } from "@/lib/firestore-collections"

interface CreateFolderDialogProps {
  category: "maqari" | "events" | "lessons" | "sections" | "all"
  onFolderCreated?: (folder: ActivityFolder) => void
  children?: React.ReactNode
  parentId?: string | null
  parentFolder?: ActivityFolder | null
  suggestedType?: "semester" | "day" | "custom"
  initialName?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CreateFolderDialog({
  category,
  onFolderCreated,
  children,
  parentId = null,
  parentFolder = null,
  suggestedType,
  initialName = "",
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: CreateFolderDialogProps) {
  const { user } = useAuth()
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = typeof controlledOpen === "boolean"
  const open = isControlled ? controlledOpen : internalOpen

  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState("")

  const isDayFolder = Boolean(parentFolder || parentId || suggestedType === "day")

  const handleOpenChange = (isOpen: boolean) => {
    if (!isControlled) setInternalOpen(isOpen)
    controlledOnOpenChange?.(isOpen)
    if (isOpen) {
      setName(initialName)
      setDescription("")
    }
  }

  const setOpen = (val: boolean) => handleOpenChange(val)

  // Days of the week presets (when creating inside a semester like Fall 26)
  const dayPresets = [
    "Monday (الاثنين)",
    "Thursday (الخميس)",
    "Sunday (الأحد)",
    "Tuesday (الثلاثاء)",
    "Wednesday (الأربعاء)",
    "Friday (الجمعة)",
    "Saturday (السبت)",
  ]

  // Semester presets (when creating at top level)
  const semesterPresets = [
    "Fall 26",
    "Spring 26",
    "Fall 25",
    "Spring 27",
    "Summer 25",
    "Fall 24",
    "Spring 25",
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Please enter a folder name")
      return
    }

    if (!user) {
      toast.error("You must be logged in to create a folder")
      return
    }

    try {
      setLoading(true)
      const folderType = isDayFolder ? "day" : "semester"

      const newFolderData: Omit<ActivityFolder, "id"> = {
        name: name.trim(),
        category,
        folder_type: folderType,
        parent_id: parentId || null,
        creator_id: user.uid,
        creator_name: user.displayName || user.email || "Preacher",
        created_at: new Date(),
        ...(description.trim() ? { description: description.trim() } : {}),
      }

      const docRef = await addDoc(collection(db, "folders"), newFolderData)
      const createdFolder: ActivityFolder = {
        id: docRef.id,
        ...newFolderData,
      }

      toast.success(isDayFolder ? "Day folder created" : "Semester folder created", {
        description: `"${name.trim()}" created successfully${
          parentFolder ? ` inside ${parentFolder.name}` : ""
        }.`,
      })
      onFolderCreated?.(createdFolder)
      handleOpenChange(false)
    } catch (err) {
      console.error("Error creating folder:", err)
      toast.error("Failed to create folder", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      {children ? (
        <ResponsiveDialogTrigger asChild>
          {children}
        </ResponsiveDialogTrigger>
      ) : !isControlled ? (
        <ResponsiveDialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            {isDayFolder ? (
              <Calendar className="h-4 w-4 text-primary" />
            ) : (
              <FolderPlus className="h-4 w-4 text-primary" />
            )}
            <span>{isDayFolder ? "New Day Folder" : "New Semester"}</span>
          </Button>
        </ResponsiveDialogTrigger>
      ) : null}
      <ResponsiveDialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                {isDayFolder ? (
                  <Calendar className="h-4 w-4 text-primary" />
                ) : (
                  <Folder className="h-4 w-4 text-primary" />
                )}
              </div>
              <span>
                {isDayFolder
                  ? `Create Day Folder in ${parentFolder?.name || "Semester"}`
                  : "Create Semester Folder (إنشاء فصل دراسي)"}
              </span>
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {isDayFolder
                ? `Create a day of the week folder (like Monday or Thursday) inside ${parentFolder?.name || "the semester"} to hold your events.`
                : "Create a semester folder like Fall 26 or Spring 26 to organize days and activities."}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-4 py-4">
            {/* Quick Presets */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {isDayFolder
                  ? "Choose Day (اختر اليوم):"
                  : "Semester Presets (الفصول الدراسية):"}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(isDayFolder ? dayPresets : semesterPresets).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setName(preset)}
                    className={`text-xs px-2.5 py-1 rounded-md transition-all border cursor-pointer ${
                      name === preset
                        ? "bg-primary text-primary-foreground border-primary font-semibold"
                        : "bg-secondary hover:bg-secondary/80 text-secondary-foreground border-border/50"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Folder Name */}
            <div className="space-y-1.5">
              <Label htmlFor="folder-name">
                {isDayFolder ? "Day Folder Name (اسم اليوم)" : "Semester Name (اسم الفصل)"} *
              </Label>
              <Input
                id="folder-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isDayFolder ? "e.g. Monday (الاثنين) or Thursday (الخميس)" : "e.g. Fall 26, Spring 26"}
                autoFocus
              />
            </div>

            {/* Optional Description */}
            <div className="space-y-1.5">
              <Label htmlFor="folder-description">Description (وصف اختياري)</Label>
              <Textarea
                id="folder-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  isDayFolder
                    ? "e.g. Weekly recitation circles held every Monday..."
                    : "e.g. Academic year 2026/2027 activities..."
                }
                rows={2}
              />
            </div>
          </div>

          <ResponsiveDialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FolderPlus className="h-4 w-4" />
                  <span>{isDayFolder ? "Create Day Folder" : "Create Semester"}</span>
                </>
              )}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
