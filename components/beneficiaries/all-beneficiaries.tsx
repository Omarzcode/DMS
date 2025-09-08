"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, query } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Search, Plus, UserPlus } from "lucide-react"
import type { Beneficiary, Preacher } from "@/lib/firestore-collections"
import { DAWA_STAGES } from "@/lib/firestore-collections"
import { AddBeneficiaryDialog } from "./add-beneficiary-dialog"
import { BeneficiaryDetailsDialog } from "./beneficiary-details-dialog"

export function AllBeneficiaries() {
  const { userRole } = useAuth()
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [preachers, setPreachers] = useState<Preacher[]>([])
  const [filteredBeneficiaries, setFilteredBeneficiaries] = useState<Beneficiary[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [stageFilter, setStageFilter] = useState<string>("all")
  const [preacherFilter, setPreacherFilter] = useState<string>("all")
  
  const fetchData = async () => {
    setLoading(true)
    try {
      const [beneficiariesSnapshot, preachersSnapshot] = await Promise.all([
        getDocs(collection(db, "beneficiaries")),
        getDocs(collection(db, "preachers")),
      ]);
      const beneficiariesData = beneficiariesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Beneficiary[]
      const preachersData = preachersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Preacher[]
      setBeneficiaries(beneficiariesData)
      setPreachers(preachersData)
    } catch (error) { console.error("Error fetching data:", error) } 
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    let filtered = beneficiaries
    if (searchTerm) { filtered = filtered.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase())) }
    if (stageFilter !== "all") { filtered = filtered.filter(b => b.da_wa_stage === stageFilter) }
    if (preacherFilter !== "all") { filtered = filtered.filter(b => b.da_i_id === preacherFilter) }
    setFilteredBeneficiaries(filtered)
  }, [beneficiaries, searchTerm, stageFilter, preacherFilter])

  const getPreacherName = (preacherId: string) => preachers.find(p => p.id === preacherId)?.name || "Unknown"
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="h-6 w-6" />
          <h2 className="text-xl sm:text-2xl font-bold truncate">All Beneficiaries</h2>
          <Badge variant="secondary">{beneficiaries.length}</Badge>
        </div>
        <div className="w-full sm:w-auto">
          <AddBeneficiaryDialog onBeneficiaryAdded={fetchData} />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 sm:h-11"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {DAWA_STAGES.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {stage}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={preacherFilter} onValueChange={setPreacherFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by preacher" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Preachers</SelectItem>
              {preachers
                .filter((p) => p.role === "da'i")
                .map((preacher) => (
                  <SelectItem key={preacher.id} value={preacher.id}>
                    {preacher.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="border rounded-lg sm:rounded-xl bg-card overflow-hidden">
        {loading ? (
          <div className="p-6 sm:p-8 text-center text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            Loading...
          </div>
        ) : filteredBeneficiaries.length === 0 ? (
          <div className="p-6 sm:p-8 text-center">
            <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No beneficiaries match your filters.</p>
          </div>
        ) : (
          filteredBeneficiaries.map((beneficiary, index) => (
            <BeneficiaryDetailsDialog key={beneficiary.id} beneficiaryId={beneficiary.id} onUpdate={fetchData}>
              <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-5 cursor-pointer hover:bg-muted/50 transition-colors touch-target ${index < filteredBeneficiaries.length - 1 ? 'border-b' : ''}`}>
                <div className="flex-1 min-w-0 mb-2 sm:mb-0">
                  <div className="font-medium text-sm sm:text-base truncate">{beneficiary.name}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground truncate">{getPreacherName(beneficiary.da_i_id)}</div>
                </div>
                <div className="flex-shrink-0">
                  <Badge variant="outline" className="text-xs">{beneficiary.batch}</Badge>
                </div>
              </div>
            </BeneficiaryDetailsDialog>
          ))
        )}
      </div>
    </div>
  )
}