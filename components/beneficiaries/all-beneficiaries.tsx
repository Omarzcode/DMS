"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { collection, getDocs } from "firebase/firestore"
import { Timestamp } from "firebase/firestore"   // Fix 4
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Users, Search, UserPlus, X, Download, TrendingUp,
  ArrowUpDown, ArrowUp, ArrowDown, Activity, RefreshCw,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  AlertCircle,
} from "lucide-react"
import type { Beneficiary, Preacher } from "@/lib/firestore-collections"
import { DAWA_STAGES } from "@/lib/firestore-collections"
import { AddBeneficiaryDialog } from "./add-beneficiary-dialog"
import { BeneficiaryDetailsDialog } from "./beneficiary-details-dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { StatsCard } from "@/components/ui/stats-card"
import { Skeleton } from "@/components/ui/skeleton"
import { ContactImportDialog } from "./contact-import-dialog"
import { DataHealthCheck } from "./data-health-check"

// ─── Types ────────────────────────────────────────────────────────

type SortField     = "name" | "phone" | "da_wa_stage" | "created_at"
type SortDirection = "asc" | "desc"

// Fix 3: Encode sort as a typed tuple string with a separator
// that won't appear in field names — use "|" instead of "-"
type SortValue = `${SortField}|${SortDirection}`

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

// Fix 15: Advanced stages derived from DAWA_STAGES constant
// Adjust the slice indices to match your actual stage ordering
const ADVANCED_STAGE_INDICES = [
  DAWA_STAGES.indexOf("متعلم ملتزم"),
  DAWA_STAGES.indexOf("مشارك نشط"),
  DAWA_STAGES.indexOf("قائد مجتمعي"),
].filter((i) => i !== -1)

const ADVANCED_STAGE_SET = new Set(
  ADVANCED_STAGE_INDICES.map((i) => DAWA_STAGES[i]).filter(Boolean)
)

// ─── Phone Utilities ──────────────────────────────────────────────

// Fix 4: Type-safe date extraction using Firestore Timestamp
function getDateValue(createdAt: unknown): Date {
  if (!createdAt) return new Date(0)
  if (createdAt instanceof Timestamp) return createdAt.toDate()
  if (createdAt instanceof Date)      return createdAt
  // Timestamp-like plain object (e.g. from JSON serialization)
  if (
    typeof createdAt === "object" &&
    createdAt !== null &&
    "seconds" in createdAt &&
    typeof (createdAt as { seconds: unknown }).seconds === "number"
  ) {
    return new Date((createdAt as { seconds: number }).seconds * 1000)
  }
  return new Date(0)
}

// ─── Regex Utilities ──────────────────────────────────────────────

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// Fix 7: Use content-based key instead of index
function SafeHighlightText({
  text,
  highlight,
  className,
}: {
  text: string
  highlight: string
  className?: string
}) {
  if (!highlight?.trim() || !text) {
    return <span className={className}>{text}</span>
  }

  try {
    const escaped = escapeRegExp(highlight.trim())
    const regex   = new RegExp(`(${escaped})`, "gi")
    const parts   = text.split(regex)
    const lowerHL = highlight.trim().toLowerCase()

    return (
      <span className={className}>
        {parts.map((part, i) =>
          part.toLowerCase() === lowerHL ? (
            // key combines index + content for stability
            <mark key={`${i}-${part}`} className="bg-primary/20 text-primary rounded-sm px-0.5">
              {part}
            </mark>
          ) : (
            <span key={`${i}-${part}`}>{part}</span>
          )
        )}
      </span>
    )
  } catch {
    return <span className={className}>{text}</span>
  }
}

// ─── Component ────────────────────────────────────────────────────

