"use client"

import { useState, useEffect } from "react"
import { doc, getDoc, collection, query, where, getDocs, orderBy, writeBatch, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Loader2, Phone, Layers, BarChart, StickyNote, CalendarCheck, BookOpen, Calendar as CalendarIcon, Activity as ActivityIcon, Users as UsersIcon, Trash2 } from "lucide-react"
import type { Beneficiary, AttendanceRecord, Preacher } from "@/lib/firestore-collections"
import { format } from "date-fns"
import { EditBeneficiaryDialog } from "./edit-beneficiary-dialog"
import { TransferBeneficiaryDialog } from "./transfer-beneficiary-dialog"

interface AttendanceStats {
  maqari: { attended: number; total: number };
  events: { attended: number; total: number };
  lessons: { attended: number; total: number };
  sections: { attended: number; total: number };
}

interface GroupedAttendance {
  maqari?: AttendanceRecord[];
  events?: AttendanceRecord[];
  lessons?: AttendanceRecord[];
  sections?: AttendanceRecord[];
}

interface BeneficiaryDetailsDialogProps {
  beneficiaryId: string
  children: React.ReactNode
  onUpdate?: () => void
}

export function BeneficiaryDetailsDialog({ beneficiaryId, children, onUpdate }: BeneficiaryDetailsDialogProps) {
  const { userRole } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null)
  const [preacher, setPreacher] = useState<Preacher | null>(null)
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null)
  const [groupedAttendance, setGroupedAttendance] = useState<GroupedAttendance>({})

  useEffect(() => {
    const fetchData = async () => {
      if (!open) return
      setLoading(true)
      setBeneficiary(null)

      try {
        const beneficiaryDoc = await getDoc(doc(db, "beneficiaries", beneficiaryId))
        if (!beneficiaryDoc.exists()) { setLoading(false); return; }
        
        const beneficiaryData = { id: beneficiaryDoc.id, ...beneficiaryDoc.data() } as Beneficiary
        setBeneficiary(beneficiaryData)

        const [
          preacherDoc,
          maqariSnap, eventsSnap, lessonsSnap, sectionsSnap,
          attendanceSnap
        ] = await Promise.all([
          beneficiaryData.da_i_id ? getDoc(doc(db, "preachers", beneficiaryData.da_i_id)) : Promise.resolve(null),
          getDocs(collection(db, "maqari")),
          getDocs(collection(db, "events")),
          getDocs(collection(db, "lessons")),
          getDocs(collection(db, "sections")),
          getDocs(query(collection(db, "attendance"), where("beneficiary_id", "==", beneficiaryId), orderBy("logged_at", "desc")))
        ]);

        if (preacherDoc && preacherDoc.exists()) setPreacher(preacherDoc.data() as Preacher)
        
        const attendanceHistory = attendanceSnap.docs.map(d => ({...d.data(), id: d.id }) as AttendanceRecord)

        const stats: AttendanceStats = {
          maqari: { total: maqariSnap.size, attended: attendanceHistory.filter(r => r.activity_type === 'maqari').length },
          events: { total: eventsSnap.size, attended: attendanceHistory.filter(r => r.activity_type === 'events').length },
          lessons: { total: lessonsSnap.size, attended: attendanceHistory.filter(r => r.activity_type === 'lessons').length },
          sections: { total: sectionsSnap.size, attended: attendanceHistory.filter(r => r.activity_type === 'sections').length },
        };
        setAttendanceStats(stats);

        const grouped: GroupedAttendance = {};
        attendanceHistory.forEach(rec => {
          const type = rec.activity_type as keyof GroupedAttendance;
          if (!grouped[type]) grouped[type] = [];
          grouped[type]?.push(rec);
        });
        setGroupedAttendance(grouped);

      } catch (error) { console.error("Error fetching details:", error); } 
      finally { setLoading(false); }
    }
    fetchData()
  }, [open, beneficiaryId])

  const handleUpdate = () => {
    setOpen(false);
    onUpdate?.();
  }

  const handleDeleteBeneficiary = async () => {
    if (!beneficiary) return;
    if (window.confirm(`Are you sure you want to permanently delete ${beneficiary.name}? This action cannot be undone.`)) {
        try {
            setLoading(true);
            // Also delete their attendance records
            const attendanceQuery = query(collection(db, "attendance"), where("beneficiary_id", "==", beneficiary.id));
            const attendanceSnapshot = await getDocs(attendanceQuery);
            const batch = writeBatch(db);
            attendanceSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();

            // Delete the beneficiary itself
            await deleteDoc(doc(db, "beneficiaries", beneficiary.id));
            handleUpdate();
        } catch (error) {
            console.error("Failed to delete beneficiary:", error);
            alert("An error occurred while deleting the beneficiary.");
            setLoading(false);
        }
    }
  }
  
  const StatItem = ({ title, attended, total }: {title: string, attended: number, total: number}) => (
    total > 0 ? (
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          <span className="text-xs font-semibold">{attended} / {total}</span>
        </div>
        <Progress value={(attended / total) * 100} className="h-2" />
      </div>
    ) : null
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{loading ? "Loading..." : beneficiary?.name || "Beneficiary Not Found"}</DialogTitle>
          <DialogDescription>
            {beneficiary ? `Assigned to: ${preacher?.name || 'N/A'}` : "Details about the beneficiary will appear here."}
          </DialogDescription>
        </DialogHeader>
        
        {loading ? ( <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : beneficiary ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
                <h3 className="font-semibold border-b pb-2">Beneficiary Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> <span>{beneficiary.phone}</span></div>
                  <div className="flex items-center gap-2"><Layers className="h-4 w-4 text-muted-foreground" /> <Badge variant="outline">{beneficiary.batch}</Badge></div>
                  <div className="flex items-center gap-2"><BarChart className="h-4 w-4 text-muted-foreground" /> <Badge>{beneficiary.da_wa_stage}</Badge></div>
                </div>
                {beneficiary.notes && <div className="flex items-start gap-2 pt-2"><StickyNote className="h-4 w-4 mt-1 text-muted-foreground" /> <p className="text-sm text-muted-foreground bg-muted p-2 rounded-md flex-1">{beneficiary.notes}</p></div>}
                
                {attendanceStats && (
                  <div className="space-y-3 pt-4 border-t">
                    <h3 className="font-semibold">Quick Stats</h3>
                    <StatItem title="Maqari" attended={attendanceStats.maqari.attended} total={attendanceStats.maqari.total} />
                    <StatItem title="Events" attended={attendanceStats.events.attended} total={attendanceStats.events.total} />
                    <StatItem title="Lessons" attended={attendanceStats.lessons.attended} total={attendanceStats.lessons.total} />
                    <StatItem title="Sections" attended={attendanceStats.sections.attended} total={attendanceStats.sections.total} />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold border-b pb-2 flex items-center gap-2"><CalendarCheck className="h-5 w-5" /> Attendance History</h3>
                <div className="max-h-64 overflow-y-auto space-y-3 pr-2">
                  {Object.keys(groupedAttendance).length > 0 ? (
                    <>
                      {groupedAttendance.maqari && <AttendanceCategory title="Maqari" records={groupedAttendance.maqari} icon={BookOpen} />}
                      {groupedAttendance.events && <AttendanceCategory title="Events" records={groupedAttendance.events} icon={CalendarIcon} />}
                      {groupedAttendance.lessons && <AttendanceCategory title="Lessons" records={groupedAttendance.lessons} icon={ActivityIcon} />}
                      {groupedAttendance.sections && <AttendanceCategory title="Sections" records={groupedAttendance.sections} icon={UsersIcon} />}
                    </>
                  ) : (
                    <p className="text-center text-sm text-muted-foreground py-10">No attendance records found.</p>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="flex-wrap justify-start gap-2 pt-4 border-t">
              <EditBeneficiaryDialog beneficiary={beneficiary} onBeneficiaryUpdated={handleUpdate} >
                <Button>Edit Details</Button>
              </EditBeneficiaryDialog>
              {userRole === 'admin' && (
                <>
                  <TransferBeneficiaryDialog beneficiary={beneficiary} onTransferComplete={handleUpdate}>
                    <Button variant="secondary">Transfer</Button>
                  </TransferBeneficiaryDialog>
                  <Button variant="destructive" onClick={handleDeleteBeneficiary}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Beneficiary
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            </DialogFooter>
          </>
        ) : <div className="text-center py-10 text-muted-foreground">Could not find beneficiary data.</div>}
      </DialogContent>
    </Dialog>
  )
}

const AttendanceCategory = ({ title, records, icon: Icon }: { title: string, records: AttendanceRecord[], icon: React.ElementType }) => (
    <div>
        <h4 className="font-semibold text-sm mb-1 flex items-center gap-1.5"><Icon className="h-4 w-4" /> {title}</h4>
        <div className="space-y-1 pl-2">
            {records.map((att, index) => (
                <div key={`${att.id}-${index}`} className="text-muted-foreground flex justify-between items-center text-xs">
                    <span>{att.activity_name}</span>
                    <span>{(att.logged_at as any)?.toDate ? format((att.logged_at as any).toDate(), "PP") : ''}</span>
                </div>
            ))}
        </div>
    </div>
);
