"use client"

import type React from "react"

import { useState } from "react"
import { collection, query, where, getDocs, doc, updateDoc, addDoc } from "firebase/firestore"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ArrowRightLeft, AlertCircle } from "lucide-react"
import type { Beneficiary, Preacher, ProgressLog } from "@/lib/firestore-collections"

interface TransferBeneficiaryDialogProps {
  beneficiary: Beneficiary
  onTransferComplete?: (beneficiary: Beneficiary) => void
  children?: React.ReactNode
}

export function TransferBeneficiaryDialog({
  beneficiary,
  onTransferComplete,
  children,
}: TransferBeneficiaryDialogProps) {
  const { user, userRole } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preachers, setPreachers] = useState<Preacher[]>([])
  const [loadingPreachers, setLoadingPreachers] = useState(false)
  const [selectedPreacherId, setSelectedPreacherId] = useState("")
  const [transferReason, setTransferReason] = useState("")

  // Only admins can transfer beneficiaries
  if (userRole !== "admin") {
    return null
  }

  const handleOpenChange = async (newOpen: boolean) => {
    setOpen(newOpen)
    if (newOpen) {
      await loadPreachers()
    }
    if (!newOpen) {
      setSelectedPreacherId("")
      setTransferReason("")
      setError(null)
    }
  }

  const loadPreachers = async () => {
    try {
      setLoadingPreachers(true)
      const preachersQuery = query(collection(db, "preachers"), where("role", "==", "da'i"))
      const preachersSnapshot = await getDocs(preachersQuery)
      const preachersData = preachersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Preacher[]

      // Filter out current preacher
      setPreachers(preachersData.filter((p) => p.id !== beneficiary.da_i_id))
    } catch (error) {
      console.error("Error loading preachers:", error)
      setError("Failed to load preachers")
    } finally {
      setLoadingPreachers(false)
    }
  }

  const handleTransfer = async () => {
    if (!user || !selectedPreacherId) return

    try {
      setLoading(true)
      setError(null)

      // Get current and new preacher details
      const currentPreacher = preachers.find((p) => p.id === beneficiary.da_i_id)
      const newPreacher = preachers.find((p) => p.id === selectedPreacherId)

      if (!newPreacher) {
        setError("Selected preacher not found")
        return
      }

      // Update beneficiary's assigned preacher
      await updateDoc(doc(db, "beneficiaries", beneficiary.id), {
        da_i_id: selectedPreacherId,
      })

      // Create progress log entry
      const progressLog: Omit<ProgressLog, "id"> = {
        action: "transfer",
        details: `Transferred from ${currentPreacher?.name || "Unknown"} to ${newPreacher.name}. Reason: ${transferReason || "No reason provided"}`,
        performed_by: user.uid,
        performed_by_name: user.displayName || user.email || "Admin",
        timestamp: new Date(),
      }

      await addDoc(collection(db, "beneficiaries", beneficiary.id, "progress_logs"), progressLog)

      // Update local state
      const updatedBeneficiary = { ...beneficiary, da_i_id: selectedPreacherId }
      onTransferComplete?.(updatedBeneficiary)

      setOpen(false)
    } catch (error) {
      console.error("Error transferring beneficiary:", error)
      setError("Failed to transfer beneficiary. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Transfer
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Transfer Beneficiary</DialogTitle>
          <DialogDescription>
            Transfer {beneficiary.name} to a different preacher. This action will be logged for audit purposes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="new-preacher">Transfer to Preacher *</Label>
            {loadingPreachers ? (
              <div className="flex items-center gap-2 p-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading preachers...</span>
              </div>
            ) : (
              <Select value={selectedPreacherId} onValueChange={setSelectedPreacherId}>
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

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Transfer (Optional)</Label>
            <Textarea
              id="reason"
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="Explain why this beneficiary is being transferred"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleTransfer} disabled={loading || !selectedPreacherId}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Transferring...
              </>
            ) : (
              "Transfer Beneficiary"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
