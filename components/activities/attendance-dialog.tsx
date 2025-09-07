"use client"

import { useState, useEffect } from "react"
import { collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Search, CheckCircle, AlertCircle, Users, UserCheck, Badge } from "lucide-react"
import type { Activity, Beneficiary, AttendanceRecord } from "@/lib/firestore-collections"
import { attendanceCollection } from "@/lib/firestore-collections"

interface AttendanceDialogProps {
  activity: Activity & { type: string }
  children: React.ReactNode
  onAttendanceSaved?: (activityId: string, newCount: number) => void
}

export function AttendanceDialog({ activity, children, onAttendanceSaved }: AttendanceDialogProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [attendance, setAttendance] = useState<Record<string, boolean>>({})
  
  // ** الإضافة الجديدة: state لتخزين الحاضرين مسبقًا **
  const [alreadyPresentIds, setAlreadyPresentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && user) {
      fetchData()
    }
  }, [open, user, activity.id])

  const fetchData = async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      // جلب الحضور المسجل مسبقًا
      const attendanceQuery = query(collection(db, "attendance"), where("activity_id", "==", activity.id), where("present", "==", true));
      const attendanceSnapshot = await getDocs(attendanceQuery);
      const presentIds = new Set(attendanceSnapshot.docs.map(doc => doc.data().beneficiary_id));
      setAlreadyPresentIds(presentIds);

      // جلب جميع المدعوين
      const beneficiariesQuery = query(collection(db, "beneficiaries"));
      const beneficiariesSnapshot = await getDocs(beneficiariesQuery)
      const beneficiariesData = beneficiariesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Beneficiary[]
      setBeneficiaries(beneficiariesData)

      // تهيئة خانات الاختيار (فقط لمن لم يحضر بعد)
      const initialAttendance = beneficiariesData.reduce((acc, ben) => {
        if (!presentIds.has(ben.id)) {
          acc[ben.id] = false
        }
        return acc
      }, {} as Record<string, boolean>)
      setAttendance(initialAttendance)

    } catch (e) {
      setError("Failed to load data.")
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleAttendanceChange = (beneficiaryId: string, present: boolean) => {
    // لا تسمح بتغيير الحاضرين مسبقًا
    if (alreadyPresentIds.has(beneficiaryId)) return;
    setAttendance(prev => ({ ...prev, [beneficiaryId]: present }))
  }

  const handleSaveAttendance = async () => {
    if (!user) return;
    setSaving(true)
    setError(null)
    try {
      const presentBeneficiaries = Object.entries(attendance).filter(([_, present]) => present);
      
      if (presentBeneficiaries.length === 0) {
          setError("Please mark at least one new beneficiary as present.");
          setSaving(false);
          return;
      }

      const batch = writeBatch(db)
      const timestamp = new Date()

      presentBeneficiaries.forEach(([beneficiaryId]) => {
        const beneficiary = beneficiaries.find(b => b.id === beneficiaryId)
        if (beneficiary) {
          const attendanceRef = doc(attendanceCollection)
          const newRecord: Omit<AttendanceRecord, 'id'> = {
              activity_id: activity.id, activity_type: activity.type, activity_name: activity.name,
              beneficiary_id: beneficiaryId, beneficiary_name: beneficiary.name, present: true,
              logged_by_id: user.uid, logged_by_name: user.displayName || "Unknown", logged_at: timestamp,
              attended_at: timestamp
          };
          batch.set(attendanceRef, newRecord);
        }
      })

      await batch.commit()
      // تحديث العدد الإجمالي للحضور
      const totalPresent = alreadyPresentIds.size + presentBeneficiaries.length;
      onAttendanceSaved?.(activity.id, totalPresent);
      setOpen(false)
    } catch (e: any) {
      console.error("Firebase Error:", e);
      setError(`Failed to save attendance. Error: ${e.message}`);
    } finally {
      setSaving(false)
    }
  }

  const filteredBeneficiaries = beneficiaries.filter(b =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Attendance</DialogTitle>
          <DialogDescription>
            Mark attendance for "{activity.name}". Previously marked attendees are disabled.
          </DialogDescription>
        </DialogHeader>

        {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search beneficiaries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? ( <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div> ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
              {filteredBeneficiaries.map((beneficiary) => {
                const isPresent = alreadyPresentIds.has(beneficiary.id);
                return (
                  <div key={beneficiary.id} className={`flex items-center space-x-3 p-2 rounded-lg ${isPresent ? 'opacity-50' : 'hover:bg-muted'}`}>
                    <Checkbox
                      id={`att-${activity.id}-${beneficiary.id}`}
                      checked={isPresent || (attendance[beneficiary.id] || false)}
                      onCheckedChange={(checked) => handleAttendanceChange(beneficiary.id, !!checked)}
                      disabled={isPresent}
                    />
                    <label htmlFor={`att-${activity.id}-${beneficiary.id}`} className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{beneficiary.name}</span>
                        {isPresent && <Badge variant="secondary" className="text-xs"><UserCheck className="h-3 w-3 mr-1" /> Attended</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground">{beneficiary.phone}</div>
                    </label>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSaveAttendance} disabled={saving || loading}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : <><CheckCircle className="h-4 w-4 mr-2" /> Save New Attendance</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}