export function AllBeneficiaries() {
  const { userRole }  = useAuth()
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [preachers, setPreachers]         = useState<Preacher[]>([])
  const [loading, setLoading]             = useState(true)
  const [refreshing, setRefreshing]       = useState(false)
  // Fix 5: Error state
  const [fetchError, setFetchError]       = useState<string | null>(null)
  const [searchTerm, setSearchTerm]       = useState("")
  const [stageFilter, setStageFilter]     = useState<string>("all")
  const [preacherFilter, setPreacherFilter] = useState<string>("all")
  const [sortField, setSortField]         = useState<SortField>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [currentPage, setCurrentPage]     = useState(1)
  const [pageSize, setPageSize]           = useState(25)

  // ─── Data Fetching ────────────────────────────────────────────

  const fetchData = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true)
    setFetchError(null)

    try {
      const [beneficiariesSnapshot, preachersSnapshot] = await Promise.all([
        getDocs(collection(db, "beneficiaries")),
        getDocs(collection(db, "preachers")),
      ])
      setBeneficiaries(
        beneficiariesSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Beneficiary[]
      )
      setPreachers(
        preachersSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Preacher[]
      )
    } catch (err) {
      console.error("Error fetching data:", err)
      // Fix 5: Surface the error to the UI
      setFetchError("Failed to load data. Please try again.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Reset page when filters or page size changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, stageFilter, preacherFilter, sortField, sortDirection, pageSize])

  // ─── Derived Data ─────────────────────────────────────────────

  const getPreacherName = useCallback(
    (preacherId: string) =>
      preachers.find((p) => p.id === preacherId)?.name || "Unknown",
    [preachers]
  )

  const filteredAndSortedBeneficiaries = useMemo(() => {
    let result = [...beneficiaries]

    if (searchTerm.trim()) {
      const lowered = searchTerm.toLowerCase().trim()
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(lowered) ||
          b.phone.toLowerCase().includes(lowered)
      )
    }

    if (stageFilter !== "all") {
      result = result.filter((b) => b.da_wa_stage === stageFilter)
    }

    if (preacherFilter !== "all") {
      result = result.filter((b) => b.da_i_id === preacherFilter)
    }

    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name, "ar")
          break
        case "phone":
          comparison = a.phone.localeCompare(b.phone)
          break
        case "da_wa_stage": {
          const indexA = DAWA_STAGES.indexOf(a.da_wa_stage)
          const indexB = DAWA_STAGES.indexOf(b.da_wa_stage)
          comparison = indexA - indexB
          break
        }
        case "created_at": {
          // Fix 4: Use module-level getDateValue
          const dateA = getDateValue(a.created_at)
          const dateB = getDateValue(b.created_at)
          comparison = dateA.getTime() - dateB.getTime()
          break
        }
      }
      return sortDirection === "asc" ? comparison : -comparison
    })

    return result
  }, [beneficiaries, searchTerm, stageFilter, preacherFilter, sortField, sortDirection])

  // Fix 2: Memoize totalPages
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredAndSortedBeneficiaries.length / pageSize)),
    [filteredAndSortedBeneficiaries.length, pageSize]
  )

  // Fix 11: Clamp currentPage when totalPages shrinks
  const safePage = Math.min(currentPage, totalPages)

  const paginatedBeneficiaries = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredAndSortedBeneficiaries.slice(start, start + pageSize)
  }, [filteredAndSortedBeneficiaries, safePage, pageSize])

  // Fix 10: Memoize hasActiveFilters
  const hasActiveFilters = useMemo(
    () => Boolean(searchTerm || stageFilter !== "all" || preacherFilter !== "all"),
    [searchTerm, stageFilter, preacherFilter]
  )

  const stats = useMemo(() => {
    const now       = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const activeThisMonth = beneficiaries.filter((b) => {
      const date = getDateValue(b.created_at)
      return date >= thisMonth
    }).length

    // Fix 15: Use ADVANCED_STAGE_SET instead of hardcoded Arabic strings
    const advancedStage = beneficiaries.filter((b) =>
      ADVANCED_STAGE_SET.has(b.da_wa_stage)
    ).length

    return { activeThisMonth, advancedStage }
  }, [beneficiaries])

  // ─── Handlers ─────────────────────────────────────────────────

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
    return sortDirection === "asc"
      ? <ArrowUp className="h-3 w-3 text-primary" />
      : <ArrowDown className="h-3 w-3 text-primary" />
  }

  const exportToCSV = () => {
    // Fix 9: Include Notes and Created At columns
    const BOM     = "\uFEFF"
    const headers = ["Name", "Phone", "Preacher", "Batch", "Stage", "Notes", "Created At"]
    const rows    = filteredAndSortedBeneficiaries.map((b) => [
      b.name,
      b.phone,
      getPreacherName(b.da_i_id),
      b.batch  || "",
      b.da_wa_stage,
      b.notes  || "",
      getDateValue(b.created_at).toLocaleDateString(),
    ])

    const csv = BOM + [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${(cell || "").replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href  = URL.createObjectURL(blob)
    link.download = `beneficiaries_${new Date().toISOString().split("T")[0]}.csv`
    link.click()

    // Fix 16: Revoke after a tick to ensure download starts
    setTimeout(() => URL.revokeObjectURL(link.href), 100)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStageFilter("all")
    setPreacherFilter("all")
    setSortField("name")
    setSortDirection("asc")
  }

  // Fix 3: Sort value uses "|" separator — safe for all field names
  const sortValue: SortValue = `${sortField}|${sortDirection}`

  const handleSortValueChange = (value: string) => {
    const separatorIndex = value.lastIndexOf("|")
    if (separatorIndex === -1) return
    const field = value.slice(0, separatorIndex) as SortField
    const dir   = value.slice(separatorIndex + 1) as SortDirection
    setSortField(field)
    setSortDirection(dir)
  }

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Users className="h-5 w-5 sm:h-6 sm:w-6" />
            <h2 className="text-lg sm:text-2xl font-bold truncate">All Beneficiaries</h2>
            <Badge variant="secondary" className="text-xs">{beneficiaries.length}</Badge>
          </div>

          <div className="flex items-center gap-1 w-full sm:w-auto flex-wrap">
            {/* Fix 13: aria-label on icon-only button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fetchData(true)}
              disabled={refreshing}
              aria-label="Refresh data"
              title="Refresh data"
              className="h-9 w-9 sm:h-10 sm:w-10"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              disabled={loading || filteredAndSortedBeneficiaries.length === 0}
            >
              {/* Fix 12: mr-2 not ml-2 */}
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">
                Export ({filteredAndSortedBeneficiaries.length})
              </span>
            </Button>

            <DataHealthCheck
              beneficiaries={beneficiaries}
              preachers={preachers}
              onDataChanged={() => fetchData(true)}
            />
            <ContactImportDialog onImportComplete={() => fetchData(true)} />
            <AddBeneficiaryDialog onBeneficiaryAdded={() => fetchData(true)} />
          </div>
        </div>
      </div>

      {/* Fix 5: Error banner */}
      {fetchError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            {fetchError}
            <Button variant="ghost" size="sm" onClick={() => fetchData()} className="ml-4">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatsCard title="Total Beneficiaries" value={beneficiaries.length}                        icon={Users}     />
          <StatsCard title="Search Results"       value={filteredAndSortedBeneficiaries.length}       icon={Search}    />
          <StatsCard title="New This Month"        value={stats.activeThisMonth}                       icon={Activity}  />
          <StatsCard title="Advanced Stages"       value={stats.advancedStage}                         icon={TrendingUp}/>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10 pl-10 h-10 sm:h-11"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchTerm("")}
              aria-label="Clear search"
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

          {/* Fix 3: Sort uses "|" separator */}
          <Select value={sortValue} onValueChange={handleSortValueChange}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name|asc">Name (A → Z)</SelectItem>
              <SelectItem value="name|desc">Name (Z → A)</SelectItem>
              <SelectItem value="created_at|desc">Newest First</SelectItem>
              <SelectItem value="created_at|asc">Oldest First</SelectItem>
              <SelectItem value="da_wa_stage|asc">Stage (Ascending)</SelectItem>
              <SelectItem value="da_wa_stage|desc">Stage (Descending)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Active filters:</span>

            {searchTerm && (
              <Badge variant="secondary" className="gap-2">
                Search: {searchTerm}
                {/* Fix 17: aria-label on filter X buttons */}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  role="button"
                  aria-label="Clear search filter"
                  onClick={() => setSearchTerm("")}
                />
              </Badge>
            )}

            {stageFilter !== "all" && (
              <Badge variant="secondary" className="gap-2">
                Stage: {stageFilter}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  role="button"
                  aria-label="Clear stage filter"
                  onClick={() => setStageFilter("all")}
                />
              </Badge>
            )}

            {preacherFilter !== "all" && (
              <Badge variant="secondary" className="gap-2">
                Preacher: {getPreacherName(preacherFilter)}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  role="button"
                  aria-label="Clear preacher filter"
                  onClick={() => setPreacherFilter("all")}
                />
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
              <div key={i} className="flex items-center justify-between p-4">
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
            action={
              !hasActiveFilters && (
                <AddBeneficiaryDialog onBeneficiaryAdded={() => fetchData(true)} />
              )
            }
          />
        ) : (
          <>
            {/* Column Sort Headers */}
            <div className="hidden sm:flex items-center px-5 py-3 bg-muted/50 border-b text-xs text-muted-foreground font-medium gap-4">
              <button
                className="flex-1 flex items-center gap-1 hover:text-foreground transition-colors text-left"
                onClick={() => handleSort("name")}
                aria-label="Sort by name"
              >
                Name {getSortIcon("name")}
              </button>
              <button
                className="w-32 flex items-center gap-1 hover:text-foreground transition-colors text-left"
                onClick={() => handleSort("da_wa_stage")}
                aria-label="Sort by stage"
              >
                Stage {getSortIcon("da_wa_stage")}
              </button>
              <div className="w-20 text-center">Batch</div>
            </div>

            {/* Fix 14: Each row is keyboard-accessible */}
            {paginatedBeneficiaries.map((beneficiary, index) => (
              <BeneficiaryDetailsDialog
                key={beneficiary.id}
                beneficiaryId={beneficiary.id}
                onUpdate={() => fetchData(true)}
              >
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`View details for ${beneficiary.name}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") e.currentTarget.click()
                  }}
                  className={[
                    "flex flex-col sm:flex-row justify-between items-start sm:items-center",
                    "p-4 sm:p-5 cursor-pointer hover:bg-muted/50 transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
                    index < paginatedBeneficiaries.length - 1 ? "border-b" : "",
                  ].join(" ")}
                >
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
                    Showing{" "}
                    {Math.min((safePage - 1) * pageSize + 1, filteredAndSortedBeneficiaries.length)}{" "}
                    to{" "}
                    {Math.min(safePage * pageSize, filteredAndSortedBeneficiaries.length)}{" "}
                    of {filteredAndSortedBeneficiaries.length} results
                  </span>

                  <div className="flex items-center gap-2">
                    <span>Show</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                      aria-label="Results per page"
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
                    variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => setCurrentPage(1)}
                    disabled={safePage <= 1}
                    aria-label="First page"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {/* Fix 11: Clamped page window */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (safePage <= 3) {
                        pageNum = i + 1
                      } else if (safePage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = safePage - 2 + i
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={safePage === pageNum ? "default" : "ghost"}
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setCurrentPage(pageNum)}
                          aria-label={`Go to page ${pageNum}`}
                          aria-current={safePage === pageNum ? "page" : undefined}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>

                  <Button
                    variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={safePage >= totalPages}
                    aria-label="Last page"
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