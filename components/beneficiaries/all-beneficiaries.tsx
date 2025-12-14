"use client"

import { useState, useEffect, useMemo } from "react"
import { collection, getDocs, query } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Search, Plus, UserPlus, X, Download, Activity, TrendingUp, AlertCircle } from "lucide-react"
import type { Beneficiary, Preacher } from "@/lib/firestore-collections"
import { DAWA_STAGES } from "@/lib/firestore-collections"
import { AddBeneficiaryDialog } from "./add-beneficiary-dialog"
import { BeneficiaryDetailsDialog } from "./beneficiary-details-dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { HighlightText } from "@/components/ui/highlight-text"
import { StatsCard } from "@/components/ui/stats-card"
import { Skeleton } from "@/components/ui/skeleton"

export function AllBeneficiaries() {
  const { userRole } = useAuth()
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [preachers, setPreachers] = useState<Preacher[]>([])
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
    } catch (error) {
      console.error("Error fetching data:", error)
    }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  // ✅ Use useMemo for better performance
  const filteredBeneficiaries = useMemo(() => {
    let filteredData = beneficiaries;

    // Search filter
    if (searchTerm.trim() !== "") {
      const lowercasedSearchTerm = searchTerm.toLowerCase().trim();
      filteredData = filteredData.filter(beneficiary => {
        const nameMatch = beneficiary.name.toLowerCase().includes(lowercasedSearchTerm);
        const phoneMatch = beneficiary.phone.toLowerCase().includes(lowercasedSearchTerm);
        return nameMatch || phoneMatch;
      });
    }

    // Stage filter
    if (stageFilter !== "all") {
      filteredData = filteredData.filter(b => b.da_wa_stage === stageFilter);
    }

    // Preacher filter
    if (preacherFilter !== "all") {
      filteredData = filteredData.filter(b => b.da_i_id === preacherFilter);
    }

    return filteredData;
  }, [beneficiaries, searchTerm, stageFilter, preacherFilter]);

  // ✅ Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const activeThisMonth = beneficiaries.filter(b => {
      const createdAt = b.created_at;
      if (!createdAt) return false;
      const date = typeof createdAt === 'object' && 'seconds' in createdAt
        ? new Date((createdAt as { seconds: number }).seconds * 1000) // FIX APPLIED HERE 
        : new Date(createdAt);
      return date >= thisMonth;
    }).length;

    const advancedStage = beneficiaries.filter(b =>
      b.da_wa_stage === "متعلم ملتزم" ||
      b.da_wa_stage === "مشارك نشط" ||
      b.da_wa_stage === "قائد مجتمعي"
    ).length;

    return { activeThisMonth, advancedStage };
  }, [beneficiaries]);

  const getPreacherName = (preacherId: string) =>
    preachers.find(p => p.id === preacherId)?.name || "Unknown"

  // ✅ Export function
  const exportToCSV = () => {
    const headers = ['Name', 'Phone', 'Preacher', 'Batch', 'Stage'];
    const rows = filteredBeneficiaries.map(b => [
      b.name,
      b.phone,
      getPreacherName(b.da_i_id),
      b.batch,
      b.da_wa_stage
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `beneficiaries_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  // ✅ Clear all filters
  const clearFilters = () => {
    setSearchTerm("")
    setStageFilter("all")
    setPreacherFilter("all")
  }

  const hasActiveFilters = searchTerm || stageFilter !== "all" || preacherFilter !== "all"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="h-6 w-6" />
          <h2 className="text-xl sm:text-2xl font-bold truncate">All Beneficiaries</h2>
          <Badge variant="secondary">{beneficiaries.length}</Badge>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={loading}>
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">تصدير</span>
          </Button>
          <AddBeneficiaryDialog onBeneficiaryAdded={fetchData} />
        </div>
      </div>

      {/* ✅ Stats Cards */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatsCard
            title="إجمالي المستفيدين"
            value={beneficiaries.length}
            icon={Users}
          />
          <StatsCard
            title="نشط هذا الشهر"
            value={stats.activeThisMonth}
            icon={Activity}
            trend="+12%"
          />
          <StatsCard
            title="في مرحلة متقدمة"
            value={stats.advancedStage}
            icon={TrendingUp}
          />
          <StatsCard
            title="نتائج البحث"
            value={filteredBeneficiaries.length}
            icon={Search}
          />
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ابحث بالاسم أو رقم الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10 h-10 sm:h-11"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchTerm("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="فلترة بالمرحلة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المراحل</SelectItem>
              {DAWA_STAGES.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {stage}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={preacherFilter} onValueChange={setPreacherFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="فلترة بالداعية" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الدعاة</SelectItem>
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

        {/* ✅ Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap animate-fade-in">
            <span className="text-sm text-muted-foreground">الفلاتر النشطة:</span>

            {searchTerm && (
              <Badge variant="secondary" className="gap-2">
                بحث: {searchTerm}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => setSearchTerm("")}
                />
              </Badge>
            )}

            {stageFilter !== "all" && (
              <Badge variant="secondary" className="gap-2">
                المرحلة: {stageFilter}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => setStageFilter("all")}
                />
              </Badge>
            )}

            {preacherFilter !== "all" && (
              <Badge variant="secondary" className="gap-2">
                الداعية: {getPreacherName(preacherFilter)}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => setPreacherFilter("all")}
                />
              </Badge>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7"
            >
              مسح الكل
            </Button>
          </div>
        )}
      </div>

      {/* Beneficiaries List */}
      <div className="border rounded-lg sm:rounded-xl bg-card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 animate-pulse">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : filteredBeneficiaries.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title={hasActiveFilters ? "لا توجد نتائج" : "لا يوجد مستفيدون"}
            description={hasActiveFilters ? "لم يتم العثور على مستفيدين يطابقون معايير البحث الخاصة بك" : "ابدأ بإضافة مستفيدين جدد لتتبع تقدمهم في رحلتهم الدعوية"}
            action={!hasActiveFilters && <AddBeneficiaryDialog onBeneficiaryAdded={fetchData} />}
          />
        ) : (
          filteredBeneficiaries.map((beneficiary, index) => (
            <BeneficiaryDetailsDialog key={beneficiary.id} beneficiaryId={beneficiary.id} onUpdate={fetchData}>
              <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-5 cursor-pointer hover:bg-muted/50 transition-colors touch-target ${index < filteredBeneficiaries.length - 1 ? 'border-b' : ''}`}>
                <div className="flex-1 min-w-0 mb-2 sm:mb-0">
                  <div className="font-medium text-sm sm:text-base truncate">
                    <HighlightText text={beneficiary.name} highlight={searchTerm} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <HighlightText text={beneficiary.phone} highlight={searchTerm} />
                  </div>

                  <div className="text-xs sm:text-sm text-muted-foreground truncate">
                    {getPreacherName(beneficiary.da_i_id)}
                  </div>
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