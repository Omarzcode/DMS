// components/beneficiaries/data-health-check.tsx
"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
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
} from "lucide-react"
import { doc, deleteDoc, updateDoc, writeBatch } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import type { Beneficiary, Preacher } from "@/lib/firestore-collections"
import { DAWA_STAGES } from "@/lib/firestore-collections"

// ─── INLINE CONFIRM (no external hook, fully controlled) ─────────

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

interface ConfirmConfig {
  title: string
  description: string
  confirmText: string
  cancelText: string
  variant: "danger" | "info" | "default"
}

// ─── Types (same as before) ──────────────────────────────────────

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
  fixable_phone: { label: "رقم قابل للإصلاح", severity: "info", icon: Wrench },
  duplicate_phone: { label: "رقم مكرر", severity: "error", icon: Copy },
  invalid_phone: { label: "رقم غير صحيح", severity: "error", icon: Phone },
  missing_name: { label: "اسم مفقود", severity: "error", icon: UserX },
  missing_phone: { label: "رقم مفقود", severity: "error", icon: Phone },
  missing_preacher: { label: "بدون داعية", severity: "warning", icon: Users },
  orphan_preacher: { label: "داعية غير موجود", severity: "warning", icon: FileWarning },
  missing_stage: { label: "بدون مرحلة", severity: "warning", icon: AlertCircle },
  duplicate_name_phone: { label: "سجل مكرر بالكامل", severity: "error", icon: Copy },
}

const BATCH_SIZE = 25

