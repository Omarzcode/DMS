"use client"

import type React from "react"

import { useState } from "react"
import { doc, updateDoc, addDoc, collection } from "firebase/firestore"
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
import { Loader2, Edit, AlertCircle } from "lucide-react"
import type { Beneficiary, ProgressLog } from "@/lib/firestore-collections"
import { DAWA_STAGES } from "@/lib/firestore-collections"

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

    // Validation
    if (!formData.name.trim() || !formData.phone.trim() || !formData.batch.trim()) {
      setError("Please fill in all required fields")
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Check what changed
      const changes: string[] = []
      if (formData.name !== beneficiary.name) changes.push(`Name: ${beneficiary.name} → ${formData.name}`)
      if (formData.phone !== beneficiary.phone) changes.push(`Phone: ${beneficiary.phone} → ${formData.phone}`)
      if (formData.batch !== beneficiary.batch) changes.push(`Batch: ${beneficiary.batch} → ${formData.batch}`)
      if (formData.da_wa_stage !== beneficiary.da_wa_stage)
        changes.push(`Stage: ${beneficiary.da_wa_stage} → ${formData.da_wa_stage}`)
      if (formData.notes !== (beneficiary.notes || ""))
        changes.push(`Notes: ${beneficiary.notes || "None"} → ${formData.notes || "None"}`)

      // Update beneficiary
      const updateData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        batch: formData.batch.trim(),
        da_wa_stage: formData.da_wa_stage,
        notes: formData.notes.trim() || undefined,
      }

      await updateDoc(doc(db, "beneficiaries", beneficiary.id), updateData)

      // Log changes if any
      if (changes.length > 0) {
        const progressLog: Omit<ProgressLog, "id"> = {
          action: "note_added",
          details: `Profile updated: ${changes.join(", ")}`,
          performed_by: user.uid,
          performed_by_name: user.displayName || user.email || "User",
          timestamp: new Date(),
        }

        await addDoc(collection(db, "beneficiaries", beneficiary.id, "progress_logs"), progressLog)
      }

      // Update local state
      const updatedBeneficiary = { ...beneficiary, ...updateData }
      onBeneficiaryUpdated?.(updatedBeneficiary)

      setOpen(false)
    } catch (error) {
      console.error("Error updating beneficiary:", error)
      setError("Failed to update beneficiary. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon">
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Beneficiary</DialogTitle>
          <DialogDescription>Update beneficiary information and track changes.</DialogDescription>
        </DialogHeader>

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
            <Label htmlFor="edit-stage">Da'wa Stage</Label>
            <Select
              value={formData.da_wa_stage}
              onValueChange={(value) => setFormData({ ...formData, da_wa_stage: value as any })}
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Beneficiary"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
