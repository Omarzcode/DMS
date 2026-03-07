"use client"

import type React from "react"
import { useState, useCallback, useEffect, useRef } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ArrowRightLeft, AlertCircle } from "lucide-react"
import type { Beneficiary, Preacher, ProgressLog } from "@/lib/firestore-collections"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────────

interface TransferBeneficiaryDialogProps {
  beneficiary: Beneficiary
  onTransferComplete?: (beneficiary: Beneficiary) => void
  children?: React.ReactNode
}

// ─── Component ────────────────────────────────────────────────────

export function TransferBeneficiaryDialog({
  beneficiary,
  onTransferComplete,
  children,
}: TransferBeneficiaryDialogProps) {
  const { user, userRole } = useAuth()

  const [open, setOpen]                         = useState(false)
  const [loading, setLoading]                   = useState(false)
  const [error, setError]                       = useState<string | null>(null)
  // Fix 4: Keep ALL preachers separately so we can look up the current one by name
  const [allPreachers, setAllPreachers]         = useState<Preacher[]>([])
  // Fix 4: Selectable list excludes the current preacher
  const [availablePreachers, setAvailablePreachers] = useState<Preacher[]>([])
  const [loadingPreachers, setLoadingPreachers] = useState(false)
  const [selectedPreacherId, setSelectedPreacherId] = useState("")
  const [transferReason, setTransferReason]     = useState("")

  // Fix 5: Stable ref for beneficiary.da_i_id so loadPreachers doesn't
  // need beneficiary in its dep array (avoids re-running on every render)
  const currentPreacherIdRef = useRef(beneficiary.da_i_id)
  useEffect(() => {
    currentPreacherIdRef.current = beneficiary.da_i_id
  }, [beneficiary.da_i_id])

  // Fix 5: loadPreachers as useCallback — stable across renders
  const loadPreachers = useCallback(async () => {
    setLoadingPreachers(true)
    setError(null)
    try {
      const snap = await getDocs(
        query(collection(db, "preachers"), where("role", "==", "da'i"))
      )
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Preacher[]

      // Fix 4: Store full list for name lookup, filtered list for dropdown
      setAllPreachers(data)
      setAvailablePreachers(data.filter((p) => p.id !== currentPreacherIdRef.current))
    } catch (err) {
      console.error("Error loading preachers:", err)
      setError("Failed to load preachers. Please close and try again.")
    } finally {
      setLoadingPreachers(false)
    }
  }, []) // stable — reads currentPreacherIdRef via ref, not closure

  // Fix 8: Reload preachers whenever the dialog opens or beneficiary changes
  useEffect(() => {
    if (open) {
      loadPreachers()
    }
  }, [open, loadPreachers])

  // Fix 12: Reset selectedPreacherId if beneficiary prop changes while closed
  useEffect(() => {
    if (!open) {
      setSelectedPreacherId("")
      setTransferReason("")
      setError(null)
    }
  }, [beneficiary.id, open])

  // Fix 2: handleOpenChange is NOT async — Radix doesn't await it
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setSelectedPreacherId("")
      setTransferReason("")
      setError(null)
    }
    // loadPreachers is triggered by the useEffect above — not here
  }

  const handleTransfer = async () => {
    if (!user || !selectedPreacherId) return

    setLoading(true)
    setError(null)

    try {
      // Fix 4: Look up current preacher from the FULL list (not filtered)
      const currentPreacher = allPreachers.find((p) => p.id === beneficiary.da_i_id)
      const newPreacher     = allPreachers.find((p) => p.id === selectedPreacherId)

      if (!newPreacher) {
        setError("Selected preacher not found. Please refresh and try again.")
        // Fix 3: Always reset loading — no more bare `return` before finally
        setLoading(false)
        return
      }

      // Update beneficiary's assigned preacher
      await updateDoc(doc(db, "beneficiaries", beneficiary.id), {
        da_i_id: selectedPreacherId,
      })

      // Create progress log entry
      const progressLog: Omit<ProgressLog, "id"> = {
        action:             "transfer",
        // Fix 10: Trim transferReason before storing
        details:            `Transferred from ${currentPreacher?.name ?? "Unknown"} to ${newPreacher.name}. Reason: ${transferReason.trim() || "No reason provided"}`,
        performed_by:       user.uid,
        performed_by_name:  user.displayName || user.email || "Admin",
        timestamp:          new Date(),
      }

      await addDoc(
        collection(db, "beneficiaries", beneficiary.id, "progress_logs"),
        progressLog
      )

      // Fix 6: Success toast
      toast.success("Beneficiary Transferred", {
        description: `${beneficiary.name} has been transferred to ${newPreacher.name}`,
      })

      // Update local state and close
      const updatedBeneficiary: Beneficiary = { ...beneficiary, da_i_id: selectedPreacherId }
      onTransferComplete?.(updatedBeneficiary)
      setOpen(false)
    } catch (err) {
      console.error("Error transferring beneficiary:", err)
      toast.error("Transfer Failed", {
        description: "An error occurred while transferring the beneficiary.",
      })
      setError("Failed to transfer beneficiary. Please try again.")
    } finally {
      // Fix 3: Single authoritative loading reset
      setLoading(false)
    }
  }

  // Fix 1: Early return AFTER all hooks — but wrapped so hooks order is stable
  // If not admin, render nothing but keep hooks above intact
  if (userRole !== "admin") return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            {/* Fix 7: mr-2 so margin is between icon and text */}
            {/* Fix 11: aria-label for accessibility */}
            <ArrowRightLeft className="h-4 w-4 mr-2" aria-hidden="true" />
            Transfer
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Transfer Beneficiary</DialogTitle>
          <DialogDescription>
            Transfer <strong>{beneficiary.name}</strong> to a different preacher.
            This action will be logged for audit purposes.
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
              <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading preachers...</span>
              </div>
            ) : availablePreachers.length === 0 ? (
              // Fix 9: Empty state when no other preachers exist
              <div className="p-3 rounded-md border border-dashed text-sm text-muted-foreground text-center">
                No other preachers available to transfer to.
              </div>
            ) : (
              <Select
                value={selectedPreacherId}
                onValueChange={setSelectedPreacherId}
              >
                <SelectTrigger id="new-preacher">
                  <SelectValue placeholder="Select a preacher" />
                </SelectTrigger>
                <SelectContent>
                  {availablePreachers.map((preacher) => (
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
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={loading || !selectedPreacherId || availablePreachers.length === 0}
          >
            {loading ? (
              <>
                {/* Fix 7: mr-2 */}
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