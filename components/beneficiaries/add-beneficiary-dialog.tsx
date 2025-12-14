"use client"

import type React from "react"
import { useState, useEffect } from "react"
// **** تمت إضافة query و where هنا ****
import { collection, addDoc, getDocs, query, where } from "firebase/firestore"
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
import { toast } from 'sonner'
interface AddBeneficiaryDialogProps {
  onBeneficiaryAdded?: (beneficiary: Beneficiary) => void
  assignedPreacherId?: string
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

  useEffect(() => {
    const loadPreachers = async () => {
        if (open && userRole === "admin" && !assignedPreacherId) {
            setLoadingPreachers(true)
            try {
                const preachersSnapshot = await getDocs(query(collection(db, "preachers"), where("role", "==", "da'i")))
                const preachersData = preachersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Preacher[]
                setPreachers(preachersData)
            } catch (error) { console.error("Error loading preachers:", error) }
            finally { setLoadingPreachers(false) }
        }
    }
    loadPreachers();
  }, [open, userRole, assignedPreacherId])


  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setFormData({
        name: "", phone: "", batch: "",
        da_wa_stage: DAWA_STAGES[0], notes: "",
        da_i_id: assignedPreacherId || user?.uid || "",
      })
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!formData.name.trim() || !formData.phone.trim() || !formData.batch.trim() || !formData.da_i_id) {
      setError("Please fill in all required fields")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // ******** بداية التعديل الأساسي ********
      // 1. التحقق من وجود رقم الهاتف مسبقًا
      const phoneQuery = query(collection(db, "beneficiaries"), where("phone", "==", formData.phone.trim()));
      const querySnapshot = await getDocs(phoneQuery);

      if (!querySnapshot.empty) {
        // 2. إذا كان الرقم موجودًا، اعرض رسالة خطأ وأوقف العملية
        setError("هذا الرقم مسجل بالفعل لمدعو آخر.");
        setLoading(false);
        return;
      }
      // ******** نهاية التعديل الأساسي ********

      // 3. إذا كان الرقم غير موجود، أكمل عملية الإضافة
      const newBeneficiary: Omit<Beneficiary, "id"> = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        da_i_id: formData.da_i_id,
        batch: formData.batch.trim(),
        da_wa_stage: formData.da_wa_stage,
        notes: formData.notes.trim() || "",
        created_at: new Date(),
      }

      const docRef = await addDoc(collection(db, "beneficiaries"), newBeneficiary)
      const createdBeneficiary = { id: docRef.id, ...newBeneficiary }
      toast.success('تم إضافة المستفيد بنجاح!', {
  description: `${formData.name} تمت إضافته إلى النظام`,
})
      onBeneficiaryAdded?.(createdBeneficiary)
      setOpen(false)

    } catch (error) {
      console.error("Error adding beneficiary:", error)
      toast.error('فشلت العملية', {
    description: 'حدث خطأ أثناء إضافة المستفيد',
  })
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
            <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter full name" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Enter phone number" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="batch">Batch/Group *</Label>
            <Input id="batch" value={formData.batch} onChange={(e) => setFormData({ ...formData, batch: e.target.value })} placeholder="e.g., 2024-A, Evening Group" required />
          </div>

          {userRole === "admin" && !assignedPreacherId && (
            <div className="space-y-2">
              <Label htmlFor="preacher">Assign to Preacher *</Label>
              {loadingPreachers ? ( <div className="flex items-center gap-2 p-2"><Loader2 className="h-4 w-4 animate-spin" /><span>Loading preachers...</span></div>
              ) : (
                <Select value={formData.da_i_id} onValueChange={(value) => setFormData({ ...formData, da_i_id: value })}>
                  <SelectTrigger><SelectValue placeholder="Select a preacher" /></SelectTrigger>
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
            <Select value={formData.da_wa_stage} onValueChange={(value) => setFormData({ ...formData, da_wa_stage: value as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAWA_STAGES.map((stage) => (
                  <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Any additional notes about this beneficiary" rows={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding...</> : "Add Beneficiary"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
