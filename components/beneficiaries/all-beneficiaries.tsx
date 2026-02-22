"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Users, Search, UserPlus, X, Download, TrendingUp,
  ArrowUpDown, ArrowUp, ArrowDown, Activity, RefreshCw,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from "lucide-react"
import type { Beneficiary, Preacher } from "@/lib/firestore-collections"
import { DAWA_STAGES } from "@/lib/firestore-collections"
import { AddBeneficiaryDialog } from "./add-beneficiary-dialog"
import { BeneficiaryDetailsDialog } from "./beneficiary-details-dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { StatsCard } from "@/components/ui/stats-card"
import { Skeleton } from "@/components/ui/skeleton"
import { ContactImportDialog } from "./contact-import-dialog"

type SortField = 'name' | 'phone' | 'da_wa_stage' | 'created_at'
type SortDirection = 'asc' | 'desc'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

// ✅ Escape special regex characters to prevent RegExp crashes
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// ✅ Safe inline highlight component — no external dependency needed
function SafeHighlightText({
  text,
  highlight,
  className,
}: {
  text: string
  highlight: string
  className?: string
}) {
  if (!highlight || !highlight.trim() || !text) {
    return <span className={className}>{text}</span>
  }

  try {
    const escaped = escapeRegExp(highlight.trim())
    const regex = new RegExp(`(${escaped})`, "gi")
    const parts = text.split(regex)

    return (
      <span className={className}>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.trim().toLowerCase() ? (
            <mark
              key={i}
              className="bg-primary/20 text-primary rounded-sm px-0.5"
            >
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    )
  } catch {
    // Fallback if regex still somehow fails
    return <span className={className}>{text}</span>
  }
}

export function AllBeneficiaries() {
  const { userRole } = useAuth()
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [preachers, setPreachers] = useState<Preacher[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [stageFilter, setStageFilter] = useState<string>("all")
  const [preacherFilter, setPreacherFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const [beneficiariesSnapshot, preachersSnapshot] = await Promise.all([
        getDocs(collection(db, "beneficiaries")),
        getDocs(collection(db, "preachers")),
      ])
      const beneficiariesData = beneficiariesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Beneficiary[]
      const preachersData = preachersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Preacher[]
      setBeneficiaries(beneficiariesData)
      setPreachers(preachersData)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, stageFilter, preacherFilter, sortField, sortDirection, pageSize])

  const getPreacherName = useCallback((preacherId: string) =>
    preachers.find(p => p.id === preacherId)?.name || "Unknown",
    [preachers]
  )

  const getDateValue = useCallback((createdAt: unknown): Date => {
    if (!createdAt) return new Date(0)
    if (typeof createdAt === 'object' && createdAt !== null && 'seconds' in createdAt) {
      return new Date((createdAt as { seconds: number }).seconds * 1000)
    }
    return new Date(createdAt as string | number)
  }, [])

  // ✅ Filtered + Sorted — search uses plain string matching, NOT regex
  const filteredAndSortedBeneficiaries = useMemo(() => {
    let result = [...beneficiaries]

    if (searchTerm.trim()) {
      const lowered = searchTerm.toLowerCase().trim()
      result = result.filter(b =>
        b.name.toLowerCase().includes(lowered) ||
        b.phone.toLowerCase().includes(lowered)
      )
    }

    if (stageFilter !== "all") {
      result = result.filter(b => b.da_wa_stage === stageFilter)
    }

    if (preacherFilter !== "all") {
      result = result.filter(b => b.da_i_id === preacherFilter)
    }

    result.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'ar')
          break
        case 'phone':
          comparison = a.phone.localeCompare(b.phone)
          break
        case 'da_wa_stage': {
          const indexA = DAWA_STAGES.indexOf(a.da_wa_stage)
          const indexB = DAWA_STAGES.indexOf(b.da_wa_stage)
          comparison = indexA - indexB
          break
        }
        case 'created_at': {
          const dateA = getDateValue(a.created_at)
          const dateB = getDateValue(b.created_at)
          comparison = dateA.getTime() - dateB.getTime()
          break
        }
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return result
  }, [beneficiaries, searchTerm, stageFilter, preacherFilter, sortField, sortDirection, getDateValue])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedBeneficiaries.length / pageSize)
  const paginatedBeneficiaries = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredAndSortedBeneficiaries.slice(start, start + pageSize)
  }, [filteredAndSortedBeneficiaries, currentPage, pageSize])

  // Stats
  const stats = useMemo(() => {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const activeThisMonth = beneficiaries.filter(b => {
      const date = getDateValue(b.created_at)
      return date >= thisMonth
    }).length

    const advancedStage = beneficiaries.filter(b =>
      b.da_wa_stage === "متعلم ملتزم" ||
      b.da_wa_stage === "مشارك نشط" ||
      b.da_wa_stage === "قائد مجتمعي"
    ).length

    return { activeThisMonth, advancedStage }
  }, [beneficiaries, getDateValue])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3 text-primary" />
      : <ArrowDown className="h-3 w-3 text-primary" />
  }

  const exportToCSV = () => {
    const BOM = '\uFEFF'
    const headers = ['Name', 'Phone', 'Preacher', 'Batch', 'Stage']
    const rows = filteredAndSortedBeneficiaries.map(b => [
      b.name,
      b.phone,
      getPreacherName(b.da_i_id),
      b.batch || '',
      b.da_wa_stage
    ])

    const csv = BOM + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `beneficiaries_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStageFilter("all")
    setPreacherFilter("all")
    setSortField('name')
    setSortDirection('asc')
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            title="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={loading || filteredAndSortedBeneficiaries.length === 0}>
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Export ({filteredAndSortedBeneficiaries.length})</span>
          </Button>
          <ContactImportDialog onImportComplete={() => fetchData(true)} />
          <AddBeneficiaryDialog onBeneficiaryAdded={() => fetchData(true)} />
        </div>
      </div>

      {/* Stats Cards */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatsCard
            title="Total Beneficiaries"
            value={beneficiaries.length}
            icon={Users}
          />
          <StatsCard
            title="Search Results"
            value={filteredAndSortedBeneficiaries.length}
            icon={Search}
          />
          <StatsCard
            title="New This Month"
            value={stats.activeThisMonth}
            icon={Activity}
          />
          <StatsCard
            title="Advanced Stages"
            value={stats.advancedStage}
            icon={TrendingUp}
          />
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone number..."
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
              <SelectValue placeholder="Filter by stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {DAWA_STAGES.map((stage) => (
                <SelectItem key={stage} value={stage}>{stage}</SelectItem>
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

          {/* Sort Controls */}
          <Select
            value={`${sortField}-${sortDirection}`}
            onValueChange={(value) => {
              const [field, dir] = value.split('-') as [SortField, SortDirection]
              setSortField(field)
              setSortDirection(dir)
            }}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name (A → Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z → A)</SelectItem>
              <SelectItem value="created_at-desc">Newest First</SelectItem>
              <SelectItem value="created_at-asc">Oldest First</SelectItem>
              <SelectItem value="da_wa_stage-asc">Stage (Ascending)</SelectItem>
              <SelectItem value="da_wa_stage-desc">Stage (Descending)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap animate-fade-in">
            <span className="text-sm text-muted-foreground">Active filters:</span>

            {searchTerm && (
              <Badge variant="secondary" className="gap-2">
                Search: {searchTerm}
                <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setSearchTerm("")} />
              </Badge>
            )}

            {stageFilter !== "all" && (
              <Badge variant="secondary" className="gap-2">
                Stage: {stageFilter}
                <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setStageFilter("all")} />
              </Badge>
            )}

            {preacherFilter !== "all" && (
              <Badge variant="secondary" className="gap-2">
                Preacher: {getPreacherName(preacherFilter)}
                <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setPreacherFilter("all")} />
              </Badge>
            )}

            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7">
              Clear All
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
        ) : filteredAndSortedBeneficiaries.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title={hasActiveFilters ? "No results found" : "No beneficiaries yet"}
            description={
              hasActiveFilters
                ? "No beneficiaries match your current search criteria."
                : "Start by adding new beneficiaries to track their progress."
            }
            action={!hasActiveFilters && <AddBeneficiaryDialog onBeneficiaryAdded={() => fetchData(true)} />}
          />
        ) : (
          <>
            {/* Column Sort Headers */}
            <div className="hidden sm:flex items-center px-5 py-3 bg-muted/50 border-b text-xs text-muted-foreground font-medium gap-4">
              <button
                className="flex-1 flex items-center gap-1 hover:text-foreground transition-colors text-left"
                onClick={() => handleSort('name')}
              >
                Name {getSortIcon('name')}
              </button>
              <button
                className="w-32 flex items-center gap-1 hover:text-foreground transition-colors text-left"
                onClick={() => handleSort('da_wa_stage')}
              >
                Stage {getSortIcon('da_wa_stage')}
              </button>
              <div className="w-20 text-center">Batch</div>
            </div>

            {/* ✅ List Items — using SafeHighlightText instead of HighlightText */}
            {paginatedBeneficiaries.map((beneficiary, index) => (
              <BeneficiaryDetailsDialog
                key={beneficiary.id}
                beneficiaryId={beneficiary.id}
                onUpdate={() => fetchData(true)}
              >
                <div className={`
                  flex flex-col sm:flex-row justify-between items-start sm:items-center 
                  p-4 sm:p-5 cursor-pointer hover:bg-muted/50 transition-colors touch-target
                  ${index < paginatedBeneficiaries.length - 1 ? 'border-b' : ''}
                `}>
                  <div className="flex-1 min-w-0 mb-2 sm:mb-0">
                    <div className="font-medium text-sm sm:text-base truncate">
                      <SafeHighlightText text={beneficiary.name} highlight={searchTerm} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <SafeHighlightText text={beneficiary.phone} highlight={searchTerm} />
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground truncate">
                      {getPreacherName(beneficiary.da_i_id)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                      {beneficiary.da_wa_stage}
                    </Badge>
                    {beneficiary.batch && (
                      <Badge variant="secondary" className="text-xs">
                        {beneficiary.batch}
                      </Badge>
                    )}
                  </div>
                </div>
              </BeneficiaryDetailsDialog>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t bg-muted/30">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    Showing {Math.min((currentPage - 1) * pageSize + 1, filteredAndSortedBeneficiaries.length)} to{" "}
                    {Math.min(currentPage * pageSize, filteredAndSortedBeneficiaries.length)} of{" "}
                    {filteredAndSortedBeneficiaries.length} results
                  </span>

                  <div className="flex items-center gap-2">
                    <span>Show</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                    >
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                    <span>per page</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage <= 1}
                    title="First page"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    title="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum = i + 1
                      if (totalPages > 5) {
                        if (currentPage <= 3) pageNum = i + 1
                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                        else pageNum = currentPage - 2 + i
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "ghost"}
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    title="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage >= totalPages}
                    title="Last page"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}