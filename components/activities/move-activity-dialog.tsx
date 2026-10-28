"use client"

import { useState, useEffect } from "react"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Folder, Loader2, FolderInput, Calendar } from "lucide-react"
import { toast } from "sonner"
import type { Activity, ActivityFolder } from "@/lib/firestore-collections"

interface MoveActivityDialogProps {
  activity: Activity | null
  activityType: string
  folders: ActivityFolder[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onActivityMoved?: (activityId: string, newFolderId: string | null) => void
}

export function MoveActivityDialog({
  activity,
  activityType,
  folders,
  open,
  onOpenChange,
  onActivityMoved,
}: MoveActivityDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string>(
    activity?.folder_id || "none"
  )
  const [loading, setLoading] = useState(false)

  // Sync state whenever activity or open changes
  useEffect(() => {
    if (open && activity) {
      setSelectedFolderId(activity.folder_id || "none")
    }
  }, [open, activity])

  // Explicit safety cleanup for pointer-events when dialog closes
  useEffect(() => {
    if (!open) {
      const resetPointerEvents = () => {
        if (typeof document !== "undefined" && document.body) {
          if (document.body.style.pointerEvents === "none") {
            document.body.style.pointerEvents = ""
          }
        }
      }
      resetPointerEvents()
      const t1 = setTimeout(resetPointerEvents, 50)
      const t2 = setTimeout(resetPointerEvents, 150)
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
      }
    }
    return () => {
      if (typeof document !== "undefined" && document.body) {
        document.body.style.pointerEvents = ""
      }
    }
  }, [open])

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && activity) {
      setSelectedFolderId(activity.folder_id || "none")
    }
    onOpenChange(isOpen)
  }

  const handleSave = async () => {
    if (!activity) return
    try {
      setLoading(true)
      const targetFolderId = selectedFolderId === "none" ? null : selectedFolderId

      await updateDoc(doc(db, activityType, activity.id), {
        folder_id: targetFolderId,
      })

      const targetFolder = folders.find((f) => f.id === targetFolderId)
      const parentName = targetFolder?.parent_id
        ? folders.find((f) => f.id === targetFolder.parent_id)?.name
        : null
      const fullLabel = targetFolder
        ? parentName
          ? `${parentName} → ${targetFolder.name}`
          : targetFolder.name
        : "Unassigned"

      toast.success("Activity moved", {
        description: `"${activity.name}" moved to ${fullLabel}.`,
      })
      onActivityMoved?.(activity.id, targetFolderId)
      onOpenChange(false)
    } catch (err) {
      console.error("Error moving activity:", err)
      toast.error("Failed to move activity", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  // Format folder label clearly: e.g. "Fall 26 → Monday" or "Fall 26 (Direct)"
  const getFolderLabel = (f: ActivityFolder) => {
    if (f.parent_id) {
      const parent = folders.find((p) => p.id === f.parent_id)
      return parent ? `${parent.name} → ${f.name}` : f.name
    }
    return `${f.name} (Semester Root)`
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogContent className="max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <FolderInput className="h-4 w-4 text-primary" />
            </div>
            <span>Move to Semester or Day Folder</span>
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Assign &ldquo;{activity?.name}&rdquo; to a semester or specific day folder (e.g. Fall 26 → Monday).
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="target-folder">Select Destination (المجلد أو يوم الأسبوع)</Label>
            <Select
              value={selectedFolderId}
              onValueChange={setSelectedFolderId}
            >
              <SelectTrigger id="target-folder">
                <SelectValue placeholder="Choose a folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">None (Unassigned / No Folder)</span>
                </SelectItem>
                {folders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    <div className="flex items-center gap-2">
                      {f.parent_id ? (
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <Folder className="h-3.5 w-3.5 text-primary" />
                      )}
                      <span className="font-medium">{getFolderLabel(f)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <ResponsiveDialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Moving...
              </>
            ) : (
              <>
                <FolderInput className="h-4 w-4" />
                Move Activity
              </>
            )}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