export function DataHealthCheck({
  beneficiaries,
  preachers,
  onDataChanged,
}: DataHealthCheckProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filterType, setFilterType] = useState<string>("all")
  const [filterSeverity, setFilterSeverity] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null)
  const [issues, setIssues] = useState<DataIssue[]>([])
  const [analyzed, setAnalyzed] = useState(false)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [mounted, setMounted] = useState(false)

  // ─── INLINE CONFIRM STATE (replaces useConfirm hook) ───────────

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig>({
    title: "",
    description: "",
    confirmText: "تأكيد",
    cancelText: "إلغاء",
    variant: "default",
  })
  const confirmResolveRef = useCallback(() => {}, [])
  const resolveRef = useState<{ current: ((v: boolean) => void) | null }>(() => ({
    current: null,
  }))[0]

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const confirm = useCallback(
    (opts: Partial<ConfirmConfig> & { title: string; description: string }): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        setConfirmConfig({
          title: opts.title,
          description: opts.description,
          confirmText: opts.confirmText || "تأكيد",
          cancelText: opts.cancelText || "إلغاء",
          variant: opts.variant || "default",
        })
        resolveRef.current = resolve
        setConfirmOpen(true)
      })
    },
    [resolveRef]
  )

  const handleConfirmResult = useCallback(
    (result: boolean) => {
      setConfirmOpen(false)
      // Use setTimeout to let the AlertDialog fully unmount before resolving
      setTimeout(() => {
        resolveRef.current?.(result)
        resolveRef.current = null

        // CRITICAL: Re-apply pointer-events since parent dialog is still open
        if (open) {
          document.body.style.pointerEvents = "none"
        }
      }, 100)
    },
    [resolveRef, open]
  )

  // ─── Phone Utilities ───────────────────────────────────────────

  const normalizePhone = useCallback((phone: string): string => {
    let clean = phone.replace(/[^\d+]/g, "")
    if (clean.startsWith("+20")) clean = clean.slice(3)
    else if (clean.startsWith("0020")) clean = clean.slice(4)
    else if (clean.startsWith("002")) clean = clean.slice(3)
    else if (clean.startsWith("20") && clean.length >= 12) clean = clean.slice(2)
    clean = clean.replace(/\+/g, "")
    if (clean.length === 10 && /^1[0-2,5]/.test(clean)) clean = "0" + clean
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
        /\s/.test(phone) ||
        phone.includes("+20") ||
        phone.startsWith("002") ||
        phone.startsWith("0020") ||
        /^20\d{10}$/.test(phone.replace(/\s/g, "")) ||
        phone.includes("-") ||
        phone.includes(".") ||
        phone.includes("(") ||
        phone.includes(")")
      if (!hasIssue) return false
      return /^01[0-2,5]\d{8}$/.test(normalizePhone(phone))
    },
    [normalizePhone]
  )

  const getPhoneIssueDescription = useCallback((phone: string): string => {
    const issues: string[] = []
    if (/\s/.test(phone)) issues.push("مسافات")
    if (phone.includes("+20")) issues.push("+20")
    if (phone.startsWith("002") || phone.startsWith("0020")) issues.push("002")
    if (/^20\d{10}$/.test(phone.replace(/\s/g, ""))) issues.push("20")
    if (phone.includes("-")) issues.push("شرطات")
    if (phone.includes(".")) issues.push("نقاط")
    if (phone.includes("(") || phone.includes(")")) issues.push("أقواس")
    return issues.join("، ")
  }, [])

  // ─── Analysis ──────────────────────────────────────────────────

  const runAnalysis = useCallback(() => {
    setLoading(true)
    const foundIssues: DataIssue[] = []
    let issueId = 0
    const preacherIds = new Set(preachers.map((p) => p.id))

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
          message: `الرقم يحتوي على ${getPhoneIssueDescription(b.phone)} — يمكن إصلاحه تلقائياً`,
          selected: true,
          fixedPhone: normalizePhone(b.phone),
        })
      }
    }

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
            message: `الرقم ${phone} مكرر في ${group.length} سجل`,
            relatedIds: group.filter((g) => g.id !== b.id).map((g) => g.id),
            selected: false,
          })
        }
      }
    }

    const namePhoneMap = new Map<string, Beneficiary[]>()
    for (const b of beneficiaries) {
      const np = normalizePhone(b.phone?.trim() || "")
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
            message: `سجل مكرر بالكامل (الاسم والرقم) — يمكن حذفه بأمان`,
            relatedIds: [group[0].id],
            selected: true,
          })
        }
      }
    }

    for (const b of beneficiaries) {
      if (!b.name?.trim()) {
        foundIssues.push({
          id: `issue-${issueId++}`, beneficiaryId: b.id,
          beneficiaryName: b.name || "(بدون اسم)", beneficiaryPhone: b.phone,
          preacherId: b.da_i_id || "", stage: b.da_wa_stage || "",
          type: "missing_name", severity: "error",
          message: "المستفيد بدون اسم", selected: false,
        })
      }
      if (!b.phone?.trim()) {
        foundIssues.push({
          id: `issue-${issueId++}`, beneficiaryId: b.id,
          beneficiaryName: b.name, beneficiaryPhone: b.phone || "(بدون رقم)",
          preacherId: b.da_i_id || "", stage: b.da_wa_stage || "",
          type: "missing_phone", severity: "error",
          message: "المستفيد بدون رقم هاتف", selected: false,
        })
      }
      if (b.phone?.trim()) {
        const alreadyFixable = foundIssues.some((i) => i.beneficiaryId === b.id && i.type === "fixable_phone")
        if (!alreadyFixable && !isValidEgyptianPhone(b.phone)) {
          foundIssues.push({
            id: `issue-${issueId++}`, beneficiaryId: b.id,
            beneficiaryName: b.name, beneficiaryPhone: b.phone,
            preacherId: b.da_i_id || "", stage: b.da_wa_stage || "",
            type: "invalid_phone", severity: "error",
            message: `الرقم "${b.phone}" ليس رقم مصري صحيح`, selected: false,
          })
        }
      }
      if (!b.da_i_id?.trim()) {
        foundIssues.push({
          id: `issue-${issueId++}`, beneficiaryId: b.id,
          beneficiaryName: b.name, beneficiaryPhone: b.phone,
          preacherId: b.da_i_id || "", stage: b.da_wa_stage || "",
          type: "missing_preacher", severity: "warning",
          message: "المستفيد غير معيّن لأي داعية", selected: false,
        })
      }
      if (b.da_i_id?.trim() && !preacherIds.has(b.da_i_id)) {
        foundIssues.push({
          id: `issue-${issueId++}`, beneficiaryId: b.id,
          beneficiaryName: b.name, beneficiaryPhone: b.phone,
          preacherId: b.da_i_id || "", stage: b.da_wa_stage || "",
          type: "orphan_preacher", severity: "warning",
          message: `معيّن لداعية غير موجود (${b.da_i_id})`, selected: false,
        })
      }
      if (!b.da_wa_stage?.trim()) {
        foundIssues.push({
          id: `issue-${issueId++}`, beneficiaryId: b.id,
          beneficiaryName: b.name, beneficiaryPhone: b.phone,
          preacherId: b.da_i_id || "", stage: b.da_wa_stage || "",
          type: "missing_stage", severity: "warning",
          message: "المستفيد بدون مرحلة دعوية", selected: false,
        })
      }
    }

    setIssues(foundIssues)
    setAnalyzed(true)
    setLoading(false)

    const fixableCount = foundIssues.filter((i) => i.type === "fixable_phone").length
    if (foundIssues.length === 0) toast.success("البيانات سليمة! لا توجد مشاكل")
    else if (fixableCount > 0)
      toast.warning(`تم العثور على ${foundIssues.length} مشكلة — منها ${fixableCount} قابلة للإصلاح التلقائي`)
    else toast.warning(`تم العثور على ${foundIssues.length} مشكلة`)
  }, [beneficiaries, preachers, phoneNeedsFixing, normalizePhone, getPhoneIssueDescription, isValidEgyptianPhone])

  // ─── Fix Phones ────────────────────────────────────────────────

  const fixableIssues = useMemo(() => issues.filter((i) => i.type === "fixable_phone" && i.fixedPhone), [issues])
  const selectedFixableIssues = useMemo(() => fixableIssues.filter((i) => i.selected), [fixableIssues])

  const fixSinglePhone = async (issue: DataIssue) => {
    if (!issue.fixedPhone) return
    setSaving(true)
    try {
      await updateDoc(doc(db, "beneficiaries", issue.beneficiaryId), { phone: issue.fixedPhone })
      setIssues((prev) => prev.filter((i) => i.id !== issue.id))
      toast.success(`تم إصلاح رقم ${issue.beneficiaryName}`)
      onDataChanged()
    } catch { toast.error("فشل إصلاح الرقم") }
    finally { setSaving(false) }
  }

  const fixAllPhones = async (onlySelected = false) => {
    const toFix = onlySelected ? selectedFixableIssues : fixableIssues
    if (toFix.length === 0) { toast.error("لا توجد أرقام قابلة للإصلاح"); return }

    const confirmed = await confirm({
      title: "إصلاح الأرقام تلقائياً",
      description: `سيتم إصلاح ${toFix.length} رقم هاتف تلقائياً.`,
      confirmText: `إصلاح ${toFix.length} رقم`,
      cancelText: "إلغاء",
      variant: "info",
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
      const batch = writeBatch(db)
      const currentBatch = entries.slice(i, i + BATCH_SIZE)
      for (const [id, phone] of currentBatch) batch.update(doc(db, "beneficiaries", id), { phone })
      try { await batch.commit(); fixed += currentBatch.length }
      catch { failed += currentBatch.length }
    }
    if (fixed > 0) {
      const fixedIds = new Set(toFix.filter((i) => uniqueFixMap.has(i.beneficiaryId)).map((i) => i.id))
      setIssues((prev) => prev.filter((i) => !fixedIds.has(i.id)))
      toast.success(`تم إصلاح ${fixed} رقم بنجاح`)
      onDataChanged()
    }
    if (failed > 0) toast.error(`فشل إصلاح ${failed} رقم`)
    setFixing(false)
  }

  // ─── Computed ──────────────────────────────────────────────────

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (filterType !== "all" && issue.type !== filterType) return false
      if (filterSeverity !== "all" && issue.severity !== filterSeverity) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim()
        return issue.beneficiaryName.toLowerCase().includes(q) || issue.beneficiaryPhone.includes(q) || issue.message.toLowerCase().includes(q)
      }
      return true
    })
  }, [issues, filterType, filterSeverity, searchQuery])

  const issueCounts = useMemo(() => {
    const c: Record<string, number> = { total: 0 }
    for (const i of issues) { c.total++; c[i.type] = (c[i.type] || 0) + 1; c[`severity_${i.severity}`] = (c[`severity_${i.severity}`] || 0) + 1 }
    return c
  }, [issues])

  const selectedCount = useMemo(() => issues.filter((i) => i.selected).length, [issues])

  // ─── Edit ──────────────────────────────────────────────────────

  const startEdit = (issue: DataIssue) => {
    setEditState({ issueId: issue.id, name: issue.beneficiaryName, phone: issue.beneficiaryPhone, preacherId: issue.preacherId, stage: issue.stage })
  }
  const cancelEdit = () => setEditState(null)

  const saveEdit = async () => {
    if (!editState) return
    const issue = issues.find((i) => i.id === editState.issueId)
    if (!issue) return
    if (!editState.name.trim()) { toast.error("الاسم مطلوب"); return }
    let formattedPhone = editState.phone.trim()
    if (formattedPhone) {
      const n = normalizePhone(formattedPhone)
      if (/^01[0-2,5]\d{8}$/.test(n)) formattedPhone = n
    }
    setSaving(true)
    try {
      const u: Record<string, string> = {}
      if (editState.name.trim() !== issue.beneficiaryName) u.name = editState.name.trim()
      if (formattedPhone !== issue.beneficiaryPhone) u.phone = formattedPhone
      if (editState.preacherId !== issue.preacherId) u.da_i_id = editState.preacherId
      if (editState.stage !== issue.stage) u.da_wa_stage = editState.stage
      if (Object.keys(u).length === 0) { toast.info("لم يتم تغيير أي بيانات"); setEditState(null); setSaving(false); return }
      await updateDoc(doc(db, "beneficiaries", issue.beneficiaryId), u)
      setIssues((prev) => prev.map((i) => i.beneficiaryId === issue.beneficiaryId ? { ...i, beneficiaryName: editState.name.trim() || i.beneficiaryName, beneficiaryPhone: formattedPhone || i.beneficiaryPhone, preacherId: editState.preacherId || i.preacherId, stage: editState.stage || i.stage } : i))
      setEditState(null)
      toast.success("تم تحديث البيانات بنجاح")
      onDataChanged()
    } catch { toast.error("فشل تحديث البيانات") }
    finally { setSaving(false) }
  }

  // ─── Select / Delete ───────────────────────────────────────────

  const toggleSelect = (id: string) => setIssues((prev) => prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i)))
  const toggleSelectAll = () => {
    const allSelected = filteredIssues.length > 0 && filteredIssues.every((i) => i.selected)
    const ids = new Set(filteredIssues.map((i) => i.id))
    setIssues((prev) => prev.map((i) => (ids.has(i.id) ? { ...i, selected: !allSelected } : i)))
  }

  const deleteSelected = async () => {
    const sel = issues.filter((i) => i.selected)
    if (sel.length === 0) { toast.error("لا توجد عناصر محددة"); return }
    const deletable = sel.filter((i) => i.type !== "fixable_phone")
    if (deletable.length === 0) { toast.info("العناصر المحددة قابلة للإصلاح وليست للحذف."); return }
    const uniqueIds = [...new Set(deletable.map((i) => i.beneficiaryId))]

    const confirmed = await confirm({
      title: "حذف المستفيدين",
      description: `هل أنت متأكد من حذف ${uniqueIds.length} مستفيد؟ لا يمكن التراجع.`,
      confirmText: `حذف ${uniqueIds.length} مستفيد`,
      cancelText: "إلغاء",
      variant: "danger",
    })
    if (!confirmed) return

    setLoading(true)
    let deleted = 0, failed = 0
    for (const id of uniqueIds) {
      try { await deleteDoc(doc(db, "beneficiaries", id)); deleted++ }
      catch { failed++ }
    }
    setLoading(false)
    if (deleted > 0) {
      toast.success(`تم حذف ${deleted} مستفيد بنجاح`)
      setIssues((prev) => prev.filter((i) => !uniqueIds.includes(i.beneficiaryId)))
      onDataChanged()
    }
    if (failed > 0) toast.error(`فشل حذف ${failed} مستفيد`)
  }

  // ─── Export ────────────────────────────────────────────────────

  const exportIssuesCSV = () => {
    const BOM = "\uFEFF"
    const headers = ["الاسم", "الرقم", "الرقم المصحح", "الداعية", "المرحلة", "نوع المشكلة", "الخطورة", "التفاصيل"]
    const rows = filteredIssues.map((i) => [
      i.beneficiaryName, i.beneficiaryPhone, i.fixedPhone || "",
      preachers.find((p) => p.id === i.preacherId)?.name || "غير معيّن",
      i.stage || "بدون مرحلة", ISSUE_CONFIG[i.type].label,
      i.severity === "error" ? "خطأ" : i.severity === "warning" ? "تحذير" : "معلومة",
      i.message,
    ])
    const csv = BOM + [headers.join(","), ...rows.map((r) => r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `data_health_report_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  // ─── Dialog Lifecycle ──────────────────────────────────────────

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // If confirm dialog is open, don't close the main dialog
      if (confirmOpen) return

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

  // Safety: clean up body on unmount
  useEffect(() => {
    return () => {
      document.body.style.pointerEvents = ""
      document.body.style.overflow = ""
    }
  }, [])

  // ─── Helpers ───────────────────────────────────────────────────

  const getSeverityBadge = (severity: "error" | "warning" | "info") => {
    const cfg = {
      error: { label: "خطأ", className: "bg-destructive/15 text-destructive border-destructive/30" },
      warning: { label: "تحذير", className: "bg-warning/15 text-warning border-warning/30" },
      info: { label: "إصلاح", className: "bg-info/15 text-info border-info/30" },
    }[severity]
    return <Badge variant="outline" className={`text-[10px] ${cfg.className}`}>{cfg.label}</Badge>
  }

  const getPreacherName = (id: string) => {
    if (!id) return "غير معيّن"
    return preachers.find((p) => p.id === id)?.name || "غير معروف"
  }

  const healthScore = useMemo(() => {
    if (beneficiaries.length === 0) return 100
    const penalty = issues.filter((i) => i.severity === "error").length * 3 + issues.filter((i) => i.severity === "warning").length + issues.filter((i) => i.severity === "info").length * 0.5
    return Math.max(0, Math.round(100 - (penalty / (beneficiaries.length * 5)) * 100))
  }, [beneficiaries, issues])

  const getHealthColor = (s: number) => s >= 90 ? "text-success" : s >= 70 ? "text-warning" : "text-destructive"
  const getHealthLabel = (s: number) => s >= 90 ? "ممتاز" : s >= 70 ? "جيد" : s >= 50 ? "يحتاج تحسين" : "ضعيف"

  // ─── Render ────────────────────────────────────────────────────

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 hover:bg-primary/5">
            <HeartPulse className="h-4 w-4" />
            <span className="hidden sm:inline">فحص البيانات</span>
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-[95vw] lg:max-w-4xl max-h-[90dvh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
            <DialogTitle className="flex items-center gap-3 text-lg sm:text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <HeartPulse className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div>فحص صحة البيانات</div>
                <DialogDescription className="text-xs sm:text-sm mt-1">
                  تحليل شامل لجودة بيانات المستفيدين واكتشاف المشاكل
                </DialogDescription>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 space-y-4 pb-4 pt-4">
            {!analyzed && (
              <div className="text-center py-12 space-y-6">
                <div className="inline-flex p-6 rounded-full bg-primary/10">
                  <ShieldAlert className="h-16 w-16 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">فحص بيانات المستفيدين</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    سيتم تحليل {beneficiaries.length} سجل للبحث عن المشاكل
                  </p>
                </div>
                <Button onClick={runAnalysis} disabled={loading || beneficiaries.length === 0} size="lg" className="gap-2">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <HeartPulse className="h-5 w-5" />}
                  بدء الفحص
                </Button>
              </div>
            )}

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
                        <span>{beneficiaries.length} سجل</span>
                        <span>{issues.length} مشكلة</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(issueCounts.severity_error || 0) > 0 && (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1">
                        <AlertCircle className="h-3 w-3" />{issueCounts.severity_error} خطأ
                      </Badge>
                    )}
                    {(issueCounts.severity_warning || 0) > 0 && (
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 gap-1">
                        <AlertCircle className="h-3 w-3" />{issueCounts.severity_warning} تحذير
                      </Badge>
                    )}
                    {(issueCounts.fixable_phone || 0) > 0 && (
                      <Badge variant="outline" className="bg-info/10 text-info border-info/30 gap-1">
                        <Wrench className="h-3 w-3" />{issueCounts.fixable_phone} قابل للإصلاح
                      </Badge>
                    )}
                    {issues.length === 0 && (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1">
                        <CheckCircle className="h-3 w-3" />لا توجد مشاكل!
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Quick Fix Banner */}
                {fixableIssues.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg border border-info/30 bg-info/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-info/15"><Zap className="h-5 w-5 text-info" /></div>
                      <div>
                        <h4 className="text-sm font-semibold">إصلاح سريع — {fixableIssues.length} رقم</h4>
                        <p className="text-xs text-muted-foreground">أرقام يمكن إصلاحها تلقائياً</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedFixableIssues.length > 0 && selectedFixableIssues.length < fixableIssues.length && (
                        <Button variant="outline" size="sm" onClick={() => fixAllPhones(true)} disabled={fixing} className="gap-1.5 border-info/30 text-info hover:bg-info/10">
                          {fixing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}
                          إصلاح المحدد ({selectedFixableIssues.length})
                        </Button>
                      )}
                      <Button size="sm" onClick={() => fixAllPhones(false)} disabled={fixing} className="gap-1.5 bg-info hover:bg-info/90 text-info-foreground">
                        {fixing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                        إصلاح الكل ({fixableIssues.length})
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
                        <Input placeholder="بحث..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
                        {searchQuery && (
                          <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchQuery("")}>
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-full sm:w-48 h-9"><SelectValue placeholder="نوع المشكلة" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الكل ({issueCounts.total || 0})</SelectItem>
                          {Object.entries(ISSUE_CONFIG).map(([type, config]) => {
                            const count = issueCounts[type] || 0
                            return count > 0 ? <SelectItem key={type} value={type}>{config.label} ({count})</SelectItem> : null
                          })}
                        </SelectContent>
                      </Select>
                      <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                        <SelectTrigger className="w-full sm:w-40 h-9"><SelectValue placeholder="الخطورة" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الكل</SelectItem>
                          {(issueCounts.severity_error || 0) > 0 && <SelectItem value="error">أخطاء ({issueCounts.severity_error})</SelectItem>}
                          {(issueCounts.severity_warning || 0) > 0 && <SelectItem value="warning">تحذيرات ({issueCounts.severity_warning})</SelectItem>}
                          {(issueCounts.severity_info || 0) > 0 && <SelectItem value="info">قابل للإصلاح ({issueCounts.severity_info})</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Actions Bar */}
                    <div className="flex items-center justify-between bg-muted p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Checkbox id="health-select-all" checked={filteredIssues.length > 0 && filteredIssues.every((i) => i.selected)} onCheckedChange={toggleSelectAll} className="h-4 w-4" disabled={filteredIssues.length === 0} />
                          <Label htmlFor="health-select-all" className="text-sm cursor-pointer font-medium">تحديد الكل ({filteredIssues.length})</Label>
                        </div>
                        {selectedCount > 0 && <Badge variant="default" className="gap-1">{selectedCount} محدد</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={exportIssuesCSV} className="gap-1.5" disabled={filteredIssues.length === 0}>
                          <Download className="h-3.5 w-3.5" /><span className="hidden sm:inline">تصدير</span>
                        </Button>
                        <Button variant="destructive" size="sm" onClick={deleteSelected} disabled={selectedCount === 0 || loading} className="gap-1.5">
                          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          حذف ({selectedCount})
                        </Button>
                      </div>
                    </div>

                    {/* Issues List */}
                    <div className="border rounded-lg overflow-hidden bg-background">
                      <div className="max-h-[400px] overflow-y-auto">
                        {filteredIssues.length === 0 ? (
                          <div className="p-8 text-center text-muted-foreground">
                            <CheckCircle className="h-10 w-10 mx-auto mb-3 text-success" />
                            <p className="font-medium">لا توجد مشاكل تطابق الفلتر</p>
                          </div>
                        ) : (
                          filteredIssues.map((issue, index) => {
                            const config = ISSUE_CONFIG[issue.type]
                            const IconComponent = config.icon
                            const isExpanded = expandedIssue === issue.id
                            const isEditing = editState?.issueId === issue.id
                            const isFixable = issue.type === "fixable_phone" && issue.fixedPhone

                            return (
                              <div
                                key={issue.id}
                                className={`
                                  ${index < filteredIssues.length - 1 ? "border-b" : ""}
                                  ${issue.selected ? "bg-primary/5" : ""}
                                  ${issue.severity === "error" ? "border-l-2 border-l-destructive" : ""}
                                  ${issue.severity === "warning" ? "border-l-2 border-l-warning" : ""}
                                  ${issue.severity === "info" ? "border-l-2 border-l-info" : ""}
                                  transition-colors hover:bg-muted/50
                                `}
                              >
                                {!isEditing && (
                                  <div className="flex items-start sm:items-center gap-3 p-3">
                                    <Checkbox checked={issue.selected} onCheckedChange={() => toggleSelect(issue.id)} className="h-4 w-4 flex-shrink-0 mt-0.5 sm:mt-0" />
                                    <IconComponent className={`h-4 w-4 flex-shrink-0 mt-0.5 sm:mt-0 ${issue.severity === "error" ? "text-destructive" : issue.severity === "warning" ? "text-warning" : "text-info"}`} />
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
                                        {issue.preacherId && <span className="text-[10px] text-muted-foreground/70">• {getPreacherName(issue.preacherId)}</span>}
                                        {issue.stage && <Badge variant="outline" className="text-[10px] h-4">{issue.stage}</Badge>}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      {getSeverityBadge(issue.severity)}
                                      <Badge variant="outline" className="text-[10px] hidden sm:flex">{config.label}</Badge>
                                      {isFixable && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-info/10 hover:text-info" onClick={() => fixSinglePhone(issue)} disabled={saving} title="إصلاح">
                                          <Wrench className="h-3 w-3" />
                                        </Button>
                                      )}
                                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10 hover:text-primary" onClick={() => startEdit(issue)} title="تعديل">
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      {issue.relatedIds && issue.relatedIds.length > 0 && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpandedIssue(isExpanded ? null : issue.id)}>
                                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {isEditing && editState && (
                                  <div className="p-3 space-y-3 bg-primary/5">
                                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                                      <Pencil className="h-4 w-4" />تعديل بيانات المستفيد
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div className="space-y-1">
                                        <Label className="text-xs font-medium">الاسم</Label>
                                        <Input value={editState.name} onChange={(e) => setEditState((p) => p && { ...p, name: e.target.value })} className="h-8 text-sm" />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-xs font-medium">رقم الهاتف</Label>
                                        <Input value={editState.phone} onChange={(e) => setEditState((p) => p && { ...p, phone: e.target.value })} className="h-8 text-sm font-mono" dir="ltr" />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-xs font-medium">الداعية</Label>
                                        <Select value={editState.preacherId || "none"} onValueChange={(v) => setEditState((p) => p && { ...p, preacherId: v === "none" ? "" : v })}>
                                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="none">بدون تعيين</SelectItem>
                                            {preachers.filter((p) => p.role === "da'i").map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-xs font-medium">المرحلة</Label>
                                        <Select value={editState.stage || "none"} onValueChange={(v) => setEditState((p) => p && { ...p, stage: v === "none" ? "" : v })}>
                                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="none">بدون مرحلة</SelectItem>
                                            {DAWA_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-2 pt-1">
                                      <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={saving} className="gap-1.5"><Undo2 className="h-3.5 w-3.5" />إلغاء</Button>
                                      <Button size="sm" onClick={saveEdit} disabled={saving} className="gap-1.5">
                                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}حفظ
                                      </Button>
                                    </div>
                                  </div>
                                )}

                                {isExpanded && !isEditing && issue.relatedIds && (
                                  <div className="px-12 pb-3 space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">السجلات المرتبطة:</p>
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
                <Button variant="outline" size="sm" onClick={() => { setAnalyzed(false); setIssues([]); setEditState(null) }}>
                  إعادة الفحص
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>إغلاق</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════
          KEY FIX: Confirm dialog rendered via portal to document.body
          Completely outside the Radix Dialog DOM tree
          ═══════════════════════════════════════════════════════════ */}
      {mounted &&
        createPortal(
          <AlertDialog
            open={confirmOpen}
            onOpenChange={(newOpen) => {
              if (!newOpen) handleConfirmResult(false)
            }}
          >
            <AlertDialogContent
              onCloseAutoFocus={(e) => {
                // CRITICAL: Prevent AlertDialog from touching focus/pointer-events
                e.preventDefault()
              }}
              onOpenAutoFocus={(e) => {
                // Prevent stealing focus management from parent
                e.preventDefault()
              }}
            >
              <AlertDialogHeader>
                <AlertDialogTitle>{confirmConfig.title}</AlertDialogTitle>
                <AlertDialogDescription>{confirmConfig.description}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={(e) => {
                    e.preventDefault()
                    handleConfirmResult(false)
                  }}
                >
                  {confirmConfig.cancelText}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault()
                    handleConfirmResult(true)
                  }}
                  className={cn(
                    confirmConfig.variant === "danger" && buttonVariants({ variant: "destructive" }),
                    confirmConfig.variant === "info" && "bg-info text-info-foreground hover:bg-info/90"
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