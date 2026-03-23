"use client"

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react"
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  deleteField,
  query,
  where,
} from "firebase/firestore"
import { Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import {
  Users,
  Search,
  UserPlus,
  X,
  Download,
  TrendingUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Activity,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertCircle,
  Archive,
  ArchiveRestore,
  Loader2,
  Trash2,
  ArrowRightLeft,
  PencilLine,
  CheckSquare,
  XSquare,
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────────

type SortField = "name" | "phone" | "da_wa_stage" | "created_at"
type SortDirection = "asc" | "desc"
type SortValue = `${SortField}|${SortDirection}`
type ViewTab = "active" | "archived"

// Which bulk sheet is open
type BulkSheet = "transfer" | "edit" | "delete" | null

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]
const FIRESTORE_BATCH_LIMIT = 500

const ADVANCED_STAGE_INDICES = [
  DAWA_STAGES.indexOf("متعلم ملتزم"),
].filter((i) => i !== -1)

const ADVANCED_STAGE_SET = new Set(
  ADVANCED_STAGE_INDICES.map((i) => DAWA_STAGES[i]).filter(Boolean)
)

// ─── Utilities ────────────────────────────────────────────────────

function getDateValue(createdAt: unknown): Date {
  if (!createdAt) return new Date(0)
  if (createdAt instanceof Timestamp) return createdAt.toDate()
  if (createdAt instanceof Date) return createdAt
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

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function SafeHighlightText({
  text,
  highlight,
  className,
}: {
  text: string
  highlight: string
  className?: string
}) {
  if (!highlight?.trim() || !text)
    return <span className={className}>{text}</span>
  try {
    const escaped = escapeRegExp(highlight.trim())
    const regex = new RegExp(`(${escaped})`, "gi")
    const parts = text.split(regex)
    const lowerHL = highlight.trim().toLowerCase()
    return (
      <span className={className}>
        {parts.map((part, i) =>
          part.toLowerCase() === lowerHL ? (
            <mark
              key={`${i}-${part}`}
              className="bg-primary/20 text-primary rounded-sm px-0.5"
            >
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

// ─── BeneficiaryInfo ─────────────────────────────────────────────

function BeneficiaryInfo({
  beneficiary,
  searchTerm,
  preacherName,
}: {
  beneficiary: Beneficiary
  searchTerm: string
  preacherName: string
}) {
  return (
    <>
      <div className="font-medium text-sm sm:text-base truncate">
        <SafeHighlightText text={beneficiary.name} highlight={searchTerm} />
      </div>
      <div className="text-xs text-muted-foreground">
        <SafeHighlightText text={beneficiary.phone} highlight={searchTerm} />
      </div>
      <div className="text-xs sm:text-sm text-muted-foreground truncate">
        {preacherName}
      </div>
    </>
  )
}

// ─── Component ────────────────────────────────────────────────────

export function AllBeneficiaries() {
  const { userRole } = useAuth()

  // ── Data ──────────────────────────────────────────────────────
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [preachers, setPreachers] = useState<Preacher[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // ── Selection ─────────────────────────────────────────────────
  // Persists across tab switches (as requested)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // ── Bulk action sheets ────────────────────────────────────────
  const [bulkSheet, setBulkSheet] = useState<BulkSheet>(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  // Transfer sheet state
  const [bulkTransferPreacher, setBulkTransferPreacher] = useState("")
  // Edit sheet state
  const [bulkEditStage, setBulkEditStage] = useState<string>("")
  const [bulkEditBatch, setBulkEditBatch] = useState<string>("")
  // Delete confirm
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)

  // ── Restore ───────────────────────────────────────────────────
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null)

  // ── Filters ───────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ViewTab>("active")
  const [searchTerm, setSearchTerm] = useState("")
  const [stageFilter, setStageFilter] = useState<string>("all")
  const [preacherFilter, setPreacherFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // ─── Fetch ───────────────────────────────────────────────────

  const fetchData = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true)
    setFetchError(null)

    try {
      const [benefSnap, preachSnap] = await Promise.all([
        getDocs(collection(db, "beneficiaries")),
        getDocs(collection(db, "preachers")),
      ])

      setBeneficiaries(
        benefSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Beneficiary)
      )
      setPreachers(
        preachSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Preacher)
      )
    } catch (err) {
      console.error("Error fetching data:", err)
      setFetchError("Failed to load data. Please try again.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Reset page on filter/tab change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, stageFilter, preacherFilter, sortField, sortDirection, pageSize, activeTab])

  // ─── Active / Archived split ──────────────────────────────────

  const activeBeneficiaries = useMemo(
    () => beneficiaries.filter((b) => !b.deleted),
    [beneficiaries]
  )
  const archivedBeneficiaries = useMemo(
    () => beneficiaries.filter((b) => b.deleted === true),
    [beneficiaries]
  )

  const currentPool =
    activeTab === "active" ? activeBeneficiaries : archivedBeneficiaries

  // ─── Derived / filtered list ──────────────────────────────────

  const getPreacherName = useCallback(
    (id: string) => preachers.find((p) => p.id === id)?.name || "Unknown",
    [preachers]
  )

  const filteredAndSorted = useMemo(() => {
    let result = [...currentPool]

    if (searchTerm.trim()) {
      const low = searchTerm.toLowerCase().trim()
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(low) ||
          b.phone.toLowerCase().includes(low)
      )
    }

    if (stageFilter !== "all")
      result = result.filter((b) => b.da_wa_stage === stageFilter)

    if (preacherFilter !== "all")
      result = result.filter((b) => b.da_i_id === preacherFilter)

    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name, "ar")
          break
        case "phone":
          cmp = a.phone.localeCompare(b.phone)
          break
        case "da_wa_stage":
          cmp =
            DAWA_STAGES.indexOf(a.da_wa_stage) -
            DAWA_STAGES.indexOf(b.da_wa_stage)
          break
        case "created_at":
          cmp =
            getDateValue(a.created_at).getTime() -
            getDateValue(b.created_at).getTime()
          break
      }
      return sortDirection === "asc" ? cmp : -cmp
    })

    return result
  }, [currentPool, searchTerm, stageFilter, preacherFilter, sortField, sortDirection])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredAndSorted.length / pageSize)),
    [filteredAndSorted.length, pageSize]
  )

  const safePage = Math.min(currentPage, totalPages)

  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredAndSorted.slice(start, start + pageSize)
  }, [filteredAndSorted, safePage, pageSize])

  const hasActiveFilters = useMemo(
    () => Boolean(searchTerm || stageFilter !== "all" || preacherFilter !== "all"),
    [searchTerm, stageFilter, preacherFilter]
  )

  const stats = useMemo(() => {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    return {
      activeThisMonth: activeBeneficiaries.filter(
        (b) => getDateValue(b.created_at) >= thisMonth
      ).length,
      advancedStage: activeBeneficiaries.filter((b) =>
        ADVANCED_STAGE_SET.has(b.da_wa_stage)
      ).length,
    }
  }, [activeBeneficiaries])

  // ─── Selection helpers ────────────────────────────────────────

  // All filtered IDs (across all pages)
  const allFilteredIds = useMemo(
    () => new Set(filteredAndSorted.map((b) => b.id)),
    [filteredAndSorted]
  )

  const selectedCount = useMemo(
    () => [...selectedIds].filter((id) => allFilteredIds.has(id)).length,
    [selectedIds, allFilteredIds]
  )

  // Are all filtered results selected?
  const allFilteredSelected =
    allFilteredIds.size > 0 &&
    [...allFilteredIds].every((id) => selectedIds.has(id))

  const someSelected = selectedCount > 0

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  // Toggle ALL filtered results (not just current page)
  const toggleAllFiltered = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allFilteredSelected) {
        allFilteredIds.forEach((id) => next.delete(id))
      } else {
        allFilteredIds.forEach((id) => next.add(id))
      }
      return next
    })
  }, [allFilteredSelected, allFilteredIds])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  // The actual Beneficiary objects that are selected (within current filter)
  const selectedBeneficiaries = useMemo(
    () => filteredAndSorted.filter((b) => selectedIds.has(b.id)),
    [filteredAndSorted, selectedIds]
  )

  // ─── Bulk handlers ────────────────────────────────────────────

  // Helper: run updateDoc in batches and update local state
  const runBulkUpdate = useCallback(
    async (
      updates: { id: string; data: Record<string, unknown> }[],
      successMsg: string,
      successDesc: string
    ) => {
      setBulkBusy(true)
      try {
        for (let i = 0; i < updates.length; i += FIRESTORE_BATCH_LIMIT) {
          const batch = writeBatch(db)
          updates.slice(i, i + FIRESTORE_BATCH_LIMIT).forEach(({ id, data }) => {
            batch.update(doc(db, "beneficiaries", id), data)
          })
          await batch.commit()
        }

        // Optimistic local update
        setBeneficiaries((prev) =>
          prev.map((b) => {
            const upd = updates.find((u) => u.id === b.id)
            return upd ? { ...b, ...upd.data } : b
          })
        )

        toast.success(successMsg, { description: successDesc })
        setBulkSheet(null)
        clearSelection()
      } catch (err) {
        console.error("Bulk update failed:", err)
        toast.error("Bulk action failed", {
          description: "An error occurred. Please try again.",
        })
      } finally {
        setBulkBusy(false)
      }
    },
    [clearSelection]
  )

  // ── Bulk Archive ──────────────────────────────────────────────
  const handleBulkArchive = useCallback(async () => {
    const ids = [...selectedIds].filter((id) => allFilteredIds.has(id))
    await runBulkUpdate(
      ids.map((id) => ({
        id,
        data: { deleted: true, deletedAt: serverTimestamp() },
      })),
      `${ids.length} beneficiar${ids.length === 1 ? "y" : "ies"} archived`,
      "They can be restored from the Archived tab."
    )
  }, [selectedIds, allFilteredIds, runBulkUpdate])

  // ── Bulk Restore ─────────────────────────────────────────────
  const handleBulkRestore = useCallback(async () => {
    const ids = [...selectedIds].filter((id) => allFilteredIds.has(id))
    await runBulkUpdate(
      ids.map((id) => ({
        id,
        data: { deleted: deleteField(), deletedAt: deleteField() },
      })),
      `${ids.length} beneficiar${ids.length === 1 ? "y" : "ies"} restored`,
      "They have been moved back to the active list."
    )
  }, [selectedIds, allFilteredIds, runBulkUpdate])

  // ── Bulk Transfer ─────────────────────────────────────────────
  const handleBulkTransfer = useCallback(async () => {
    if (!bulkTransferPreacher) return
    const preacher = preachers.find((p) => p.id === bulkTransferPreacher)
    const ids = [...selectedIds].filter((id) => allFilteredIds.has(id))
    await runBulkUpdate(
      ids.map((id) => ({ id, data: { da_i_id: bulkTransferPreacher } })),
      `${ids.length} beneficiar${ids.length === 1 ? "y" : "ies"} transferred`,
      `Assigned to ${preacher?.name ?? "new preacher"}.`
    )
    setBulkTransferPreacher("")
  }, [
    bulkTransferPreacher,
    preachers,
    selectedIds,
    allFilteredIds,
    runBulkUpdate,
  ])

  // ── Bulk Edit (stage + batch) ─────────────────────────────────
  const handleBulkEdit = useCallback(async () => {
    if (!bulkEditStage && !bulkEditBatch.trim()) return
    const ids = [...selectedIds].filter((id) => allFilteredIds.has(id))
    const data: Record<string, string> = {}
    if (bulkEditStage) data.da_wa_stage = bulkEditStage
    if (bulkEditBatch.trim()) data.batch = bulkEditBatch.trim()

    await runBulkUpdate(
      ids.map((id) => ({ id, data })),
      `${ids.length} beneficiar${ids.length === 1 ? "y" : "ies"} updated`,
      "Stage / batch changes have been saved."
    )
    setBulkEditStage("")
    setBulkEditBatch("")
  }, [bulkEditStage, bulkEditBatch, selectedIds, allFilteredIds, runBulkUpdate])

  // ── Bulk Permanent Delete (admin only) ───────────────────────
  const handleBulkPermanentDelete = useCallback(async () => {
    setShowBulkDeleteConfirm(false)
    setBulkBusy(true)
    const ids = [...selectedIds].filter((id) => allFilteredIds.has(id))

    try {
      for (const id of ids) {
        // attendance
        const attSnap = await getDocs(
          query(
            collection(db, "attendance"),
            where("beneficiary_id", "==", id)
          )
        )
        if (attSnap.size > 0) {
          const docs = attSnap.docs
          for (let i = 0; i < docs.length; i += FIRESTORE_BATCH_LIMIT) {
            const batch = writeBatch(db)
            docs
              .slice(i, i + FIRESTORE_BATCH_LIMIT)
              .forEach((d) => batch.delete(d.ref))
            await batch.commit()
          }
        }

        // progress_logs
        const logsSnap = await getDocs(
          collection(db, "beneficiaries", id, "progress_logs")
        )
        if (logsSnap.size > 0) {
          const docs = logsSnap.docs
          for (let i = 0; i < docs.length; i += FIRESTORE_BATCH_LIMIT) {
            const batch = writeBatch(db)
            docs
              .slice(i, i + FIRESTORE_BATCH_LIMIT)
              .forEach((d) => batch.delete(d.ref))
            await batch.commit()
          }
        }

        // beneficiary doc
        await deleteDoc(doc(db, "beneficiaries", id))
      }

      // Remove from local state
      setBeneficiaries((prev) => prev.filter((b) => !ids.includes(b.id)))

      toast.success(
        `${ids.length} beneficiar${ids.length === 1 ? "y" : "ies"} permanently deleted`
      )
      clearSelection()
    } catch (err) {
      console.error("Bulk delete failed:", err)
      toast.error("Bulk delete failed", {
        description: "An error occurred. Please try again.",
      })
    } finally {
      setBulkBusy(false)
    }
  }, [selectedIds, allFilteredIds, clearSelection])

  // ── Single restore ────────────────────────────────────────────
  const handleRestore = useCallback(async (beneficiary: Beneficiary) => {
    setRestoringId(beneficiary.id)
    try {
      await updateDoc(doc(db, "beneficiaries", beneficiary.id), {
        deleted: deleteField(),
        deletedAt: deleteField(),
      })
      toast.success("Beneficiary restored", {
        description: `"${beneficiary.name}" is now active again.`,
      })
      setBeneficiaries((prev) =>
        prev.map((b) =>
          b.id === beneficiary.id
            ? { ...b, deleted: undefined, deletedAt: undefined }
            : b
        )
      )
    } catch (err) {
      console.error("Restore failed:", err)
      toast.error("Restore failed", {
        description: "An error occurred. Please try again.",
      })
    } finally {
      setRestoringId(null)
      setConfirmRestoreId(null)
    }
  }, [])

  // ─── Sort helpers ─────────────────────────────────────────────

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((p) => (p === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field)
      return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
    return sortDirection === "asc"
      ? <ArrowUp className="h-3 w-3 text-primary" />
      : <ArrowDown className="h-3 w-3 text-primary" />
  }

  const exportToCSV = () => {
    const BOM = "\uFEFF"
    const headers = ["Name", "Phone", "Preacher", "Batch", "Stage", "Notes", "Created At"]
    const rows = filteredAndSorted.map((b) => [
      b.name,
      b.phone,
      getPreacherName(b.da_i_id),
      b.batch || "",
      b.da_wa_stage,
      b.notes || "",
      getDateValue(b.created_at).toLocaleDateString(),
    ])
    const csv =
      BOM +
      [
        headers.join(","),
        ...rows.map((row) =>
          row
            .map((cell) => `"${(cell || "").replace(/"/g, '""')}"`)
            .join(",")
        ),
      ].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `beneficiaries_${activeTab}_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 100)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStageFilter("all")
    setPreacherFilter("all")
    setSortField("name")
    setSortDirection("asc")
  }

  const sortValue: SortValue = `${sortField}|${sortDirection}`

  const handleSortValueChange = (value: string) => {
    const sep = value.lastIndexOf("|")
    if (sep === -1) return
    setSortField(value.slice(0, sep) as SortField)
    setSortDirection(value.slice(sep + 1) as SortDirection)
  }

  // ─── Bulk action toolbar ──────────────────────────────────────

  const BulkToolbar = () => {
    if (!someSelected) return null

    return (
      <div
        className="sticky top-0 z-30 flex flex-wrap items-center gap-2
                   rounded-lg border border-primary/30 bg-primary/5
                   px-4 py-2.5 shadow-sm"
      >
        {/* Count + clear */}
        <div className="flex items-center gap-2 mr-2">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {selectedCount} selected
          </span>
          <button
            onClick={clearSelection}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear selection"
          >
            <XSquare className="h-4 w-4" />
          </button>
        </div>

        <div className="h-4 w-px bg-border mx-1" />

        {/* Transfer */}
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 h-8"
          onClick={() => setBulkSheet("transfer")}
          disabled={bulkBusy}
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
          Transfer
        </Button>

        {/* Edit */}
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 h-8"
          onClick={() => setBulkSheet("edit")}
          disabled={bulkBusy}
        >
          <PencilLine className="h-3.5 w-3.5" />
          Edit
        </Button>

        {/* Archive / Restore depending on tab */}
        {activeTab === "active" ? (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 h-8"
            onClick={handleBulkArchive}
            disabled={bulkBusy}
          >
            {bulkBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Archive className="h-3.5 w-3.5" />
            )}
            Archive
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 h-8"
            onClick={handleBulkRestore}
            disabled={bulkBusy}
          >
            {bulkBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ArchiveRestore className="h-3.5 w-3.5" />
            )}
            Restore
          </Button>
        )}

        {/* Permanent delete — admin only */}
        {userRole === "admin" && (
          <>
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5 h-8"
              onClick={() => setShowBulkDeleteConfirm(true)}
              disabled={bulkBusy}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Forever
            </Button>

            <ConfirmDialog
              open={showBulkDeleteConfirm}
              onOpenChange={setShowBulkDeleteConfirm}
              onConfirm={handleBulkPermanentDelete}
              title={`Permanently delete ${selectedCount} beneficiar${selectedCount === 1 ? "y" : "ies"}?`}
              description="This cannot be undone. All attendance records and progress logs for every selected beneficiary will be erased forever."
              confirmText="Yes, Delete Forever"
              cancelText="Cancel"
            />
          </>
        )}
      </div>
    )
  }

  // ─── Shared list renderer ─────────────────────────────────────

  const renderList = () => (
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
      ) : filteredAndSorted.length === 0 ? (
        <EmptyState
          icon={activeTab === "archived" ? Archive : UserPlus}
          title={
            hasActiveFilters
              ? "No results found"
              : activeTab === "archived"
                ? "No archived beneficiaries"
                : "No beneficiaries yet"
          }
          description={
            hasActiveFilters
              ? "No beneficiaries match your current search criteria."
              : activeTab === "archived"
                ? "Beneficiaries you archive will appear here."
                : "Start by adding new beneficiaries to track their progress."
          }
          action={
            !hasActiveFilters && activeTab === "active" ? (
              <AddBeneficiaryDialog onBeneficiaryAdded={() => fetchData(true)} />
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Column headers */}
          <div
            className="hidden sm:flex items-center px-5 py-3 bg-muted/50 border-b
                       text-xs text-muted-foreground font-medium gap-4"
          >
            {/* Select-all checkbox */}
            <div className="flex items-center gap-3 w-8">
              <Checkbox
                checked={allFilteredSelected}
                onCheckedChange={toggleAllFiltered}
                aria-label="Select all filtered beneficiaries"
              />
            </div>

            <button
              className="flex-1 flex items-center gap-1 hover:text-foreground
                         transition-colors text-left"
              onClick={() => handleSort("name")}
              aria-label="Sort by name"
            >
              Name {getSortIcon("name")}
            </button>
            <button
              className="w-32 flex items-center gap-1 hover:text-foreground
                         transition-colors text-left"
              onClick={() => handleSort("da_wa_stage")}
              aria-label="Sort by stage"
            >
              Stage {getSortIcon("da_wa_stage")}
            </button>
            <div className="w-20 text-center">Batch</div>
            {activeTab === "archived" && (
              <div className="w-24 text-center">Restore</div>
            )}
          </div>

          {/* Rows */}
          {paginated.map((beneficiary, index) => {
            const isChecked = selectedIds.has(beneficiary.id)
            const isRestoring = restoringId === beneficiary.id
            const restoreTarget =
              confirmRestoreId === beneficiary.id
                ? beneficiaries.find((b) => b.id === confirmRestoreId) ?? null
                : null

            return (
              <div
                key={beneficiary.id}
                className={[
                  "flex flex-col sm:flex-row justify-between items-start sm:items-center",
                  "p-4 sm:p-5 transition-colors",
                  isChecked ? "bg-primary/5" : "",
                  index < paginated.length - 1 ? "border-b" : "",
                ].join(" ")}
              >
                {/* Checkbox — stops propagation so row click still works */}
                <div
                  className="flex-shrink-0 mr-3 mt-0.5 sm:mt-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => toggleOne(beneficiary.id)}
                    aria-label={`Select ${beneficiary.name}`}
                  />
                </div>

                {/* Info — active rows open detail dialog, archived rows are static */}
                {activeTab === "active" ? (
                  <BeneficiaryDetailsDialog
                    beneficiaryId={beneficiary.id}
                    onUpdate={() => fetchData(true)}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={`View details for ${beneficiary.name}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          e.currentTarget.click()
                      }}
                      className="flex-1 min-w-0 mb-2 sm:mb-0 cursor-pointer
                                 hover:opacity-80 transition-opacity
                                 focus-visible:outline-none focus-visible:ring-2
                                 focus-visible:ring-primary focus-visible:ring-inset"
                    >
                      <BeneficiaryInfo
                        beneficiary={beneficiary}
                        searchTerm={searchTerm}
                        preacherName={getPreacherName(beneficiary.da_i_id)}
                      />
                    </div>
                  </BeneficiaryDetailsDialog>
                ) : (
                  <div className="flex-1 min-w-0 mb-2 sm:mb-0 opacity-60">
                    <BeneficiaryInfo
                      beneficiary={beneficiary}
                      searchTerm={searchTerm}
                      preacherName={getPreacherName(beneficiary.da_i_id)}
                    />
                  </div>
                )}

                {/* Badges + optional single restore */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                    {beneficiary.da_wa_stage}
                  </Badge>
                  {beneficiary.batch && (
                    <Badge variant="secondary" className="text-xs">
                      {beneficiary.batch}
                    </Badge>
                  )}

                  {activeTab === "archived" && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs"
                        disabled={isRestoring}
                        onClick={() => setConfirmRestoreId(beneficiary.id)}
                      >
                        {isRestoring ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ArchiveRestore className="h-3.5 w-3.5" />
                        )}
                        Restore
                      </Button>

                      <ConfirmDialog
                        open={restoreTarget !== null}
                        onOpenChange={(open) => {
                          if (!open) setConfirmRestoreId(null)
                        }}
                        onConfirm={() =>
                          restoreTarget && handleRestore(restoreTarget)
                        }
                        title="Restore this beneficiary?"
                        description={`"${beneficiary.name}" will be moved back to the active list.`}
                        confirmText="Yes, Restore"
                        cancelText="Cancel"
                      />
                    </>
                  )}
                </div>
              </div>
            )
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className="flex flex-col sm:flex-row items-center justify-between
                         gap-3 px-4 py-3 border-t bg-muted/30"
            >
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  Showing{" "}
                  {Math.min(
                    (safePage - 1) * pageSize + 1,
                    filteredAndSorted.length
                  )}{" "}
                  to{" "}
                  {Math.min(safePage * pageSize, filteredAndSorted.length)} of{" "}
                  {filteredAndSorted.length} results
                </span>

                <div className="flex items-center gap-2">
                  <span                  >Show</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="h-8 rounded-md border border-border bg-background
                               px-2 text-sm"
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

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) pageNum = i + 1
                    else if (safePage <= 3) pageNum = i + 1
                    else if (safePage >= totalPages - 2) pageNum = totalPages - 4 + i
                    else pageNum = safePage - 2 + i

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
  )

  // ─── Main render ──────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Bulk action sheets ───────────────────────────────── */}

      {/* Transfer Sheet */}
      <Sheet
        open={bulkSheet === "transfer"}
        onOpenChange={(open) => {
          if (!open) {
            setBulkSheet(null)
            setBulkTransferPreacher("")
          }
        }}
      >
        <SheetContent side="bottom" className="sm:max-w-lg sm:mx-auto rounded-t-xl">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Transfer {selectedCount} Beneficiar{selectedCount === 1 ? "y" : "ies"}
            </SheetTitle>
            <SheetDescription>
              Assign all selected beneficiaries to a different preacher.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="bulk-transfer-preacher">Select Preacher</Label>
              <Select
                value={bulkTransferPreacher}
                onValueChange={setBulkTransferPreacher}
              >
                <SelectTrigger id="bulk-transfer-preacher">
                  <SelectValue placeholder="Choose a preacher…" />
                </SelectTrigger>
                <SelectContent>
                  {preachers
                    .filter((p) => p.role === "da'i")
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview */}
            {bulkTransferPreacher && (
              <p className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded-md">
                {selectedCount} beneficiar{selectedCount === 1 ? "y" : "ies"} will be
                assigned to{" "}
                <span className="font-medium text-foreground">
                  {preachers.find((p) => p.id === bulkTransferPreacher)?.name}
                </span>
                .
              </p>
            )}
          </div>

          <SheetFooter className="mt-6 flex-row gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setBulkSheet(null)
                setBulkTransferPreacher("")
              }}
              disabled={bulkBusy}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkTransfer}
              disabled={!bulkTransferPreacher || bulkBusy}
              className="gap-2"
            >
              {bulkBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              Transfer
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Edit Sheet */}
      <Sheet
        open={bulkSheet === "edit"}
        onOpenChange={(open) => {
          if (!open) {
            setBulkSheet(null)
            setBulkEditStage("")
            setBulkEditBatch("")
          }
        }}
      >
        <SheetContent side="bottom" className="sm:max-w-lg sm:mx-auto rounded-t-xl">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <PencilLine className="h-5 w-5" />
              Edit {selectedCount} Beneficiar{selectedCount === 1 ? "y" : "ies"}
            </SheetTitle>
            <SheetDescription>
              Only filled fields will be updated. Leave a field blank to keep
              each beneficiary's existing value.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 py-2">
            {/* Stage */}
            <div className="space-y-2">
              <Label htmlFor="bulk-edit-stage">Da'wa Stage</Label>
              <Select
                value={bulkEditStage}
                onValueChange={(v) => setBulkEditStage(v === "__keep__" ? "" : v)}
              >
                <SelectTrigger id="bulk-edit-stage">
                  <SelectValue placeholder="Keep existing stages…" />
                </SelectTrigger>
                <SelectContent>
                  {/* ✅ Use a real non-empty sentinel instead of "" */}
                  <SelectItem value="__keep__">Keep existing</SelectItem>
                  {DAWA_STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Batch */}
            <div className="space-y-2">
              <Label htmlFor="bulk-edit-batch">Batch</Label>
              <Input
                id="bulk-edit-batch"
                placeholder="Keep existing batches…"
                value={bulkEditBatch}
                onChange={(e) => setBulkEditBatch(e.target.value)}
              />
            </div>

            {/* Preview */}
            {(bulkEditStage || bulkEditBatch.trim()) && (
              <div className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded-md space-y-1">
                <p className="font-medium text-foreground mb-1">
                  Changes to apply to {selectedCount} beneficiar
                  {selectedCount === 1 ? "y" : "ies"}:
                </p>
                {bulkEditStage && (
                  <p>
                    Stage →{" "}
                    <span className="font-medium text-foreground">
                      {bulkEditStage}
                    </span>
                  </p>
                )}
                {bulkEditBatch.trim() && (
                  <p>
                    Batch →{" "}
                    <span className="font-medium text-foreground">
                      {bulkEditBatch.trim()}
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>

          <SheetFooter className="mt-6 flex-row gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setBulkSheet(null)
                setBulkEditStage("")
                setBulkEditBatch("")
              }}
              disabled={bulkBusy}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkEdit}
              disabled={(!bulkEditStage && !bulkEditBatch.trim()) || bulkBusy}
              className="gap-2"
            >
              {bulkBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              Apply Changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center
                        justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Users className="h-5 w-5 sm:h-6 sm:w-6" />
            <h2 className="text-lg sm:text-2xl font-bold truncate">
              All Beneficiaries
            </h2>
            <Badge variant="secondary" className="text-xs">
              {activeBeneficiaries.length}
            </Badge>
            {archivedBeneficiaries.length > 0 && (
              <Badge variant="outline" className="text-xs gap-1">
                <Archive className="h-3 w-3" />
                {archivedBeneficiaries.length} archived
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1 w-full sm:w-auto flex-wrap">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fetchData(true)}
              disabled={refreshing}
              aria-label="Refresh data"
              title="Refresh data"
              className="h-9 w-9 sm:h-10 sm:w-10"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              disabled={loading || filteredAndSorted.length === 0}
            >
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">
                Export ({filteredAndSorted.length})
              </span>
            </Button>

            <DataHealthCheck
              beneficiaries={activeBeneficiaries}
              preachers={preachers}
              onDataChanged={() => fetchData(true)}
            />
            <ContactImportDialog onImportComplete={() => fetchData(true)} />
            <AddBeneficiaryDialog onBeneficiaryAdded={() => fetchData(true)} />
          </div>
        </div>
      </div>

      {/* Error banner */}
      {fetchError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            {fetchError}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchData()}
              className="ml-4"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatsCard title="Total Beneficiaries" value={activeBeneficiaries.length} icon={Users} />
          <StatsCard title="Search Results" value={filteredAndSorted.length} icon={Search} />
          <StatsCard title="New This Month" value={stats.activeThisMonth} icon={Activity} />
          <StatsCard title="Advanced Stages" value={stats.advancedStage} icon={TrendingUp} />
        </div>
      )}

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as ViewTab)}
      >
        <TabsList className="mb-4">
          <TabsTrigger value="active" className="gap-2">
            <Users className="h-4 w-4" />
            Active
            <Badge variant="secondary" className="text-[10px] px-1.5">
              {activeBeneficiaries.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="archived" className="gap-2">
            <Archive className="h-4 w-4" />
            Archived
            {archivedBeneficiaries.length > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5">
                {archivedBeneficiaries.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Shared filters */}
        <div className="flex flex-col gap-4 mb-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4
                               text-muted-foreground" />
            <Input
              placeholder="Search by name or phone number…"
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
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

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

          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">
                Active filters:
              </span>
              {searchTerm && (
                <Badge variant="secondary" className="gap-2">
                  Search: {searchTerm}
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
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7"
              >
                Clear All
              </Button>
            </div>
          )}

          {/* Bulk toolbar — shown whenever something is selected */}
          <BulkToolbar />
        </div>

        <TabsContent value="active" className="mt-0">{renderList()}</TabsContent>
        <TabsContent value="archived" className="mt-0">{renderList()}</TabsContent>
      </Tabs>
    </div>
  )
}