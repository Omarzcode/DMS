"use client"

import type React from "react"
import { useState, useRef, useCallback, useMemo, useEffect } from "react"
import { createPortal } from "react-dom"
import { collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { TableResponsive, TableEmpty } from "@/components/ui/table"
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
import {
  Loader2,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  X,
  Users,
  Phone,
  CheckCheck,
  Trash2,
  Eye,
  EyeOff,
  File,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  Undo2,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"
import type { Beneficiary, Preacher } from "@/lib/firestore-collections"
import { DAWA_STAGES } from "@/lib/firestore-collections"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

// ─── Constants ────────────────────────────────────────────────────

const MAX_FILE_SIZE      = 10 * 1024 * 1024
const FIRESTORE_IN_LIMIT = 10
const IMPORT_BATCH_SIZE  = 25

// ─── Types ────────────────────────────────────────────────────────

interface ContactImportDialogProps {
  onImportComplete?: () => void
  assignedPreacherId?: string
}

interface ContactRecord {
  id: string
  name: string
  phone: string
  formattedPhone: string
  da_wa_stage: string
  da_i_id: string
  batch: string        // Fix 10: Added missing batch field
  notes: string
  status: "pending" | "success" | "error" | "duplicate" | "invalid"
  error?: string
  selected: boolean
  isEdited?: boolean
  originalPhone?: string  // Fix 5: Track original for intra-file duplicate display
}

interface CommonSettings {
  da_wa_stage: string
  notes: string
  batch: string        // Fix 10: Added batch to common settings
  da_i_id: string
}

interface ConfirmConfig {
  title: string
  description: string
  confirmText: string
  cancelText: string
  variant: "danger" | "info" | "default"
}

// ─── Phone Utilities (module-level — Fix 1 & Fix 7) ──────────────
// Defined outside the component so parsers don't capture stale closures

function formatEgyptianPhone(phone: string): string {
  // Fix 7: Strip non-digits AFTER handling the + prefix
  // so that "+20" is caught before the + is removed
  let clean = phone.trim()

  // Handle +20 prefix before stripping symbols
  if (clean.startsWith("+20"))       clean = clean.slice(3)
  else if (clean.startsWith("0020")) clean = clean.slice(4)
  else if (clean.startsWith("002"))  clean = clean.slice(3)

  // Now strip everything except digits
  clean = clean.replace(/[^\d]/g, "")

  // Handle 20XXXXXXXXXX (country code without +)
  if (clean.startsWith("20") && clean.length === 12) clean = clean.slice(2)

  // 10-digit number missing leading 0
  if (clean.length === 10 && /^1[0-2,5]/.test(clean)) clean = "0" + clean

  // Valid Egyptian mobile
  if (clean.length === 11 && clean.startsWith("01")) return clean

  return ""
}

function isValidEgyptianPhone(phone: string): boolean {
  return /^01[0-2,5]\d{8}$/.test(formatEgyptianPhone(phone))
}

// ─── ID Generation (Fix 8) ────────────────────────────────────────

function generateId(index: number): string {
  // crypto.randomUUID() is collision-proof — no Date.now() race
  const uuid =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Math.random().toString(36).slice(2)}-${index}`
  return `contact-${uuid}`
}

// ─── Default settings factory (Fix 4) ────────────────────────────

function makeDefaultSettings(
  assignedPreacherId?: string,
  uid?: string
): CommonSettings {
  return {
    da_wa_stage: DAWA_STAGES[0],
    notes:       "",
    batch:       "",
    da_i_id:     assignedPreacherId || uid || "",
  }
}

// ─── Component ────────────────────────────────────────────────────

export function ContactImportDialog({
  onImportComplete,
  assignedPreacherId,
}: ContactImportDialogProps) {
  const { user, userRole } = useAuth()

  const [open, setOpen]                         = useState(false)
  const [loading, setLoading]                   = useState(false)
  const [error, setError]                       = useState<string | null>(null)
  const [contacts, setContacts]                 = useState<ContactRecord[]>([])
  const [deletedContacts, setDeletedContacts]   = useState<ContactRecord[]>([])
  const [importProgress, setImportProgress]     = useState(0)
  const [importedCount, setImportedCount]       = useState(0)
  const [failedCount, setFailedCount]           = useState(0)
  const [preachers, setPreachers]               = useState<Preacher[]>([])
  const [loadingPreachers, setLoadingPreachers] = useState(false)
  const [showDetails, setShowDetails]           = useState(false)
  const [importMethod, setImportMethod]         = useState<"vcf" | "csv">("vcf")
  const [currentStep, setCurrentStep]           = useState<1 | 2 | 3>(1)
  const [showSettings, setShowSettings]         = useState(false)
  const [filterStatus, setFilterStatus]         = useState<string>("all")
  const [searchQuery, setSearchQuery]           = useState("")
  const [isDragging, setIsDragging]             = useState(false)
  const [fileName, setFileName]                 = useState<string | null>(null)
  const [duplicateCheckDone, setDuplicateCheckDone] = useState(false)
  const [mounted, setMounted]                   = useState(false)

  // Fix 2: Inline confirm state (same portal pattern as DataHealthCheck)
  const [confirmOpen, setConfirmOpen]     = useState(false)
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig>({
    title: "", description: "", confirmText: "Confirm", cancelText: "Cancel", variant: "default",
  })
  const resolveRef = useRef<((v: boolean) => void) | null>(null)

  const [commonSettings, setCommonSettings] = useState<CommonSettings>(() =>
    makeDefaultSettings(assignedPreacherId, user?.uid)
  )

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef  = useRef<HTMLDivElement>(null)

  // ─── Mount ──────────────────────────────────────────────────────

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // ─── Confirm Helper (Fix 2) ────────────────────────────────────

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
    []
  )

  const handleConfirmResult = useCallback((result: boolean) => {
    setConfirmOpen(false)
    resolveRef.current?.(result)
    resolveRef.current = null
  }, [])

  // ─── Sync commonSettings when dialog opens (Fix 4) ────────────

  useEffect(() => {
    if (open) {
      setCommonSettings(makeDefaultSettings(assignedPreacherId, user?.uid))
    }
  // Fix 16: Use user?.uid not user object to avoid infinite re-renders
  }, [open, assignedPreacherId, user?.uid])

  // ─── Load Preachers (Fix 6) ────────────────────────────────────

  const loadPreachers = useCallback(async () => {
    if (!open || userRole !== "admin" || assignedPreacherId) return
    setLoadingPreachers(true)
    try {
      const snap = await getDocs(
        query(collection(db, "preachers"), where("role", "==", "da'i"))
      )
      setPreachers(
        snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Preacher[]
      )
    } catch (err) {
      console.error("Error loading preachers:", err)
      toast.error("Failed to load preachers list")
    } finally {
      setLoadingPreachers(false)
    }
  }, [open, userRole, assignedPreacherId])

  useEffect(() => {
    loadPreachers()
  }, [loadPreachers])

  // ─── Dialog State ──────────────────────────────────────────────

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && confirmOpen) return // Block close while confirm is open
    setOpen(newOpen)
    if (!newOpen) resetImportState()
  }

  // Fix 4: resetImportState reads fresh values from args, not closure
  const resetImportState = useCallback(() => {
    setContacts([])
    setDeletedContacts([])
    setImportProgress(0)
    setImportedCount(0)
    setFailedCount(0)
    setCommonSettings(makeDefaultSettings(assignedPreacherId, user?.uid))
    setError(null)
    setShowDetails(false)
    setImportMethod("vcf")
    setCurrentStep(1)
    setShowSettings(false)
    setFilterStatus("all")
    setSearchQuery("")
    setIsDragging(false)
    setFileName(null)
    setDuplicateCheckDone(false)
  }, [assignedPreacherId, user?.uid])

  // ─── File Parsing (Fix 1) ──────────────────────────────────────
  // Parsers no longer receive commonSettings — they produce "bare" records.
  // Settings (stage, notes, batch, da_i_id) are applied at import time.

  const parseVCF = useCallback((vcfContent: string): Omit<ContactRecord, "da_wa_stage" | "da_i_id" | "notes" | "batch">[] => {
    const records: Omit<ContactRecord, "da_wa_stage" | "da_i_id" | "notes" | "batch">[] = []
    const lines    = vcfContent.split("\n")
    let current: { name?: string; phone?: string } = {}
    let inContact  = false

    for (const raw of lines) {
      const line = raw.trim()

      if (line === "BEGIN:VCARD") {
        inContact = true
        current   = {}
        continue
      }

      if (line === "END:VCARD") {
        if (inContact && (current.name || current.phone)) {
          const phone          = current.phone || ""
          const formattedPhone = phone ? formatEgyptianPhone(phone) : ""
          const status: ContactRecord["status"] =
            !phone          ? "invalid" :
            !formattedPhone ? "invalid" : "pending"
          const error =
            !phone          ? "No phone number" :
            !formattedPhone ? "Invalid phone number" : undefined

          records.push({
            id:            generateId(records.length),
            name:          current.name || `Contact ${records.length + 1}`,
            phone,
            formattedPhone,
            originalPhone: phone,
            status,
            error,
            selected:      status === "pending",
            isEdited:      false,
          })
        }
        inContact = false
        continue
      }

      if (!inContact) continue

      if (line.startsWith("FN:") || line.startsWith("FN;")) {
        const value = line.substring(line.indexOf(":") + 1).trim()
        if (value) current.name = value
      } else if (line.startsWith("TEL;") || line.startsWith("TEL:")) {
        const telLine = line.substring(line.indexOf(":") + 1).trim()
        if (!current.phone && telLine) current.phone = telLine
      } else if ((line.startsWith("N:") || line.startsWith("N;")) && !current.name) {
        const value    = line.substring(line.indexOf(":") + 1)
        const parts    = value.split(";")
        const fullName = [parts[1]?.trim(), parts[0]?.trim()].filter(Boolean).join(" ")
        if (fullName) current.name = fullName
      }
    }

    return records
  }, []) // No commonSettings dependency — Fix 1

  const parseCSV = useCallback((csvContent: string): Omit<ContactRecord, "da_wa_stage" | "da_i_id" | "notes" | "batch">[] => {
    const records: Omit<ContactRecord, "da_wa_stage" | "da_i_id" | "notes" | "batch">[] = []
    const lines = csvContent.split("\n").filter((l) => l.trim())
    if (lines.length === 0) return records

    const firstLine      = lines[0]
    const delimiter      = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ","
    const firstLineLower = firstLine.toLowerCase()
    const isHeader =
      firstLineLower.includes("name")  ||
      firstLineLower.includes("phone") ||
      firstLineLower.includes("contact") ||
      firstLineLower.includes("mobile") ||
      firstLineLower.includes("number")
    const startIndex = isHeader ? 1 : 0

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const parts = line
        .split(delimiter)
        .map((p) => p.replace(/^["']|["']$/g, "").trim())

      let name = "", phone = ""

      if (parts.length >= 2) {
        const firstIsPhone  = /^[\+]?[\d\s\-()]{8,}$/.test(parts[0])
        const secondIsPhone = /^[\+]?[\d\s\-()]{8,}$/.test(parts[1])
        if (firstIsPhone && !secondIsPhone) { phone = parts[0]; name = parts[1] }
        else                                { name  = parts[0]; phone = parts[1] }
      } else if (parts.length === 1) {
        if (/[\+]?[0-9]{10,13}/.test(parts[0])) phone = parts[0]
        else                                      name  = parts[0]
      }

      const formattedPhone = phone ? formatEgyptianPhone(phone) : ""
      const status: ContactRecord["status"] =
        !phone          ? "invalid" :
        !formattedPhone ? "invalid" : "pending"
      const error =
        !phone          ? "No phone number" :
        !formattedPhone ? "Invalid phone number" : undefined

      records.push({
        id:            generateId(i),
        name:          name || `Beneficiary ${i + 1}`,
        phone,
        formattedPhone,
        originalPhone: phone,
        status,
        error,
        selected:      status === "pending",
        isEdited:      false,
      })
    }

    return records
  }, []) // No commonSettings dependency — Fix 1

  // ─── Apply settings to bare records (Fix 1) ───────────────────

  const applySettingsToRecords = useCallback(
    (
      bare: Omit<ContactRecord, "da_wa_stage" | "da_i_id" | "notes" | "batch">[],
      settings: CommonSettings
    ): ContactRecord[] => {
      return bare.map((r) => ({
        ...r,
        da_wa_stage: settings.da_wa_stage,
        da_i_id:     settings.da_i_id,
        notes:       settings.notes,
        batch:       settings.batch,
      }))
    },
    []
  )

  // ─── File Handling ─────────────────────────────────────────────

  const processFile = useCallback(
    (file: globalThis.File) => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File size too large. Maximum ${MAX_FILE_SIZE / 1024 / 1024}MB`)
        return
      }

      const extension       = file.name.toLowerCase().split(".").pop()
      const validExtensions = importMethod === "vcf" ? ["vcf", "vcard"] : ["csv", "txt"]

      if (!extension || !validExtensions.includes(extension)) {
        toast.error(`Unsupported format. Supported formats: ${validExtensions.join(", ")}`)
        return
      }

      setFileName(file.name)

      const reader    = new FileReader()
      reader.onload   = (e) => {
        try {
          const fileContent = e.target?.result as string

          // Parse to bare records (no settings applied yet — Fix 1)
          const bareRecords =
            extension === "vcf" || extension === "vcard"
              ? parseVCF(fileContent)
              : parseCSV(fileContent)

          if (bareRecords.length === 0) {
            toast.error("No contacts found in file")
            return
          }

          // Fix 5: Track intra-file duplicates visibly instead of silent drop
          const seenPhones          = new Map<string, string>() // phone → first contact name
          const deduped: typeof bareRecords = []
          const intraDuplicates: string[] = []

          for (const record of bareRecords) {
            if (record.formattedPhone && seenPhones.has(record.formattedPhone)) {
              intraDuplicates.push(
                `${record.name} (${record.formattedPhone}) — duplicate with ${seenPhones.get(record.formattedPhone)}`
              )
              continue
            }
            if (record.formattedPhone) seenPhones.set(record.formattedPhone, record.name)
            deduped.push(record)
          }

          // Apply current settings at parse time (Fix 1)
          const withSettings = applySettingsToRecords(deduped, commonSettings)

          setContacts(withSettings)
          setCurrentStep(2)
          setDuplicateCheckDone(false)

          let message = `Loaded ${withSettings.length} contacts`
          if (intraDuplicates.length > 0) {
            message += ` (ignored ${intraDuplicates.length} duplicates in file)`
            // Show which ones were dropped
            toast.warning(
              `Ignored ${intraDuplicates.length} duplicate contacts in file`,
              {
                description: intraDuplicates.slice(0, 3).join("\n") +
                  (intraDuplicates.length > 3 ? `\n...and ${intraDuplicates.length - 3} more` : ""),
              }
            )
          }
          toast.success(message)
        } catch (err) {
          console.error("Error parsing file:", err)
          toast.error("Unable to read file. Make sure the format is correct")
        }
      }
      reader.onerror = () => toast.error("An error occurred while reading the file")
      reader.readAsText(file, "UTF-8")
    },
    [importMethod, parseVCF, parseCSV, applySettingsToRecords, commonSettings]
  )

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) processFile(file)
    if (event.target) event.target.value = ""
  }

  // ─── Drag and Drop ─────────────────────────────────────────────

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  // ─── Contact Operations ────────────────────────────────────────

  const applyCommonSettings = () => {
    setContacts((prev) =>
      prev.map((contact) => {
        if (contact.status === "success") return contact
        return {
          ...contact,
          da_wa_stage: commonSettings.da_wa_stage,
          da_i_id:     commonSettings.da_i_id,
          notes:       commonSettings.notes,
          batch:       commonSettings.batch,
          isEdited:    true,
        }
      })
    )
    toast.success("Settings applied to all contacts")
  }

  // Fix 9: Use functional setContacts to avoid stale state during async loop
  const checkExistingPhones = async () => {
    if (contacts.length === 0) return
    setLoading(true)

    try {
      const validContacts = contacts.filter(
        (c) => c.formattedPhone && c.status !== "success"
      )

      if (validContacts.length === 0) {
        toast.info("No valid contacts to check")
        return
      }

      // Collect all existing phones first, then do one state update
      const existingPhoneSet = new Set<string>()

      for (let i = 0; i < validContacts.length; i += FIRESTORE_IN_LIMIT) {
        const batchPhones = validContacts
          .slice(i, i + FIRESTORE_IN_LIMIT)
          .map((c) => c.formattedPhone)
          .filter(Boolean)

        if (batchPhones.length === 0) continue

        const snap = await getDocs(
          query(collection(db, "beneficiaries"), where("phone", "in", batchPhones))
        )
        snap.docs.forEach((d) => existingPhoneSet.add(d.data().phone))
      }

      // Fix 9: Single functional update — no stale closure risk
      setContacts((prev) =>
        prev.map((contact) => {
          if (existingPhoneSet.has(contact.formattedPhone)) {
            return {
              ...contact,
              status:   "duplicate" as const,
              error:    "Phone already registered in the system",
              selected: false,
            }
          }
          return contact
        })
      )

      setDuplicateCheckDone(true)

      // Count after update (read from existingPhoneSet)
      const dupCount = contacts.filter(
        (c) => existingPhoneSet.has(c.formattedPhone)
      ).length

      if (dupCount > 0) toast.warning(`Found ${dupCount} duplicate phone numbers in the system`)
      else              toast.success("No duplicate phone numbers found")
    } catch (err) {
      console.error("Error checking phones:", err)
      toast.error("An error occurred while checking for duplicate phone numbers")
    } finally {
      setLoading(false)
    }
  }

  const updateContact = useCallback((id: string, updates: Partial<ContactRecord>) => {
    setContacts((prev) =>
      prev.map((contact) => {
        if (contact.id !== id) return contact

        const updated = { ...contact, ...updates, isEdited: true }

        if (updates.phone !== undefined) {
          const newFormatted = formatEgyptianPhone(updates.phone)
          updated.formattedPhone = newFormatted

          if (!updates.phone.trim()) {
            updated.status = "invalid"
            updated.error  = "No phone number"
          } else if (!newFormatted) {
            updated.status = "invalid"
            updated.error  = "Invalid phone number"
          } else if (contact.status === "invalid") {
            updated.status = "pending"
            updated.error  = undefined
          }
        }

        return updated
      })
    )
  }, [])

  // Fix 13: deleteContact captures specific contact for undo, not just "last"
  const deleteContact = useCallback((id: string) => {
    const contactToDelete = contacts.find((c) => c.id === id)
    if (!contactToDelete) return

    setContacts((prev) => prev.filter((c) => c.id !== id))
    setDeletedContacts((prev) => [...prev, contactToDelete])

    toast.info("Contact deleted", {
      action: {
        label:   "Undo",
        // Capture the specific contact — not the last in the stack
        onClick: () => restoreContact(contactToDelete),
      },
    })
  }, [contacts])

  // Fix 13: Restore a specific contact, not always the last one
  const restoreContact = useCallback((contact: ContactRecord) => {
    setDeletedContacts((prev) => prev.filter((c) => c.id !== contact.id))
    setContacts((prev) => [...prev, contact])
    toast.success("Contact restored")
  }, [])

  const undoLastDelete = useCallback(() => {
    if (deletedContacts.length === 0) return
    const last = deletedContacts[deletedContacts.length - 1]
    restoreContact(last)
  }, [deletedContacts, restoreContact])

  // ─── Memoized Computed Values ──────────────────────────────────

  const statusCounts = useMemo(() => {
    const counts = { total: 0, selected: 0, pending: 0, success: 0, error: 0, invalid: 0, duplicate: 0 }
    for (const c of contacts) {
      counts.total++
      if (c.selected) counts.selected++
      counts[c.status] = (counts[c.status] || 0) + 1
    }
    return counts
  }, [contacts])

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      if (filterStatus !== "all" && contact.status !== filterStatus) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim()
        return (
          contact.name.toLowerCase().includes(q) ||
          contact.phone.includes(q)              ||
          contact.formattedPhone.includes(q)
        )
      }
      return true
    })
  }, [contacts, filterStatus, searchQuery])

  // Fix 12: selectedCount is consistent — only pending contacts that are selected
  const selectedCount = useMemo(() =>
    contacts.filter((c) => c.selected && c.status === "pending").length,
  [contacts])

  const selectableFilteredContacts = useMemo(() =>
    filteredContacts.filter((c) => c.status !== "success" && c.status !== "invalid"),
  [filteredContacts])

  const allFilteredSelected = useMemo(() =>
    selectableFilteredContacts.length > 0 &&
    selectableFilteredContacts.every((c) => c.selected),
  [selectableFilteredContacts])

  const toggleSelectAll = useCallback(() => {
    const selectableIds = new Set(selectableFilteredContacts.map((c) => c.id))
    const shouldSelect  = !allFilteredSelected
    setContacts((prev) =>
      prev.map((c) =>
        selectableIds.has(c.id) ? { ...c, selected: shouldSelect } : c
      )
    )
  }, [selectableFilteredContacts, allFilteredSelected])

  // ─── Import (Fix 3) ───────────────────────────────────────────

  const handleImport = async () => {
    const selectedContacts = contacts.filter(
      (c) => c.selected && c.status === "pending"
    )

    if (selectedContacts.length === 0) {
      toast.error("No contacts selected for import")
      return
    }

    // Fix 2: Use AlertDialog portal instead of window.confirm
    const duplicateSelected = contacts.filter(
      (c) => c.selected && c.status === "duplicate"
    ).length

    if (duplicateSelected > 0) {
      const confirmed = await confirm({
        title:       "Duplicate contacts selected",
        description: `There are ${duplicateSelected} duplicate contact(s) selected. Do you want to proceed and add them?`,
        confirmText: "Continue",
        cancelText:  "Cancel",
        variant:     "danger",
      })
      if (!confirmed) return
    }

    // Validate required fields
    if (!commonSettings.da_i_id) {
      toast.error("Please select a preacher before importing")
      return
    }

    setLoading(true)
    setImportProgress(0)
    setImportedCount(0)
    setFailedCount(0)
    setCurrentStep(3)

    let successful = 0
    let failed     = 0

    // Collect all status updates and apply them in one go per batch
    // Fix 3: No updateContact calls inside the loop
    const statusUpdates = new Map<string, Pick<ContactRecord, "status" | "error">>()

    try {
      for (let i = 0; i < selectedContacts.length; i += IMPORT_BATCH_SIZE) {
        const batch        = writeBatch(db)
        const currentBatch = selectedContacts.slice(i, i + IMPORT_BATCH_SIZE)
        const batchIds: string[] = []

        for (const contact of currentBatch) {
          if (!isValidEgyptianPhone(contact.formattedPhone || contact.phone)) {
            statusUpdates.set(contact.id, { status: "error", error: "Invalid phone number for import" })
            failed++
            continue
          }

          const newBeneficiary: Omit<Beneficiary, "id"> = {
            name:        contact.name.trim(),
            phone:       contact.formattedPhone,
            da_i_id:     contact.da_i_id,
            da_wa_stage: contact.da_wa_stage as "New Contact" | "Initial Interest" | "Regular Attendance" | "Committed Learner",
            // Fix 10: Include batch field
            batch:       contact.batch.trim() || commonSettings.batch.trim() || "—",
            notes:       contact.notes.trim(),
            created_at:  new Date(),
          }

          const docRef = doc(collection(db, "beneficiaries"))
          batch.set(docRef, newBeneficiary)
          batchIds.push(contact.id)
        }

        try {
          await batch.commit()
          batchIds.forEach((id) => statusUpdates.set(id, { status: "success", error: undefined }))
          successful += batchIds.length
        } catch (batchError) {
          console.error("Batch commit failed:", batchError)
          batchIds.forEach((id) =>
            statusUpdates.set(id, { status: "error", error: "Failed to save batch" })
          )
          failed += batchIds.length
        }

        // Fix 11: Update progress incrementally within the batch
        const processed = Math.min(i + currentBatch.length, selectedContacts.length)
        setImportProgress(Math.round((processed / selectedContacts.length) * 100))
        setImportedCount(successful)
        setFailedCount(failed)

        // Apply status updates after each batch (Fix 3: single state update per batch)
        const snapshot = new Map(statusUpdates)
        setContacts((prev) =>
          prev.map((c) => {
            const update = snapshot.get(c.id)
            return update ? { ...c, ...update } : c
          })
        )

        if (i + IMPORT_BATCH_SIZE < selectedContacts.length) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }

      setImportProgress(100)
      setImportedCount(successful)
      setFailedCount(failed)

      if (successful > 0) {
        toast.success("Import completed successfully", {
          description: `Added ${successful} beneficiary(ies)${failed > 0 ? ` (${failed} failed)` : ""}`,
        })
        onImportComplete?.()
      } else if (failed > 0) {
        toast.error("Import failed", {
          description: `Failed to add ${failed} beneficiary(ies)`,
        })
      }
    } catch (err) {
      console.error("Import failed:", err)
      toast.error("An error occurred during import")
    } finally {
      setLoading(false)
    }
  }

  // ─── UI Helpers ────────────────────────────────────────────────

  const getStatusBadge = (status: ContactRecord["status"]) => {
    const config = {
      pending:   { label: "Pending", variant: "secondary"    as const, icon: null,                                  className: "" },
      success:   { label: "Success",         variant: "default"       as const, icon: <CheckCircle className="h-3 w-3" />,  className: "bg-success/20 text-success" },
      error:     { label: "Error",          variant: "destructive"   as const, icon: <AlertCircle className="h-3 w-3" />,  className: "" },
      duplicate: { label: "Duplicate",         variant: "outline"       as const, icon: <AlertCircle className="h-3 w-3" />,  className: "border-warning text-warning hover:bg-warning/10" },
      invalid:   { label: "Invalid",     variant: "destructive"   as const, icon: <X className="h-3 w-3" />,            className: "" },
    }
    const cfg = config[status]
    return (
      <Badge variant={cfg.variant} className={`text-xs gap-1 whitespace-nowrap ${cfg.className}`}>
        {cfg.icon}{cfg.label}
      </Badge>
    )
  }

  const getStepStatus = (step: number) => {
    if (currentStep > step)  return "complete"
    if (currentStep === step) return "current"
    return "upcoming"
  }

  // ─── Render ────────────────────────────────────────────────────

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2 hover:bg-primary/5 transition-colors">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Import Contacts</span>
            <span className="sm:hidden">Import</span>
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-[95vw] lg:max-w-5xl max-h-[90dvh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
            <DialogTitle className="flex items-center gap-3 text-lg sm:text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div>Import Contacts</div>
                <DialogDescription className="text-xs sm:text-sm mt-1">
                  {fileName ? `File: ${fileName}` : "Bulk import contacts from files"}
                </DialogDescription>
              </div>
            </DialogTitle>

            {/* Progress Steps */}
            <div className="flex items-center justify-between mt-4 px-2">
              {[1, 2, 3].map((step, index) => {
                const status = getStepStatus(step)
                const labels = ["Select File", "Review & Edit", "Import"]
                return (
                  <div key={step} className="flex items-center flex-1">
                    <div className="flex flex-col items-center gap-2 flex-1">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                        status === "complete" && "bg-success text-white",
                        status === "current"  && "bg-primary text-white ring-4 ring-primary/20",
                        status === "upcoming" && "bg-muted text-muted-foreground",
                      )}>
                        {status === "complete" ? <CheckCircle className="h-4 w-4" /> : step}
                      </div>
                      <span className={cn(
                        "text-xs hidden sm:block",
                        status === "current" ? "font-medium text-primary" : "text-muted-foreground"
                      )}>
                        {labels[index]}
                      </span>
                    </div>
                    {index < 2 && (
                      <div className={cn(
                        "h-[2px] flex-1 mx-2 transition-colors",
                        status === "complete" ? "bg-success" : "bg-muted"
                      )} />
                    )}
                  </div>
                )
              })}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 space-y-4 pb-4 pt-4">
            {error && (
              <Alert variant="destructive" className="text-xs sm:text-sm">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* ────────── Step 1: File Upload ────────── */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="text-center py-4">
                  <h3 className="font-semibold text-lg mb-2">Select the file type to import</h3>
                  <p className="text-sm text-muted-foreground">Choose the file format you want to import contacts from</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                  {(["vcf", "csv"] as const).map((method) => (
                    <button
                      key={method}
                      onClick={() => setImportMethod(method)}
                      className={cn(
                        "group relative p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-lg hover:scale-[1.02]",
                        importMethod === method
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className={cn(
                          "p-4 rounded-full transition-colors",
                          importMethod === method
                            ? "bg-primary text-white"
                            : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                        )}>
                          {method === "vcf" ? <File className="h-8 w-8" /> : <FileText className="h-8 w-8" />}
                        </div>
                        <div className="text-center">
                          <h4 className="font-semibold text-base mb-1">
                            {method === "vcf" ? "vCard File" : "CSV/Text File"}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {method === "vcf" ? "Import from phone contacts" : "Import from Excel or text file"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 font-mono">
                            {method === "vcf" ? ".vcf" : ".csv / .txt"}
                          </p>
                        </div>
                      </div>
                      {importMethod === method && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle className="h-5 w-5 text-primary" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Drag & Drop Upload Area */}
                <div className="max-w-2xl mx-auto">
                  <div
                    ref={dropZoneRef}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={cn(
                      "border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200",
                      isDragging
                        ? "border-primary bg-primary/10 scale-[1.02] shadow-lg"
                        : "border-border bg-muted/50 hover:bg-muted hover:border-primary/30"
                    )}
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className={cn(
                        "p-4 rounded-full transition-all",
                        isDragging ? "bg-primary text-white scale-110" : "bg-primary/10"
                      )}>
                        <Upload className={cn("h-8 w-8", isDragging ? "text-white" : "text-primary")} />
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium text-base">
                          {isDragging
                            ? "Drop file here"
                            : importMethod === "vcf" ? "Upload vCard file" : "Upload CSV or TXT file"}
                        </h4>
                        <p className="text-sm text-muted-foreground">Drag and drop file here or click to select</p>
                        <p className="text-xs text-muted-foreground/70">Maximum: {MAX_FILE_SIZE / 1024 / 1024}MB</p>
                      </div>
                      <Input
                        type="file"
                        accept={importMethod === "vcf" ? ".vcf,.vcard" : ".csv,.txt"}
                        onChange={handleFileUpload}
                        ref={fileInputRef}
                        className="hidden"
                      />
                      <Button variant="default" onClick={() => fileInputRef.current?.click()} className="gap-2">
                        <Upload className="h-4 w-4" />
                        Choose File
                      </Button>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="mt-6 p-4 bg-info/10 border border-info/30 rounded-lg">
                    <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-info" />
                      How to export contacts from your phone:
                    </h5>
                    <ol className="text-sm text-muted-foreground space-y-1 pr-5 list-decimal">
                      <li>Open <strong>Contacts</strong> app on your phone</li>
                      <li>Tap <strong>Menu</strong> (⋮) or <strong>Settings</strong></li>
                      <li>Choose <strong>Export</strong> or <strong>Share</strong></li>
                      <li>{importMethod === "vcf" ? "Select export as vCard file (.vcf)" : "Save as CSV or TXT file"}</li>
                      <li>Save the file and upload it here</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* ────────── Step 2: Review & Edit ────────── */}
            {currentStep === 2 && contacts.length > 0 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                {/* Settings Section */}
                <div className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="w-full px-4 py-3 flex items-center justify-between bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-primary/10">
                        <Filter className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium text-sm">Common Settings</span>
                    </div>
                    {showSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {showSettings && (
                    <div className="p-4 space-y-4 border-t bg-background">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Da'wa Stage */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Stage</Label>
                          <Select
                            value={commonSettings.da_wa_stage}
                            onValueChange={(v) => setCommonSettings((p) => ({ ...p, da_wa_stage: v }))}
                          >
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {DAWA_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Fix 10: Batch field in common settings */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Batch / Group *</Label>
                          <Input
                            value={commonSettings.batch}
                            onChange={(e) => setCommonSettings((p) => ({ ...p, batch: e.target.value }))}
                            placeholder="Example: 2024-A, Evening Group"
                            className="h-9"
                          />
                        </div>

                        {/* Preacher selector — admin only */}
                        {userRole === "admin" && !assignedPreacherId && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Assign to Preacher</Label>
                            {loadingPreachers ? (
                              <div className="flex items-center gap-2 p-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm">Loading...</span>
                              </div>
                            ) : (
                              <Select
                                value={commonSettings.da_i_id}
                                onValueChange={(v) => setCommonSettings((p) => ({ ...p, da_i_id: v }))}
                              >
                                <SelectTrigger className="h-9"><SelectValue placeholder="Select Preacher" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={user?.uid || ""}>
                                    (Me) {user?.displayName?.split(" ")[0] || user?.email?.split("@")[0] || "Preacher"}
                                  </SelectItem>
                                  {preachers.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        )}

                        {/* Notes */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Notes (Optional)</Label>
                          <Input
                            value={commonSettings.notes}
                            onChange={(e) => setCommonSettings((p) => ({ ...p, notes: e.target.value }))}
                            placeholder="General notes"
                            className="h-9"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button onClick={applyCommonSettings} className="gap-2" size="sm">
                          <CheckCheck className="h-4 w-4" />
                          Apply to All
                        </Button>
                        <Button
                          variant="outline"
                          onClick={checkExistingPhones}
                          disabled={loading}
                          className="gap-2"
                          size="sm"
                        >
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          Check Duplicates
                        </Button>
                      </div>

                      {!duplicateCheckDone && (
                        <Alert className="text-xs border-warning/50 bg-warning/5">
                          <AlertCircle className="h-4 w-4 text-warning" />
                          <AlertDescription className="text-warning">
                            It is recommended to check for duplicate phone numbers before importing to avoid duplicates in the database
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </div>

                {/* Contacts List Header */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-muted p-4 rounded-lg border">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h4 className="font-semibold text-base flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Contacts ({filteredContacts.length} of {contacts.length})
                    </h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle className="h-3 w-3" />Selected: {statusCounts.selected}
                      </Badge>
                      {statusCounts.success > 0 && (
                        <Badge className="gap-1 bg-success/20 text-success">Success: {statusCounts.success}</Badge>
                      )}
                      {statusCounts.error > 0 && (
                        <Badge variant="destructive" className="gap-1">Error: {statusCounts.error}</Badge>
                      )}
                      {statusCounts.invalid > 0 && (
                        <Badge variant="destructive" className="gap-1">Invalid: {statusCounts.invalid}</Badge>
                      )}
                      {statusCounts.duplicate > 0 && (
                        <Badge variant="outline" className="gap-1 border-warning text-warning">
                          Duplicate: {statusCounts.duplicate}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 w-full sm:w-48"
                      />
                      {searchQuery && (
                        <Button
                          variant="ghost" size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setSearchQuery("")}
                          aria-label="Clear search"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All ({statusCounts.total})</SelectItem>
                        <SelectItem value="pending">Pending ({statusCounts.pending})</SelectItem>
                        <SelectItem value="success">Success ({statusCounts.success})</SelectItem>
                        <SelectItem value="error">Error ({statusCounts.error})</SelectItem>
                        <SelectItem value="invalid">Invalid ({statusCounts.invalid})</SelectItem>
                        <SelectItem value="duplicate">Duplicate ({statusCounts.duplicate})</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Contacts Table */}
                <div className="border rounded-lg overflow-hidden bg-background">
                  {/* Table Actions */}
                  <div className="px-4 py-3 bg-muted border-b flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="select-all"
                          checked={allFilteredSelected}
                          onCheckedChange={toggleSelectAll}
                          className="h-4 w-4"
                          disabled={selectableFilteredContacts.length === 0}
                        />
                        <Label htmlFor="select-all" className="text-sm cursor-pointer font-medium">
                          Select All ({selectableFilteredContacts.length})
                        </Label>
                      </div>
                      {deletedContacts.length > 0 && (
                        <Button
                          variant="ghost" size="sm"
                          onClick={undoLastDelete}
                          className="gap-1.5 text-xs text-primary hover:text-primary"
                        >
                          <Undo2 className="h-3 w-3" />
                          Undo ({deletedContacts.length})
                        </Button>
                      )}
                    </div>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => setShowDetails(!showDetails)}
                      className="gap-2 text-xs"
                    >
                      {showDetails
                        ? <><EyeOff className="h-3 w-3" />Simple View</>
                        : <><Eye className="h-3 w-3" />Detailed View</>}
                    </Button>
                  </div>

                  {/* Table Content */}
                  <TableResponsive maxHeight="400px">
                    {filteredContacts.length === 0 ? (
                      <TableEmpty
                        title="No contacts matching the search"
                        description="Try changing your search criteria or filter"
                        icon={<Users className="h-10 w-10 text-muted-foreground/50" />}
                      />
                    ) : (
                      <table className="w-full">
                        <thead className="bg-muted sticky top-0 z-10">
                          <tr className="border-b text-xs text-muted-foreground">
                            <th className="p-3 text-center w-12">#</th>
                            <th className="p-3 text-right">Name</th>
                            <th className="p-3 text-right">Phone</th>
                            {showDetails && (
                              <>
                                <th className="p-3 text-right">Stage</th>
                                <th className="p-3 text-right">Batch</th>
                                <th className="p-3 text-right">Notes</th>
                              </>
                            )}
                            <th className="p-3 text-center">Status</th>
                            <th className="p-3 text-center w-20">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredContacts.map((contact) => (
                            <tr
                              key={contact.id}
                              className={cn(
                                "border-b transition-colors hover:bg-muted/50",
                                contact.status === "success"                     && "bg-success/5 opacity-70",
                                (contact.status === "error" ||
                                 contact.status === "invalid")                   && "bg-destructive/5",
                                contact.status === "duplicate"                   && "bg-warning/5",
                                contact.selected && contact.status === "pending" && "bg-primary/5",
                              )}
                            >
                              <td className="p-3 text-center">
                                <Checkbox
                                  checked={contact.selected}
                                  onCheckedChange={(checked) =>
                                    updateContact(contact.id, { selected: checked === true })
                                  }
                                  disabled={contact.status === "success" || contact.status === "invalid"}
                                  className="h-4 w-4"
                                  aria-label={`Select ${contact.name}`}
                                />
                              </td>

                              <td className="p-3">
                                {showDetails ? (
                                  <Input
                                    value={contact.name}
                                    onChange={(e) => updateContact(contact.id, { name: e.target.value })}
                                    className="h-8 text-sm"
                                    disabled={contact.status === "success"}
                                  />
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium truncate max-w-[200px]" title={contact.name}>
                                      {contact.name}
                                    </span>
                                    {contact.isEdited && (
                                      <Badge variant="outline" className="text-[10px] px-1">Edited</Badge>
                                    )}
                                  </div>
                                )}
                              </td>

                              <td className="p-3">
                                {showDetails ? (
                                  <div className="space-y-1">
                                    <Input
                                      value={contact.phone}
                                      onChange={(e) => updateContact(contact.id, { phone: e.target.value })}
                                      className="h-8 text-sm font-mono"
                                      dir="ltr"
                                      disabled={contact.status === "success"}
                                    />
                                    {contact.formattedPhone && contact.formattedPhone !== contact.phone && (
                                      <span className="text-[10px] text-muted-foreground font-mono" dir="ltr">
                                        ← {contact.formattedPhone}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    <span className="text-sm font-mono" dir="ltr">
                                      {contact.formattedPhone || contact.phone || "None"}
                                    </span>
                                  </div>
                                )}
                              </td>

                              {showDetails && (
                                <>
                                  <td className="p-3">
                                    <Select
                                      value={contact.da_wa_stage}
                                      onValueChange={(value) =>
                                        updateContact(contact.id, { da_wa_stage: value })
                                      }
                                      disabled={contact.status === "success"}
                                    >
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {DAWA_STAGES.map((stage) => (
                                          <SelectItem key={stage} value={stage} className="text-xs">
                                            {stage}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </td>

                                  {/* Fix 10: Batch column in detailed view */}
                                  <td className="p-3">
                                    <Input
                                      value={contact.batch}
                                      onChange={(e) =>
                                        updateContact(contact.id, { batch: e.target.value })
                                      }
                                      className="h-8 text-xs"
                                      placeholder="Batch"
                                      disabled={contact.status === "success"}
                                    />
                                  </td>

                                  <td className="p-3">
                                    <Input
                                      value={contact.notes}
                                      onChange={(e) =>
                                        updateContact(contact.id, { notes: e.target.value })
                                      }
                                      className="h-8 text-xs"
                                      placeholder="Notes"
                                      disabled={contact.status === "success"}
                                    />
                                  </td>
                                </>
                              )}

                              <td className="p-3">
                                <div className="flex flex-col gap-1 items-center">
                                  {getStatusBadge(contact.status)}
                                  {contact.error && (
                                    <span
                                      className="text-[10px] text-destructive max-w-[100px] truncate"
                                      title={contact.error}
                                    >
                                      {contact.error}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="p-3 text-center">
                                {/* Fix 15: aria-label on icon-only delete button */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteContact(contact.id)}
                                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                  disabled={contact.status === "success"}
                                  aria-label={`Delete ${contact.name}`}
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </TableResponsive>
                </div>
              </div>
            )}

            {/* ────────── Step 3: Import Progress ────────── */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in duration-300 py-8">
                <div className="text-center">
                  <div className="inline-flex p-4 rounded-full bg-primary/10 mb-4">
                    {importProgress >= 100 && !loading ? (
                      failedCount > 0 && importedCount === 0 ? (
                        <AlertCircle className="h-12 w-12 text-destructive" />
                      ) : (
                        <CheckCircle className="h-12 w-12 text-success" />
                      )
                    ) : (
                      <Loader2 className="h-12 w-12 text-primary animate-spin" />
                    )}
                  </div>
                  <h3 className="font-semibold text-xl mb-2">
                    {!loading && importProgress >= 100
                      ? failedCount > 0 && importedCount === 0
                        ? "Import Failed"
                        : "Import Completed Successfully!"
                      : "Importing..."}
                  </h3>
                  <p className="text-muted-foreground">
                    {!loading && importProgress >= 100
                      ? `Successfully added ${importedCount} beneficiary(ies)${failedCount > 0 ? ` (${failedCount} failed)` : ""}`
                      : "Please wait while all contacts are being imported"}
                  </p>
                </div>

                <div className="max-w-md mx-auto space-y-3">
                  <Progress value={importProgress} className="h-3" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{Math.round(importProgress)}%</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="text-center p-4 rounded-lg bg-success/10 border border-success/30">
                      <div className="text-2xl font-bold text-success">{importedCount}</div>
                      <div className="text-xs text-success mt-1">Successful</div>
                    </div>
                    {failedCount > 0 && (
                      <div className="text-center p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                        <div className="text-2xl font-bold text-destructive">{failedCount}</div>
                        <div className="text-xs text-destructive mt-1">Failed</div>
                      </div>
                    )}
                  </div>

                  {!loading && failedCount > 0 && (
                    <div className="mt-4 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                      <h4 className="text-sm font-medium text-destructive mb-2">
                        Failed to import:
                      </h4>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {contacts
                          .filter((c) => c.status === "error")
                          .map((c) => (
                            <div key={c.id} className="text-xs flex justify-between items-center">
                              <span>{c.name}</span>
                              <span className="text-destructive/70">{c.error}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="px-4 sm:px-6 pb-4 pt-3 border-t bg-muted flex-col sm:flex-row gap-2">
            <div className="flex-1 flex items-center gap-4 text-sm text-muted-foreground order-2 sm:order-1">
              {currentStep === 2 && (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-medium">Ready to import:</span>
                  <Badge variant="default" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {selectedCount} contact(s)
                  </Badge>
                  {!duplicateCheckDone && selectedCount > 0 && (
                    <span className="text-xs text-warning">⚠ Duplicate check not done</span>
                  )}
                  {!commonSettings.batch.trim() && selectedCount > 0 && (
                    <span className="text-xs text-warning">⚠ Batch not specified</span>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
              {currentStep === 2 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCurrentStep(1)
                    setContacts([])
                    setDeletedContacts([])
                    setFileName(null)
                    setDuplicateCheckDone(false)
                  }}
                  disabled={loading}
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  Back
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading && currentStep === 3}
                size="sm"
                className="flex-1 sm:flex-none"
              >
                {currentStep === 3 && !loading && importProgress >= 100 ? "Close" : "Cancel"}
              </Button>

              {currentStep === 2 && (
                <Button
                  onClick={handleImport}
                  disabled={loading || selectedCount === 0}
                  size="sm"
                  className="gap-2 flex-1 sm:flex-none min-w-[120px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Import ({selectedCount})
                    </>
                  )}
                </Button>
              )}

              {currentStep === 3 && !loading && importProgress >= 100 && failedCount > 0 && (
                <Button
                  onClick={() => {
                    setCurrentStep(2)
                    setImportProgress(0)
                  }}
                  size="sm"
                  variant="outline"
                  className="gap-2 flex-1 sm:flex-none"
                >
                  <RefreshCw className="h-4 w-4" />
                  Review Failed
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fix 2: Confirm dialog via portal — outside Radix Dialog DOM tree */}
      {mounted &&
        createPortal(
          <AlertDialog
            open={confirmOpen}
            onOpenChange={(newOpen) => { if (!newOpen) handleConfirmResult(false) }}
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
                    confirmConfig.variant === "info"   && "bg-info text-info-foreground hover:bg-info/90",
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