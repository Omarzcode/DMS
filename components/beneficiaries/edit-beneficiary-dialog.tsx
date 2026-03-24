"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { doc, updateDoc, addDoc, collection } from "firebase/firestore"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Edit, AlertCircle } from "lucide-react"
import type { Beneficiary, ProgressLog } from "@/lib/firestore-collections"
import { DAWA_STAGES } from "@/lib/firestore-collections"
import { toast } from "sonner"

interface EditBeneficiaryDialogProps {
  beneficiary: Beneficiary
  onBeneficiaryUpdated?: (beneficiary: Beneficiary) => void
  children?: React.ReactNode
}

export function EditBeneficiaryDialog({ beneficiary, onBeneficiaryUpdated, children }: EditBeneficiaryDialogProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: beneficiary.name,
    phone: beneficiary.phone,
    batch: beneficiary.batch,
    da_wa_stage: beneficiary.da_wa_stage,
    notes: beneficiary.notes || "",
  })

  // Fix 1: Sync formData when beneficiary prop changes or dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        name: beneficiary.name,
        phone: beneficiary.phone,
        batch: beneficiary.batch,
        da_wa_stage: beneficiary.da_wa_stage,
        notes: beneficiary.notes || "",
      })
    }
  }, [open, beneficiary])

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Reset form when closing
      setFormData({
        name: beneficiary.name,
        phone: beneficiary.phone,
        batch: beneficiary.batch,
        da_wa_stage: beneficiary.da_wa_stage,
        notes: beneficiary.notes || "",
      })
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!formData.name.trim() || !formData.phone.trim() || !formData.batch.trim()) {
      setError("Please fill in all required fields")
      return
    }

    try {
      setLoading(true)
      setError(null)

      const changes: string[] = []
      const oldNotes = beneficiary.notes ?? ""
      const newNotes = formData.notes.trim()

      if (formData.name !== beneficiary.name) changes.push(`Name: ${beneficiary.name} → ${formData.name}`)
      if (formData.phone !== beneficiary.phone) changes.push(`Phone: ${beneficiary.phone} → ${formData.phone}`)
      if (formData.batch !== beneficiary.batch) changes.push(`Batch: ${beneficiary.batch} → ${formData.batch}`)
      if (formData.da_wa_stage !== beneficiary.da_wa_stage)
        changes.push(`Stage: ${beneficiary.da_wa_stage} → ${formData.da_wa_stage}`)
      if (newNotes !== oldNotes) {
        changes.push(`Notes: ${oldNotes || "None"} → ${newNotes || "None"}`)
      }

      // Fix 2: Guard against unnecessary Firestore writes
      if (changes.length === 0) {
        toast.info("No Changes", {
          description: "No modifications were made.",
        })
        setOpen(false)
        return
      }

      const updateData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        batch: formData.batch.trim(),
        da_wa_stage: formData.da_wa_stage,
        notes: newNotes || "",
      }

      // Fix 3: Perform all Firestore operations before showing success toast
      await updateDoc(doc(db, "beneficiaries", beneficiary.id), updateData)

      await addDoc(collection(db, "beneficiaries", beneficiary.id, "progress_logs"), {
        action: "note_added",
        details: `Profile updated: ${changes.join(", ")}`,
        performed_by: user.uid,
        performed_by_name: user.displayName || user.email || "User",
        timestamp: new Date(),
      } satisfies Omit<ProgressLog, "id">)

      // Toast only fires after both operations succeed
      toast.success("Data Updated", {
        description: `${formData.name}'s information has been updated successfully`,
      })

      // Update local state
      const updatedBeneficiary: Beneficiary = { ...beneficiary, ...updateData }
      onBeneficiaryUpdated?.(updatedBeneficiary)

      setOpen(false)
    } catch (error) {
      console.error("Error updating beneficiary:", error)
      toast.error("Update Failed", {
        description: "An error occurred while updating the data",
      })
      setError("Failed to update beneficiary. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon">
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Edit Beneficiary</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>Update beneficiary information and track changes.</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-name">Full Name *</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter full name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-phone">Phone Number *</Label>
            <Input
              id="edit-phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Enter phone number"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-batch">Batch/Group *</Label>
            <Input
              id="edit-batch"
              value={formData.batch}
              onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
              placeholder="e.g., 2024-A, Evening Group"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-stage">Da&apos;wa Stage</Label>
            {/* Fix 4: Replaced `as any` with a proper type cast */}
            <Select
              value={formData.da_wa_stage}
              onValueChange={(value) =>
                setFormData({ ...formData, da_wa_stage: value as (typeof DAWA_STAGES)[number] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAWA_STAGES.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {stage}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes about this beneficiary"
              rows={3}
            />
          </div>

          <ResponsiveDialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  {/* Fix 5: Changed ml-2 to mr-2 so the margin is between icon and text */}
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Beneficiary"
              )}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}