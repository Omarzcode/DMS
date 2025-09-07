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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h2 className="text-2xl font-bold">All Beneficiaries</h2>
          <Badge variant="secondary">{beneficiaries.length}</Badge>
        </div>
        <AddBeneficiaryDialog onBeneficiaryAdded={fetchData} />
      </div>

      {/********** بداية الجزء المُصحح **********/}
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-full md:w-48">
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
          <SelectTrigger className="w-full md:w-48">
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
      {/********** نهاية الجزء المُصحح **********/}
      
      <div className="border rounded-lg bg-card">
        {loading ? (
          <div className="p-4 text-center text-muted-foreground">Loading...</div>
        ) : filteredBeneficiaries.length === 0 ? (
          <div className="p-8 text-center">
            <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No beneficiaries match your filters.</p>
          </div>
        ) : (
          filteredBeneficiaries.map((beneficiary, index) => (
            <BeneficiaryDetailsDialog key={beneficiary.id} beneficiaryId={beneficiary.id} onUpdate={fetchData}>
              <div className={`flex justify-between items-center p-4 cursor-pointer hover:bg-muted/50 ${index < filteredBeneficiaries.length - 1 ? 'border-b' : ''}`}>
                <div>
                  <div className="font-medium">{beneficiary.name}</div>
                  <div className="text-sm text-muted-foreground">{getPreacherName(beneficiary.da_i_id)}</div>
                </div>
                <Badge variant="outline">{beneficiary.batch}</Badge>
              </div>
            </BeneficiaryDetailsDialog>
          ))
        )}
      </div>
    </div>
  )
}