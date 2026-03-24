// components/beneficiaries/data-health-check.tsx
"use client"

import { useState, useMemo, useCallback, useEffect, useRef, useTransition } from "react"
import { createPortal } from "react-dom"
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
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertCircle,
  CheckCircle,
  Search,
  ShieldAlert,
  Phone,
  Users,
  Copy,
  UserX,
  FileWarning,
  Trash2,
  X,
  Loader2,
  HeartPulse,
  ChevronDown,
  ChevronUp,
  Download,
  Pencil,
  Save,
  Undo2,
  Wrench,
  Zap,
  ArrowRight,
  Delete,
} from "lucide-react"
import { doc, deleteDoc, updateDoc, writeBatch } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import type { Beneficiary, Preacher } from "@/lib/firestore-collections"
import { DAWA_STAGES } from "@/lib/firestore-collections"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { be } from "date-fns/locale"

// ─── Types ────────────────────────────────────────────────────────

interface ConfirmConfig {
  title: string
  description: string
  confirmText: string
  cancelText: string
  variant: "danger" | "info" | "default"
}

interface DataHealthCheckProps {
  beneficiaries: Beneficiary[]
  preachers: Preacher[]
  onDataChanged: () => void
}

type IssueType =
  | "duplicate_phone"
  | "invalid_phone"
  | "missing_name"
  | "missing_phone"
  | "missing_preacher"
  | "orphan_preacher"
  | "missing_stage"
  | "duplicate_name_phone"
  | "fixable_phone"

interface DataIssue {
  id: string
  beneficiaryId: string
  beneficiaryName: string
  beneficiaryPhone: string
  preacherId: string
  stage: string
  type: IssueType
  severity: "error" | "warning" | "info"
  message: string
  relatedIds?: string[]
  selected: boolean
  fixedPhone?: string
}

interface EditState {
  issueId: string
  name: string
  phone: string
  preacherId: string
  stage: string
}

const ISSUE_CONFIG: Record<
  IssueType,
  { label: string; severity: "error" | "warning" | "info"; icon: React.ElementType }
> = {
  fixable_phone:       { label: "Fixable Phone Number",    severity: "info",    icon: Wrench      },
  duplicate_phone:     { label: "Duplicate Phone",             severity: "error",   icon: Copy        },
  invalid_phone:       { label: "Invalid Phone Number",         severity: "error",   icon: Phone       },
  missing_name:        { label: "Missing Name",            severity: "error",   icon: UserX       },
  missing_phone:       { label: "Missing Phone Number",            severity: "error",   icon: Phone       },
  missing_preacher:    { label: "Without Preacher",           severity: "warning", icon: Users       },
  orphan_preacher:     { label: "Preacher Not Found",      severity: "warning", icon: FileWarning },
  missing_stage:       { label: "Without Stage",           severity: "warning", icon: AlertCircle },
  duplicate_name_phone:{ label: "Completely Duplicate Record",    severity: "error",   icon: Copy        },
}

const BATCH_SIZE = 25

// ─── Component ────────────────────────────────────────────────────

