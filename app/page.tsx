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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 px-4">
      <div className="text-center animate-fade-in max-w-sm sm:max-w-md mx-auto">
        <div className="gradient-bg-primary p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl text-white mb-4 sm:mb-6">
          <Users className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4" />
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4">أهلاً بك، {user.displayName}!</h2>
          <p className="text-sm sm:text-base lg:text-lg opacity-90 mb-4 sm:mb-6">يتم توجيهك إلى لوحة التحكم الخاصة بك...</p>
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
        <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-600">
          <div className="container-responsive text-center">
            <div className="max-w-2xl lg:max-w-3xl mx-auto animate-fade-in px-4">
              <h2 className="heading-responsive-2 font-bold text-white mb-4 sm:mb-6">
            </SelectContent>
              <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-8 sm:mb-12 max-w-2xl lg:max-w-3xl mx-auto leading-relaxed px-4">
              <p className="text-base sm:text-lg lg:text-xl text-white/90 mb-6 sm:mb-8">
      </div>
      
      <div className="border rounded-lg sm:rounded-xl bg-card overflow-hidden">
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 px-4">
        <div className="text-center max-w-sm sm:max-w-md mx-auto animate-fade-in">
                  className="gradient-bg-primary hover:opacity-90 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-medium w-full sm:w-auto"
          <div className="gradient-bg-primary p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl text-white mb-4 sm:mb-6">
            <Shield className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4" />
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4">أهلاً بك أيها المدير!</h2>
            <p className="text-sm sm:text-base lg:text-lg opacity-90 mb-4 sm:mb-6">يتم توجيهك إلى لوحة تحكم المدير المتطورة...</p>
          </div>
        ) : (
          filteredBeneficiaries.map((beneficiary, index) => (
                  className="border-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-300 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg w-full sm:w-auto"
                <div className="flex-1 min-w-0 mb-2 sm:mb-0">
                  <TrendingUp className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
          className="gradient-bg-accent hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 w-full sm:w-auto"
              </div>
          <Calendar className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
          ))
        )}
      </div>
    </div>
  )
}