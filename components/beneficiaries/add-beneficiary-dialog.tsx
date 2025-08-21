"use client"

import type React from "react"

import { useState } from "react"
import { collection, addDoc, getDocs, query } from "firebase/firestore"
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
import { Loader2, Plus, AlertCircle } from "lucide-react"
import type { Beneficiary, Preacher } from "@/lib/firestore-collections"
import { DAWA_STAGES } from "@/lib/firestore-collections"

interface AddBeneficiaryDialogProps {
  onBeneficiaryAdded?: (beneficiary: Beneficiary) => void
  assignedPreacherId?: string // For admin to assign to specific preacher
}

export function AddBeneficiaryDialog({ onBeneficiaryAdded, assignedPreacherId }: AddBeneficiaryDialogProps) {
  const { user, userRole } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preachers, setPreachers] = useState<Preacher[]>([])
  const [loadingPreachers, setLoadingPreachers] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    batch: "",
    da_wa_stage: DAWA_STAGES[0],
    notes: "",
    da_i_id: assignedPreacherId || user?.uid || "",
  })

  const handleOpenChange = async (newOpen: boolean) => {
    setOpen(newOpen)
    if (newOpen && userRole === "admin" && !assignedPreacherId) {
      // Load preachers for admin to choose from
      await loadPreachers()
    }
    if (!newOpen) {
      // Reset form when closing
      setFormData({
        name: "",
        phone: "",
        batch: "",
        da_wa_stage: DAWA_STAGES[0],
        notes: "",
        da_i_id: assignedPreacherId || user?.uid || "",
      })
      setError(null)
    }
  }

  const loadPreachers = async () => {
    try {
      setLoadingPreachers(true)
      const preachersSnapshot = await getDocs(query(collection(db, "preachers")))
      const preachersData = preachersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Preacher[]
      setPreachers(preachersData.filter((p) => p.role === "da'i"))
    } catch (error) {
      console.error("Error loading preachers:", error)
    } finally {
      setLoadingPreachers(false)
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

    if (!formData.da_i_id) {
      setError("Please select a preacher")
      return
    }

    try {
      setLoading(true)
      setError(null)

      const newBeneficiary: Omit<Beneficiary, "id"> = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        da_i_id: formData.da_i_id,
        batch: formData.batch.trim(),
        da_wa_stage: formData.da_wa_stage,
        notes: formData.notes.trim() || undefined,
        created_at: new Date(),
      }

      const docRef = await addDoc(collection(db, "beneficiaries"), newBeneficiary)
      const createdBeneficiary = { id: docRef.id, ...newBeneficiary }

      // Call callback if provided
      onBeneficiaryAdded?.(createdBeneficiary)

      // Close dialog and reset form
      setOpen(false)
    } catch (error) {
      console.error("Error adding beneficiary:", error)
      setError("Failed to add beneficiary. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Beneficiary
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Beneficiary</DialogTitle>
          <DialogDescription>Add a new beneficiary to the da'wa management system.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter full name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Enter phone number"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="batch">Batch/Group *</Label>
            <Input
              id="batch"
              value={formData.batch}
              onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
              placeholder="e.g., 2024-A, Evening Group"
              required
            />
          </div>

          {userRole === "admin" && !assignedPreacherId && (
            <div className="space-y-2">
              <Label htmlFor="preacher">Assign to Preacher *</Label>
              {loadingPreachers ? (
                <div className="flex items-center gap-2 p-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading preachers...</span>
                </div>
              ) : (
                <Select
                  value={formData.da_i_id}
                  onValueChange={(value) => setFormData({ ...formData, da_i_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a preacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {preachers.map((preacher) => (
                      <SelectItem key={preacher.id} value={preacher.id}>
                        {preacher.name} ({preacher.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="stage">Initial Da'wa Stage</Label>
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
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
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
                  Adding...
                </>
              ) : (
                "Add Beneficiary"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
