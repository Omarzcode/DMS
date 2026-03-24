"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { collection, addDoc, getDocs, query, where } from "firebase/firestore"
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
import { Loader2, Plus, AlertCircle } from "lucide-react"
import type { Beneficiary, Preacher } from "@/lib/firestore-collections"
import { DAWA_STAGES } from "@/lib/firestore-collections"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────────

interface AddBeneficiaryDialogProps {
  onBeneficiaryAdded?: (beneficiary: Beneficiary) => void
  assignedPreacherId?: string
}

// ─── Phone Normalization ──────────────────────────────────────────

// Fix 3: Normalize phone before duplicate check so format variants
// (e.g. +201234567890 vs 01234567890) are treated as the same number
function normalizePhone(phone: string): string {
  let clean = phone.replace(/[^\d+]/g, "")
  if (clean.startsWith("+20"))                            clean = clean.slice(3)
  else if (clean.startsWith("0020"))                      clean = clean.slice(4)
  else if (clean.startsWith("002"))                       clean = clean.slice(3)
  else if (clean.startsWith("20") && clean.length >= 12) clean = clean.slice(2)
  clean = clean.replace(/\+/g, "")
  if (clean.length === 10 && /^1[0-2,5]/.test(clean))    clean = "0" + clean
  return clean
}

function isValidEgyptianPhone(phone: string): boolean {
  return /^01[0-2,5]\d{8}$/.test(normalizePhone(phone))
}

// ─── Default form state factory ───────────────────────────────────

const makeDefaultForm = (assignedPreacherId?: string, uid?: string) => ({
  name:         "",
  phone:        "",
  batch:        "",
  da_wa_stage:  DAWA_STAGES[0],
  notes:        "",
  da_i_id:      assignedPreacherId || uid || "",
})

// ─── Component ────────────────────────────────────────────────────

export function AddBeneficiaryDialog({
  onBeneficiaryAdded,
  assignedPreacherId,
}: AddBeneficiaryDialogProps) {
  const { user, userRole } = useAuth()
  const [open, setOpen]                     = useState(false)
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState<string | null>(null)
  const [preachers, setPreachers]           = useState<Preacher[]>([])
  const [loadingPreachers, setLoadingPreachers] = useState(false)

  const [formData, setFormData] = useState(() =>
    makeDefaultForm(assignedPreacherId, user?.uid)
  )

  // Fix 1: Sync da_i_id when assignedPreacherId or user changes
  useEffect(() => {
    if (open) {
      setFormData((prev) => ({
        ...prev,
        da_i_id: assignedPreacherId || user?.uid || "",
      }))
    }
  // Fix 8: user?.uid is now properly tracked
  }, [open, assignedPreacherId, user?.uid])

  // Fix 10: Wrapped in useCallback so it's stable across renders
  const loadPreachers = useCallback(async () => {
    if (!open || userRole !== "admin" || assignedPreacherId) return
    setLoadingPreachers(true)
    try {
      const snap = await getDocs(
        query(collection(db, "preachers"), where("role", "==", "da'i"))
      )
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Preacher[]
      setPreachers(data)
    } catch (err) {
      console.error("Error loading preachers:", err)
      toast.error("Failed to load preachers", {
        description: "Please close and reopen the dialog to retry.",
      })
    } finally {
      setLoadingPreachers(false)
    }
  }, [open, userRole, assignedPreacherId])

  useEffect(() => {
    loadPreachers()
  }, [loadPreachers])

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setFormData(makeDefaultForm(assignedPreacherId, user?.uid))
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // ── Validation ────────────────────────────────────────────────
    if (!formData.name.trim()) {
      setError("Full name is required.")
      return
    }
    if (!formData.phone.trim()) {
      setError("Phone number is required.")
      return
    }
    // Fix 7: Validate phone format before hitting Firestore
    if (!isValidEgyptianPhone(formData.phone)) {
      setError("Please enter a valid Egyptian phone number (e.g. 01012345678).")
      return
    }
    if (!formData.batch.trim()) {
      setError("Batch / Group is required.")
      return
    }
    // Fix 6: Specific error message for missing preacher assignment
    if (!formData.da_i_id) {
      setError(
        userRole === "admin"
          ? "Please assign this beneficiary to a preacher."
          : "No preacher assigned. Please contact your administrator."
      )
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fix 3: Normalize phone before duplicate check
      const normalizedPhone = normalizePhone(formData.phone.trim())

      const phoneQuery     = query(
        collection(db, "beneficiaries"),
        where("phone", "==", normalizedPhone)
      )
      const querySnapshot  = await getDocs(phoneQuery)

      if (!querySnapshot.empty) {
        setError("This phone number is already registered for another beneficiary.")
        // Fix 4: Don't call setLoading(false) here — finally handles it
        return
      }

      const newBeneficiary: Omit<Beneficiary, "id"> = {
        name:        formData.name.trim(),
        // Always store the normalized form
        phone:       normalizedPhone,
        da_i_id:     formData.da_i_id,
        batch:       formData.batch.trim(),
        // Fix 2: Proper type cast instead of `as any`
        da_wa_stage: formData.da_wa_stage as (typeof DAWA_STAGES)[number],
        notes:       formData.notes.trim() || "",
        created_at:  new Date(),
      }

      const docRef            = await addDoc(collection(db, "beneficiaries"), newBeneficiary)
      const createdBeneficiary: Beneficiary = { id: docRef.id, ...newBeneficiary }

      // Fix 9: Callback fires before toast so parent state is ready first
      onBeneficiaryAdded?.(createdBeneficiary)

      toast.success("Beneficiary Added Successfully!", {
        description: `${formData.name} has been added to the system`,
      })

      setOpen(false)
    } catch (err) {
      console.error("Error adding beneficiary:", err)
      toast.error("Operation Failed", {
        description: "An error occurred while adding the beneficiary",
      })
      setError("Failed to add beneficiary. Please try again.")
    } finally {
      // Fix 4: Single authoritative place to reset loading
      setLoading(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogTrigger asChild>
        <Button>
          {/* Fix 5: mr-2 so margin is between icon and text */}
          <Plus className="h-4 w-4 mr-2" />
          Add Beneficiary
        </Button>
      </ResponsiveDialogTrigger>

      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Add New Beneficiary</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Add a new beneficiary to the da&apos;wa management system.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Name */}
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

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="e.g. 01012345678"
              required
            />
          </div>

          {/* Batch */}
          <div className="space-y-2">
            <Label htmlFor="batch">Batch / Group *</Label>
            <Input
              id="batch"
              value={formData.batch}
              onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
              placeholder="e.g., 2024-A, Evening Group"
              required
            />
          </div>

          {/* Preacher selector — admin only */}
          {userRole === "admin" && !assignedPreacherId && (
            <div className="space-y-2">
              <Label htmlFor="preacher">Assign to Preacher *</Label>
              {loadingPreachers ? (
                <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading preachers...</span>
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
                    {preachers.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        No preachers found
                      </div>
                    ) : (
                      preachers.map((preacher) => (
                        <SelectItem key={preacher.id} value={preacher.id}>
                          {preacher.name} ({preacher.email})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Da'wa Stage */}
          <div className="space-y-2">
            <Label htmlFor="stage">Initial Da&apos;wa Stage</Label>
            <Select
              value={formData.da_wa_stage}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  // Fix 2: Proper type cast
                  da_wa_stage: value as (typeof DAWA_STAGES)[number],
                })
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

          {/* Notes */}
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

          <ResponsiveDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  {/* Fix 5: mr-2 so margin is between icon and text */}
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Beneficiary"
              )}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}