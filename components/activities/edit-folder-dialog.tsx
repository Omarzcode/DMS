"use client"

import { useState } from "react"
import { doc, updateDoc, deleteDoc } from "firebase/firestore"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FolderEdit, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { ActivityFolder } from "@/lib/firestore-collections"

interface EditFolderDialogProps {
  folder: ActivityFolder | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onFolderUpdated?: (updated: ActivityFolder) => void
  onFolderDeleted?: (folderId: string) => void
}

export function EditFolderDialog({
  folder,
  open,
  onOpenChange,
  onFolderUpdated,
  onFolderDeleted,
}: EditFolderDialogProps) {
  const [name, setName] = useState(folder?.name || "")
  const [description, setDescription] = useState(folder?.description || "")
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Sync state on open
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && folder) {
      setName(folder.name)
      setDescription(folder.description || "")
    }
    onOpenChange(isOpen)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!folder || !name.trim()) return

    try {
      setLoading(true)
      const folderRef = doc(db, "folders", folder.id)
      await updateDoc(folderRef, {
        name: name.trim(),
        description: description.trim(),
      })

      const updated: ActivityFolder = {
        ...folder,
        name: name.trim(),
        description: description.trim(),
      }

      toast.success("Folder updated", {
        description: `"${name.trim()}" updated successfully.`,
      })
      onFolderUpdated?.(updated)
      onOpenChange(false)
    } catch (err) {
      console.error("Error updating folder:", err)
      toast.error("Failed to update folder", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!folder) return
    const confirmed = window.confirm(
      `Are you sure you want to delete folder "${folder.name}"? Activities inside will remain intact but become unassigned.`
    )
    if (!confirmed) return

    try {
      setDeleting(true)
      await deleteDoc(doc(db, "folders", folder.id))
      toast.success("Folder deleted", {
        description: `"${folder.name}" has been removed.`,
      })
      onFolderDeleted?.(folder.id)
      onOpenChange(false)
    } catch (err) {
      console.error("Error deleting folder:", err)
      toast.error("Failed to delete folder", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setDeleting(false)
    }
  }

  if (!folder) return null

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogContent className="max-w-md">
        <form onSubmit={handleUpdate}>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <FolderEdit className="h-4 w-4 text-primary" />
              </div>
              <span>Edit Folder</span>
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Rename or update &ldquo;{folder.name}&rdquo;.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-folder-name">Folder Name (اسم المجلد) *</Label>
              <Input
                id="edit-folder-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-folder-description">Description (وصف)</Label>
              <Textarea
                id="edit-folder-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <ResponsiveDialogFooter className="flex-col sm:flex-row justify-between gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || loading}
              className="gap-2 sm:mr-auto"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete Folder
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading || deleting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !name.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
              </Button>
            </div>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