export function DataHealthCheck({
  beneficiaries,
  preachers,
  onDataChanged,
}: DataHealthCheckProps) {
  const [open, setOpen]               = useState(false)
  const [loading, setLoading]         = useState(false)
  const [filterType, setFilterType]   = useState<string>("all")
  const [filterSeverity, setFilterSeverity] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null)
  const [issues, setIssues]           = useState<DataIssue[]>([])
  const [analyzed, setAnalyzed]       = useState(false)
  const [editState, setEditState]     = useState<EditState | null>(null)
  // Fix 6: Separate saving states to avoid conflicts
  const [savingEdit, setSavingEdit]   = useState(false)
  const [savingPhone, setSavingPhone] = useState(false)
  const [fixing, setFixing]           = useState(false)
  const [mounted, setMounted]         = useState(false)
  const [isPending, startTransition]  = useTransition()

  // ─── Inline Confirm State ──────────────────────────────────────
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig>({
    title: "",
    description: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    variant: "default",
  })
  // Fix 2: Use useRef instead of useState for the resolve callback
  const resolveRef = useRef<((v: boolean) => void) | null>(null)

  useEffect(() => {
    setMounted(true)
    return () => {
      setMounted(false)
      // Fix 3: Clean up body styles on unmount only — not in handleConfirmResult
      document.body.style.pointerEvents = ""
      document.body.style.overflow = ""
    }
  }, [])

  // Fix 2 + Fix 4: confirm no longer needs resolveRef in its dependency array
  const confirm = useCallback(
    (opts: Partial<ConfirmConfig> & { title: string; description: string }): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        setConfirmConfig({
          title:       opts.title,
          description: opts.description,
          confirmText: opts.confirmText ?? "Confirm",
          cancelText:  opts.cancelText  ?? "Cancel",
          variant:     opts.variant     ?? "default",
        })
        resolveRef.current = resolve
        setConfirmOpen(true)
      })
    },
    [] // resolveRef is a ref — stable, no need to list as dependency
  )

  // Fix 3: Removed the fragile pointer-events manual hack entirely
  const handleConfirmResult = useCallback((result: boolean) => {
    setConfirmOpen(false)
    resolveRef.current?.(result)
    resolveRef.current = null
  }, [])

  // ─── Phone Utilities ───────────────────────────────────────────

  const normalizePhone = useCallback((phone: string): string => {
    let clean = phone.replace(/[^\d+]/g, "")
    if (clean.startsWith("+20"))                              clean = clean.slice(3)
    else if (clean.startsWith("0020"))                        clean = clean.slice(4)
    else if (clean.startsWith("002"))                         clean = clean.slice(3)
    else if (clean.startsWith("20") && clean.length >= 12)   clean = clean.slice(2)
    clean = clean.replace(/\+/g, "")
    if (clean.length === 10 && /^1[0-2,5]/.test(clean))      clean = "0" + clean
    return clean
  }, [])

  const isValidEgyptianPhone = useCallback(
    (phone: string): boolean => /^01[0-2,5]\d{8}$/.test(normalizePhone(phone)),
    [normalizePhone]
  )

  const phoneNeedsFixing = useCallback(
    (phone: string): boolean => {
      if (!phone?.trim()) return false
      const hasIssue =
        /\s/.test(phone)                                   ||
        phone.includes("+20")                              ||
        phone.startsWith("002")                            ||
        phone.startsWith("0020")                           ||
        /^20\d{10}$/.test(phone.replace(/\s/g, ""))       ||
        phone.includes("-")                                ||
        phone.includes(".")                                ||
        phone.includes("(")                                ||
        phone.includes(")")
      if (!hasIssue) return false
      return /^01[0-2,5]\d{8}$/.test(normalizePhone(phone))
    },
    [normalizePhone]
  )

  const getPhoneIssueDescription = useCallback((phone: string): string => {
    const parts: string[] = []
    if (/\s/.test(phone))                                    parts.push("Spaces")
    if (phone.includes("+20"))                               parts.push("+20")
    if (phone.startsWith("002") || phone.startsWith("0020")) parts.push("002")
    if (/^20\d{10}$/.test(phone.replace(/\s/g, "")))        parts.push("20")
    if (phone.includes("-"))                                 parts.push("Hyphens")
    if (phone.includes("."))                                 parts.push("Dots")
    if (phone.includes("(") || phone.includes(")"))         parts.push("Parentheses")
    return parts.join(", ")
  }, [])

  // ─── Analysis ──────────────────────────────────────────────────

  // Fix 10: Wrapped in startTransition so heavy sync work doesn't block UI
  const runAnalysis = useCallback(() => {
    setLoading(true)
    startTransition(() => {
      const foundIssues: DataIssue[] = []
      let issueId = 0
      const preacherIds = new Set(preachers.map((p) => p.id))

      // Fixable phones
      for (const b of beneficiaries) {
        if (b.phone && phoneNeedsFixing(b.phone)) {
          foundIssues.push({
            id: `issue-${issueId++}`,
            beneficiaryId: b.id,
            beneficiaryName: b.name,
            beneficiaryPhone: b.phone,
            preacherId: b.da_i_id || "",
            stage: b.da_wa_stage || "",
            type: "fixable_phone",
            severity: "info",
            message: `The phone number contains ${getPhoneIssueDescription(b.phone)} — it can be fixed automatically`,
            selected: true,
            fixedPhone: normalizePhone(b.phone),
          })
        }
      }

      // Duplicate phones
      const phoneMap = new Map<string, Beneficiary[]>()
      for (const b of beneficiaries) {
        if (b.phone) {
          const key = normalizePhone(b.phone.trim()) || b.phone.trim()
          if (!phoneMap.has(key)) phoneMap.set(key, [])
          phoneMap.get(key)!.push(b)
        }
      }
      for (const [phone, group] of phoneMap) {
        if (group.length > 1) {
          for (const b of group) {
            foundIssues.push({
              id: `issue-${issueId++}`,
              beneficiaryId: b.id,
              beneficiaryName: b.name,
              beneficiaryPhone: b.phone,
              preacherId: b.da_i_id || "",
              stage: b.da_wa_stage || "",
              type: "duplicate_phone",
              severity: "error",
              message: `Phone number ${phone} is duplicated in ${group.length} record(s)`,
              relatedIds: group.filter((g) => g.id !== b.id).map((g) => g.id),
              selected: false,
            })
          }
        }
      }

      // Duplicate name+phone
      const namePhoneMap = new Map<string, Beneficiary[]>()
      for (const b of beneficiaries) {
        const np  = normalizePhone(b.phone?.trim() || "")
        const key = `${b.name.trim().toLowerCase()}|${np || b.phone?.trim()}`
        if (!namePhoneMap.has(key)) namePhoneMap.set(key, [])
        namePhoneMap.get(key)!.push(b)
      }
      for (const [, group] of namePhoneMap) {
        if (group.length > 1) {
          for (let i = 1; i < group.length; i++) {
            foundIssues.push({
              id: `issue-${issueId++}`,
              beneficiaryId: group[i].id,
              beneficiaryName: group[i].name,
              beneficiaryPhone: group[i].phone,
              preacherId: group[i].da_i_id || "",
              stage: group[i].da_wa_stage || "",
              type: "duplicate_name_phone",
              severity: "error",
              message: `Completely duplicate record (name and phone) — can be safely deleted`,
              relatedIds: [group[0].id],
              selected: true,
            })
          }
        }
      }

      // Per-beneficiary checks
      for (const b of beneficiaries) {
        if (!b.name?.trim()) {
          foundIssues.push({
            id: `issue-${issueId++}`, beneficiaryId: b.id,
            beneficiaryName: b.name || "(No Name)", beneficiaryPhone: b.phone,
            preacherId: b.da_i_id || "", stage: b.da_wa_stage || "",
            type: "missing_name", severity: "error",
            message: "Beneficiary without name", selected: false,
          })
        }
        if (!b.phone?.trim()) {
          foundIssues.push({
            id: `issue-${issueId++}`, beneficiaryId: b.id,
            beneficiaryName: b.name, beneficiaryPhone: b.phone || "(No Phone)",
            preacherId: b.da_i_id || "", stage: b.da_wa_stage || "",
            type: "missing_phone", severity: "error",
            message: "Beneficiary without phone number", selected: false,
          })
        }
        if (b.phone?.trim()) {
          const alreadyFixable = foundIssues.some(
            (i) => i.beneficiaryId === b.id && i.type === "fixable_phone"
          )
          if (!alreadyFixable && !isValidEgyptianPhone(b.phone)) {
            foundIssues.push({
              id: `issue-${issueId++}`, beneficiaryId: b.id,
              beneficiaryName: b.name, beneficiaryPhone: b.phone,
              preacherId: b.da_i_id || "", stage: b.da_wa_stage || "",
              type: "invalid_phone", severity: "error",
              message: `Phone "${b.phone}" is not a valid Egyptian number`, selected: false,
            })
          }
        }
        if (!b.da_i_id?.trim()) {
          foundIssues.push({
            id: `issue-${issueId++}`, beneficiaryId: b.id,
            beneficiaryName: b.name, beneficiaryPhone: b.phone,
            preacherId: b.da_i_id || "", stage: b.da_wa_stage || "",
            type: "missing_preacher", severity: "warning",
            message: "Beneficiary not assigned to any preacher", selected: false,
          })
        }
        if (b.da_i_id?.trim() && !preacherIds.has(b.da_i_id)) {
          foundIssues.push({
            id: `issue-${issueId++}`, beneficiaryId: b.id,
            beneficiaryName: b.name, beneficiaryPhone: b.phone,
            preacherId: b.da_i_id || "", stage: b.da_wa_stage || "",
            type: "orphan_preacher", severity: "warning",
            message: `Assigned to non-existent preacher (${b.da_i_id})`, selected: false,
          })
        }
        if (!b.da_wa_stage?.trim()) {
          foundIssues.push({
            id: `issue-${issueId++}`, beneficiaryId: b.id,
            beneficiaryName: b.name, beneficiaryPhone: b.phone,
            preacherId: b.da_i_id || "", stage: b.da_wa_stage || "",
            type: "missing_stage", severity: "warning",
            message: "Beneficiary without a stage", selected: false,
          })
        }
      }

      setIssues(foundIssues)
      setAnalyzed(true)
      setLoading(false)

      const fixableCount = foundIssues.filter((i) => i.type === "fixable_phone").length
      if (foundIssues.length === 0)
        toast.success("Data is healthy! No issues found")
      else if (fixableCount > 0)
        toast.warning(`Found ${foundIssues.length} issue(s) — of which ${fixableCount} can be fixed automatically`)
      else
        toast.warning(`Found ${foundIssues.length} issue(s)`)
    })
  }, [
    beneficiaries,
    preachers,
    phoneNeedsFixing,
    normalizePhone,
    getPhoneIssueDescription,
    isValidEgyptianPhone,
  ])

  // ─── Fix Phones ────────────────────────────────────────────────

  const fixableIssues         = useMemo(() => issues.filter((i) => i.type === "fixable_phone" && i.fixedPhone), [issues])
  const selectedFixableIssues = useMemo(() => fixableIssues.filter((i) => i.selected), [fixableIssues])

  // Fix 6: Uses savingPhone instead of shared saving state
  const fixSinglePhone = async (issue: DataIssue) => {
    if (!issue.fixedPhone) return
    setSavingPhone(true)
    try {
      await updateDoc(doc(db, "beneficiaries", issue.beneficiaryId), { phone: issue.fixedPhone })
      setIssues((prev) => prev.filter((i) => i.id !== issue.id))
      toast.success(`Fixed phone number for ${issue.beneficiaryName}`)
      onDataChanged()
    } catch {
      toast.error("Failed to fix phone number")
    } finally {
      setSavingPhone(false)
    }
  }

  const fixAllPhones = async (onlySelected = false) => {
    const toFix = onlySelected ? selectedFixableIssues : fixableIssues
    if (toFix.length === 0) { toast.error("No phone numbers to fix"); return }

    const confirmed = await confirm({
      title:       "Fix Phone Numbers Automatically",
      description: `Will automatically fix ${toFix.length} phone number(s).`,
      confirmText: `Fix ${toFix.length} Number(s)`,
      cancelText:  "Cancel",
      variant:     "info",
    })
    if (!confirmed) return

    setFixing(true)
    let fixed = 0, failed = 0

    const uniqueFixMap = new Map<string, string>()
    for (const issue of toFix) {
      if (issue.fixedPhone) uniqueFixMap.set(issue.beneficiaryId, issue.fixedPhone)
    }

    const entries = Array.from(uniqueFixMap.entries())
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch       = writeBatch(db)
      const currentBatch = entries.slice(i, i + BATCH_SIZE)
      for (const [id, phone] of currentBatch) batch.update(doc(db, "beneficiaries", id), { phone })
      try   { await batch.commit(); fixed  += currentBatch.length }
      catch { failed += currentBatch.length }
    }

    if (fixed > 0) {
      const fixedIds = new Set(
        toFix.filter((i) => uniqueFixMap.has(i.beneficiaryId)).map((i) => i.id)
      )
      setIssues((prev) => prev.filter((i) => !fixedIds.has(i.id)))
      toast.success(`Successfully fixed ${fixed} number(s)`)
      onDataChanged()
    }
    if (failed > 0) toast.error(`Failed to fix ${failed} number(s)`)
    setFixing(false)
  }

  // ─── Computed ──────────────────────────────────────────────────

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (filterType !== "all" && issue.type !== filterType)           return false
      if (filterSeverity !== "all" && issue.severity !== filterSeverity) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim()
        return (
          issue.beneficiaryName.toLowerCase().includes(q) ||
          issue.beneficiaryPhone.includes(q)              ||
          issue.message.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [issues, filterType, filterSeverity, searchQuery])

  const issueCounts = useMemo(() => {
    const c: Record<string, number> = { total: 0 }
    for (const i of issues) {
      c.total++
      c[i.type]                    = (c[i.type]                    || 0) + 1
      c[`severity_${i.severity}`]  = (c[`severity_${i.severity}`]  || 0) + 1
    }
    return c
  }, [issues])

  const selectedCount = useMemo(() => issues.filter((i) => i.selected).length, [issues])

  // ─── Edit ──────────────────────────────────────────────────────

  const startEdit = (issue: DataIssue) => {
    setEditState({
      issueId:    issue.id,
      name:       issue.beneficiaryName,
      phone:      issue.beneficiaryPhone,
      preacherId: issue.preacherId,
      stage:      issue.stage,
    })
  }

  const cancelEdit = () => setEditState(null)

  // Fix 6: Uses savingEdit instead of shared saving state
  const saveEdit = async () => {
    if (!editState) return
    const issue = issues.find((i) => i.id === editState.issueId)
    if (!issue) return
    if (!editState.name.trim()) { toast.error("Name is required"); return }

    let formattedPhone = editState.phone.trim()
    if (formattedPhone) {
      const n = normalizePhone(formattedPhone)
      if (/^01[0-2,5]\d{8}$/.test(n)) formattedPhone = n
    }

    setSavingEdit(true)
    try {
      const u: Record<string, string> = {}
      if (editState.name.trim()  !== issue.beneficiaryName) u.name       = editState.name.trim()
      if (formattedPhone         !== issue.beneficiaryPhone) u.phone      = formattedPhone
      if (editState.preacherId   !== issue.preacherId)       u.da_i_id    = editState.preacherId
      if (editState.stage        !== issue.stage)            u.da_wa_stage = editState.stage

      if (Object.keys(u).length === 0) {
        toast.info("No changes were made")
        setEditState(null)
        return
      }

      await updateDoc(doc(db, "beneficiaries", issue.beneficiaryId), u)

      setIssues((prev) =>
        prev.map((i) =>
          i.beneficiaryId === issue.beneficiaryId
            ? {
                ...i,
                beneficiaryName:  editState.name.trim()    || i.beneficiaryName,
                beneficiaryPhone: formattedPhone            || i.beneficiaryPhone,
                preacherId:       editState.preacherId      || i.preacherId,
                stage:            editState.stage           || i.stage,
              }
            : i
        )
      )
      setEditState(null)
      toast.success("Data updated successfully")
      onDataChanged()
    } catch {
      toast.error("Failed to update data")
    } finally {
      setSavingEdit(false)
    }
  }

  // ─── Select / Delete ───────────────────────────────────────────

  const toggleSelect = (id: string) =>
    setIssues((prev) => prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i)))

  const toggleSelectAll = () => {
    const allSelected = filteredIssues.length > 0 && filteredIssues.every((i) => i.selected)
    const ids = new Set(filteredIssues.map((i) => i.id))
    setIssues((prev) => prev.map((i) => (ids.has(i.id) ? { ...i, selected: !allSelected } : i)))
  }

  // Fix 7: Use writeBatch instead of deleteDoc in a loop
  const deleteSelected = async () => {
    const sel = issues.filter((i) => i.selected)
    if (sel.length === 0) { toast.error("No items selected"); return }

    const deletable = sel.filter((i) => i.type !== "fixable_phone")
    if (deletable.length === 0) { toast.info("Selected items are fixable and cannot be deleted."); return }

    const uniqueIds = [...new Set(deletable.map((i) => i.beneficiaryId))]

    const confirmed = await confirm({
      title:       "Delete Beneficiaries",
      description: `Are you sure you want to delete ${uniqueIds.length} beneficiary(ies)? This cannot be undone.`,
      confirmText: `Delete ${uniqueIds.length} Beneficiary(ies)`,
      cancelText:  "Cancel",
      variant:     "danger",
    })
    if (!confirmed) return

    setLoading(true)
    let deleted = 0, failed = 0

    for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
      const batch        = writeBatch(db)
      const currentBatch = uniqueIds.slice(i, i + BATCH_SIZE)
      for (const id of currentBatch) batch.delete(doc(db, "beneficiaries", id))
      try {
        await batch.commit()
        deleted += currentBatch.length
      } catch {
        failed += currentBatch.length
      }
    }

    setLoading(false)

    if (deleted > 0) {
      // Only remove successfully deleted IDs from local state
      const deletedSet = new Set(uniqueIds)
      toast.success(`Successfully deleted ${deleted} beneficiary(ies)`)
      setIssues((prev) => prev.filter((i) => !deletedSet.has(i.beneficiaryId)))
      onDataChanged()
    }
    if (failed > 0) toast.error(`Failed to delete ${failed} beneficiary(ies)`)
  }

  // ─── Export ────────────────────────────────────────────────────

  const exportIssuesCSV = () => {
    const BOM     = "\uFEFF"
    const headers = ["Name", "Phone", "Corrected Phone", "Preacher", "Stage", "Issue Type", "Severity", "Details"]
    const rows    = filteredIssues.map((i) => [
      i.beneficiaryName,
      i.beneficiaryPhone,
      i.fixedPhone || "",
      preachers.find((p) => p.id === i.preacherId)?.name || "Not Assigned",
      i.stage || "No Stage",
      ISSUE_CONFIG[i.type].label,
      i.severity === "error" ? "Error" : i.severity === "warning" ? "Warning" : "Info",
      i.message,
    ])
    const csv  = BOM + [headers.join(","), ...rows.map((r) => r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href  = URL.createObjectURL(blob)
    link.download = `data_health_report_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  // ─── Dialog Lifecycle ──────────────────────────────────────────

  // Fix 5: Don't call setOpen when blocked — avoids state drift
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && confirmOpen) return // Block close while confirm is open

    if (!newOpen) {
      setAnalyzed(false)
      setIssues([])
      setFilterType("all")
      setFilterSeverity("all")
      setSearchQuery("")
      setExpandedIssue(null)
      setEditState(null)
    }
    setOpen(newOpen)
  }

  // ─── Helpers ───────────────────────────────────────────────────

  const getSeverityBadge = (severity: "error" | "warning" | "info") => {
    const cfg = {
      error:   { label: "Error",    className: "bg-destructive/15 text-destructive border-destructive/30" },
      warning: { label: "Warning",  className: "bg-warning/15 text-warning border-warning/30"            },
      info:    { label: "Fixing",   className: "bg-info/15 text-info border-info/30"                     },
    }[severity]
    return (
      <Badge variant="outline" className={`text-[10px] ${cfg.className}`}>
        {cfg.label}
      </Badge>
    )
  }

  const getPreacherName = (id: string) => {
    if (!id) return "Not Assigned"
    return preachers.find((p) => p.id === id)?.name || "Unknown"
  }

  const healthScore = useMemo(() => {
    if (beneficiaries.length === 0) return 100
    const penalty =
      issues.filter((i) => i.severity === "error").length   * 3 +
      issues.filter((i) => i.severity === "warning").length * 1 +
      issues.filter((i) => i.severity === "info").length    * 0.5
    return Math.max(0, Math.round(100 - (penalty / (beneficiaries.length * 5)) * 100))
  }, [beneficiaries, issues])

  const getHealthColor = (s: number) => s >= 90 ? "text-success" : s >= 70 ? "text-warning" : "text-destructive"
  const getHealthLabel = (s: number) => s >= 90 ? "Excellent" : s >= 70 ? "Good" : s >= 50 ? "Needs Improvement" : "Poor"

  // ─── Render ────────────────────────────────────────────────────

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 hover:bg-primary/5">
            <HeartPulse className="h-4 w-4" />
            <span className="hidden sm:inline">Data Check</span>
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-[95vw] lg:max-w-4xl max-h-[90dvh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
            <DialogTitle className="flex items-center gap-3 text-lg sm:text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <HeartPulse className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div>Data Health Check</div>
                <DialogDescription className="text-xs sm:text-sm mt-1">
                  Comprehensive analysis of beneficiary data quality and issue detection
                </DialogDescription>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 space-y-4 pb-4 pt-4">
            {/* ── Not yet analyzed ── */}
            {!analyzed && (
              <div className="text-center py-12 space-y-6">
                <div className="inline-flex p-6 rounded-full bg-primary/10">
                  <ShieldAlert className="h-16 w-16 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Beneficiary Data Check</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Will analyze {beneficiaries.length} record(s) to find issues
                  </p>
                </div>
                <Button
                  onClick={runAnalysis}
                  disabled={loading || isPending || beneficiaries.length === 0}
                  size="lg"
                  className="gap-2"
                >
                  {loading || isPending
                    ? <Loader2 className="h-5 w-5 animate-spin" />
                    : <HeartPulse className="h-5 w-5" />}
                  Start Check
                </Button>
              </div>
            )}

            {/* ── Analyzed ── */}
            {analyzed && (
              <div className="space-y-4">
                {/* Health Score */}
                <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-center">
                      <div className={`text-4xl font-bold ${getHealthColor(healthScore)}`}>{healthScore}%</div>
                      <div className={`text-sm font-medium ${getHealthColor(healthScore)}`}>{getHealthLabel(healthScore)}</div>
                    </div>
                    <div className="flex-1">
                      <Progress value={healthScore} className="h-3" />
                      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        <span>{beneficiaries.length} record(s)</span>
                        <span>{issues.length} issue(s)</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(issueCounts.severity_error || 0) > 0 && (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1">
                        <AlertCircle className="h-3 w-3" />{issueCounts.severity_error} Error(s)
                      </Badge>
                    )}
                    {(issueCounts.severity_warning || 0) > 0 && (
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 gap-1">
                        <AlertCircle className="h-3 w-3" />{issueCounts.severity_warning} Warning(s)
                      </Badge>
                    )}
                    {/* Fix 8: Use consistent severity_info key for the fixable badge */}
                    {(issueCounts.severity_info || 0) > 0 && (
                      <Badge variant="outline" className="bg-info/10 text-info border-info/30 gap-1">
                        <Wrench className="h-3 w-3" />{issueCounts.severity_info} Fixable
                      </Badge>
                    )}
                    {issues.length === 0 && (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1">
                        <CheckCircle className="h-3 w-3" />No issues!
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Quick Fix Banner */}
                {fixableIssues.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg border border-info/30 bg-info/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-info/15">
                        <Zap className="h-5 w-5 text-info" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold">Quick Fix — {fixableIssues.length} number(s)</h4>
                        <p className="text-xs text-muted-foreground">Phone numbers that can be fixed automatically</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedFixableIssues.length > 0 && selectedFixableIssues.length < fixableIssues.length && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fixAllPhones(true)}
                          disabled={fixing}
                          className="gap-1.5 border-info/30 text-info hover:bg-info/10"
                        >
                          {fixing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}
                          Fix Selected ({selectedFixableIssues.length})
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => fixAllPhones(false)}
                        disabled={fixing}
                        className="gap-1.5 bg-info hover:bg-info/90 text-info-foreground"
                      >
                        {fixing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                        Fix All ({fixableIssues.length})
                      </Button>
                    </div>
                  </div>
                )}

                {issues.length > 0 && (
                  <>
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          placeholder="Search..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 h-9"
                        />
                        {searchQuery && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={() => setSearchQuery("")}
                            aria-label="Clear search"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-full sm:w-48 h-9">
                          <SelectValue placeholder="Issue Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All ({issueCounts.total || 0})</SelectItem>
                          {Object.entries(ISSUE_CONFIG).map(([type, config]) => {
                            const count = issueCounts[type] || 0
                            return count > 0
                              ? <SelectItem key={type} value={type}>{config.label} ({count})</SelectItem>
                              : null
                          })}
                        </SelectContent>
                      </Select>
                      <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                        <SelectTrigger className="w-full sm:w-40 h-9">
                          <SelectValue placeholder="Severity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {(issueCounts.severity_error   || 0) > 0 && <SelectItem value="error">Errors ({issueCounts.severity_error})</SelectItem>}
                          {(issueCounts.severity_warning || 0) > 0 && <SelectItem value="warning">Warnings ({issueCounts.severity_warning})</SelectItem>}
                          {(issueCounts.severity_info    || 0) > 0 && <SelectItem value="info">Fixable ({issueCounts.severity_info})</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Actions Bar */}
                    <div className="flex items-center justify-between bg-muted p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="health-select-all"
                            checked={filteredIssues.length > 0 && filteredIssues.every((i) => i.selected)}
                            onCheckedChange={toggleSelectAll}
                            className="h-4 w-4"
                            disabled={filteredIssues.length === 0}
                          />
                          <Label htmlFor="health-select-all" className="text-sm cursor-pointer font-medium">
                            Select All ({filteredIssues.length})
                          </Label>
                        </div>
                        {selectedCount > 0 && <Badge variant="default" className="gap-1">{selectedCount} selected</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={exportIssuesCSV}
                          className="gap-1.5"
                          disabled={filteredIssues.length === 0}
                          aria-label="Export CSV"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Export</span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={deleteSelected}
                          disabled={selectedCount === 0 || loading}
                          className="gap-1.5"
                          aria-label={`Delete ${selectedCount} item(s)`}
                        >
                          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          Delete ({selectedCount})
                        </Button>
                      </div>
                    </div>

                    {/* Issues List */}
                    <div className="border rounded-lg overflow-hidden bg-background">
                      <div className="max-h-[400px] overflow-y-auto">
                        {filteredIssues.length === 0 ? (
                          <div className="p-8 text-center text-muted-foreground">
                            <CheckCircle className="h-10 w-10 mx-auto mb-3 text-success" />
                            <p className="font-medium">No issues match the filter</p>
                          </div>
                        ) : (
                          filteredIssues.map((issue, index) => {
                            const config       = ISSUE_CONFIG[issue.type]
                            const IconComponent = config.icon
                            const isExpanded   = expandedIssue === issue.id
                            const isEditing    = editState?.issueId === issue.id
                            const isFixable    = issue.type === "fixable_phone" && issue.fixedPhone

                            return (
                              <div
                                key={issue.id}
                                className={cn(
                                  index < filteredIssues.length - 1 ? "border-b" : "",
                                  issue.selected                     ? "bg-primary/5" : "",
                                  issue.severity === "error"         ? "border-l-2 border-l-destructive" : "",
                                  issue.severity === "warning"       ? "border-l-2 border-l-warning"     : "",
                                  issue.severity === "info"          ? "border-l-2 border-l-info"        : "",
                                  "transition-colors hover:bg-muted/50"
                                )}
                              >
                                {!isEditing && (
                                  <div className="flex items-start sm:items-center gap-3 p-3">
                                    <Checkbox
                                      checked={issue.selected}
                                      onCheckedChange={() => toggleSelect(issue.id)}
                                      className="h-4 w-4 flex-shrink-0 mt-0.5 sm:mt-0"
                                      aria-label={`Select ${issue.beneficiaryName}`}
                                    />
                                    <IconComponent
                                      className={cn(
                                        "h-4 w-4 flex-shrink-0 mt-0.5 sm:mt-0",
                                        issue.severity === "error"   && "text-destructive",
                                        issue.severity === "warning" && "text-warning",
                                        issue.severity === "info"    && "text-info",
                                      )}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-medium truncate">{issue.beneficiaryName}</span>
                                        <span className="text-xs text-muted-foreground font-mono" dir="ltr">{issue.beneficiaryPhone}</span>
                                      </div>
                                      {isFixable && (
                                        <div className="flex items-center gap-1.5 mt-1">
                                          <span className="text-xs text-muted-foreground font-mono line-through" dir="ltr">{issue.beneficiaryPhone}</span>
                                          <ArrowRight className="h-3 w-3 text-info" />
                                          <span className="text-xs text-info font-mono font-medium" dir="ltr">{issue.fixedPhone}</span>
                                        </div>
                                      )}
                                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                        <p className="text-xs text-muted-foreground">{issue.message}</p>
                                        {issue.preacherId && (
                                          <span className="text-[10px] text-muted-foreground/70">• {getPreacherName(issue.preacherId)}</span>
                                        )}
                                        {issue.stage && (
                                          <Badge variant="outline" className="text-[10px] h-4">{issue.stage}</Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      {getSeverityBadge(issue.severity)}
                                      <Badge variant="outline" className="text-[10px] hidden sm:flex">{config.label}</Badge>
                                      {isFixable && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 hover:bg-info/10 hover:text-info"
                                          onClick={() => fixSinglePhone(issue)}
                                          disabled={savingPhone}
                                          aria-label={`Fix phone for ${issue.beneficiaryName}`}
                                          title="Fix"
                                        >
                                          <Wrench className="h-3 w-3" />
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 hover:bg-primary/10 hover:text-primary"
                                        onClick={() => startEdit(issue)}
                                        aria-label={`Edit ${issue.beneficiaryName}`}
                                        title="Edit"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      {issue.relatedIds && issue.relatedIds.length > 0 && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => setExpandedIssue(isExpanded ? null : issue.id)}
                                          aria-label={isExpanded ? "Collapse" : "Expand"}
                                        >
                                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {isEditing && editState && (
                                  <div className="p-3 space-y-3 bg-primary/5">
                                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                                      <Pencil className="h-4 w-4" />Edit Beneficiary Data
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div className="space-y-1">
                                        <Label className="text-xs font-medium">Name</Label>
                                        <Input
                                          value={editState.name}
                                          onChange={(e) => setEditState((p) => p && { ...p, name: e.target.value })}
                                          className="h-8 text-sm"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-xs font-medium">Phone Number</Label>
                                        <Input
                                          value={editState.phone}
                                          onChange={(e) => setEditState((p) => p && { ...p, phone: e.target.value })}
                                          className="h-8 text-sm font-mono"
                                          dir="ltr"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-xs font-medium">Preacher</Label>
                                        <Select
                                          value={editState.preacherId || "none"}
                                          onValueChange={(v) => setEditState((p) => p && { ...p, preacherId: v === "none" ? "" : v })}
                                        >
                                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="none">No Assignment</SelectItem>
                                            {preachers
                                              .filter((p) => p.role === "da'i")
                                              .map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)
                                            }
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-xs font-medium">Stage</Label>
                                        <Select
                                          value={editState.stage || "none"}
                                          onValueChange={(v) => setEditState((p) => p && { ...p, stage: v === "none" ? "" : v })}
                                        >
                                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="none">No Stage</SelectItem>
                                            {DAWA_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-2 pt-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={cancelEdit}
                                        disabled={savingEdit}
                                        className="gap-1.5"
                                      >
                                        <Undo2 className="h-3.5 w-3.5" />Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={saveEdit}
                                        disabled={savingEdit}
                                        className="gap-1.5"
                                      >
                                        {savingEdit
                                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          : <Save className="h-3.5 w-3.5" />}
                                        Save
                                      </Button>
                                    </div>
                                  </div>
                                )}

                                {isExpanded && !isEditing && issue.relatedIds && (
                                  <div className="px-12 pb-3 space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Related Records:</p>
                                    {issue.relatedIds.map((relId) => {
                                      const r = beneficiaries.find((b) => b.id === relId)
                                      if (!r) return null
                                      return (
                                        <div key={relId} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/50">
                                          <Users className="h-3 w-3 text-muted-foreground" />
                                          <span>{r.name}</span>
                                          <span className="text-muted-foreground font-mono" dir="ltr">{r.phone}</span>
                                          <span className="text-muted-foreground">• {getPreacherName(r.da_i_id)}</span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="px-4 sm:px-6 pb-4 pt-3 border-t bg-muted">
            <div className="flex gap-2 w-full sm:w-auto">
              {analyzed && issues.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setAnalyzed(false); setIssues([]); setEditState(null) }}
                >
                  Re-Check
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                إغلاق
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm dialog rendered via portal — completely outside Radix Dialog DOM tree */}
      {mounted &&
        createPortal(
          <AlertDialog
            open={confirmOpen}
            onOpenChange={(newOpen) => {
              if (!newOpen) handleConfirmResult(false)
            }}
          >
            <AlertDialogContent
              onCloseAutoFocus={(e) => e.preventDefault()}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <AlertDialogHeader>
                <AlertDialogTitle>{confirmConfig.title}</AlertDialogTitle>
                <AlertDialogDescription>{confirmConfig.description}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={(e) => { e.preventDefault(); handleConfirmResult(false) }}
                >
                  {confirmConfig.cancelText}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => { e.preventDefault(); handleConfirmResult(true) }}
                  className={cn(
                    confirmConfig.variant === "danger" && buttonVariants({ variant: "destructive" }),
                    confirmConfig.variant === "info"   && "bg-info text-info-foreground hover:bg-info/90"
                  )}
                >
                  {confirmConfig.confirmText}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>,
          document.body
        )}
    </>
  )
}

function beneficiary(ies: any) {
  throw new Error("Function not implemented.")
}


function setAnalyzed(arg0: boolean) {
  throw new Error("Function not implemented.")
}


function setIssues(arg0: never[]) {
  throw new Error("Function not implemented.")
}


function setFilterType(arg0: string) {
  throw new Error("Function not implemented.")
}


function setFilterSeverity(arg0: string) {
  throw new Error("Function not implemented.")
}


function setSearchQuery(arg0: string) {
  throw new Error("Function not implemented.")
}


function setExpandedIssue(arg0: null) {
  throw new Error("Function not implemented.")
}


function setEditState(arg0: null) {
  throw new Error("Function not implemented.")
}


function setOpen(newOpen: boolean) {
  throw new Error("Function not implemented.")
}
