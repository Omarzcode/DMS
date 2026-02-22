"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableResponsive,
  TableLoading,
  TableEmpty,
} from "@/components/ui/table"
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
import { toast } from 'sonner'
import type { Beneficiary, Preacher } from "@/lib/firestore-collections"
import { DAWA_STAGES } from "@/lib/firestore-collections"

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
  notes: string
  status: 'pending' | 'success' | 'error' | 'duplicate' | 'invalid'
  error?: string
  selected: boolean
  isEdited?: boolean
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const FIRESTORE_IN_LIMIT = 10
const IMPORT_BATCH_SIZE = 25

export function ContactImportDialog({ onImportComplete, assignedPreacherId }: ContactImportDialogProps) {
  const { user, userRole } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contacts, setContacts] = useState<ContactRecord[]>([])
  const [deletedContacts, setDeletedContacts] = useState<ContactRecord[]>([])
  const [importProgress, setImportProgress] = useState(0)
  const [importedCount, setImportedCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)
  const [preachers, setPreachers] = useState<Preacher[]>([])
  const [loadingPreachers, setLoadingPreachers] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [importMethod, setImportMethod] = useState<'vcf' | 'csv'>('vcf')
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  const [showSettings, setShowSettings] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [duplicateCheckDone, setDuplicateCheckDone] = useState(false)

  const [commonSettings, setCommonSettings] = useState({
    da_wa_stage: DAWA_STAGES[0],
    notes: "",
    assignToMe: !assignedPreacherId,
    da_i_id: assignedPreacherId || (user?.uid || ""),
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // Load preachers for admin
  useEffect(() => {
    const loadPreachers = async () => {
      if (open && userRole === "admin" && !assignedPreacherId) {
        setLoadingPreachers(true)
        try {
          const preachersSnapshot = await getDocs(
            query(collection(db, "preachers"), where("role", "==", "da'i"))
          )
          const preachersData = preachersSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Preacher[]
          setPreachers(preachersData)
        } catch (error) {
          console.error("Error loading preachers:", error)
        } finally {
          setLoadingPreachers(false)
        }
      }
    }
    loadPreachers()
  }, [open, userRole, assignedPreacherId, user])

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) resetImportState()
  }

  const resetImportState = () => {
    setContacts([])
    setDeletedContacts([])
    setImportProgress(0)
    setImportedCount(0)
    setFailedCount(0)
    setCommonSettings({
      da_wa_stage: DAWA_STAGES[0],
      notes: "",
      assignToMe: !assignedPreacherId,
      da_i_id: assignedPreacherId || (user?.uid || ""),
    })
    setError(null)
    setShowDetails(false)
    setImportMethod('vcf')
    setCurrentStep(1)
    setShowSettings(false)
    setFilterStatus('all')
    setSearchQuery('')
    setIsDragging(false)
    setFileName(null)
    setDuplicateCheckDone(false)
  }

  // ─── Phone Utilities ───────────────────────────────────────────

  const formatEgyptianPhone = useCallback((phone: string): string => {
    let cleanPhone = phone.replace(/[^\d]/g, '')

    // Handle country code variations
    if (cleanPhone.startsWith('002')) {
      cleanPhone = cleanPhone.slice(3)
    } else if (cleanPhone.startsWith('20') && cleanPhone.length >= 12) {
      cleanPhone = cleanPhone.slice(2)
    } else if (cleanPhone.startsWith('+20')) {
      cleanPhone = cleanPhone.slice(3)
    }

    // Add leading zero if missing
    if (cleanPhone.length === 10 && /^1[0-2,5]/.test(cleanPhone)) {
      cleanPhone = '0' + cleanPhone
    }

    // Validate final format
    if (cleanPhone.length === 11 && cleanPhone.startsWith('01')) {
      return cleanPhone
    }

    return ''
  }, [])

  const validateEgyptianPhone = useCallback((phone: string): boolean => {
    const cleanPhone = formatEgyptianPhone(phone)
    return /^01[0-2,5]\d{8}$/.test(cleanPhone)
  }, [formatEgyptianPhone])

  // ─── File Parsing ──────────────────────────────────────────────

  const parseVCF = useCallback((vcfContent: string): ContactRecord[] => {
    const contacts: ContactRecord[] = []
    const lines = vcfContent.split('\n')

    let currentContact: Partial<ContactRecord> = {}
    let inContact = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      if (line === 'BEGIN:VCARD') {
        inContact = true
        currentContact = {}
        continue
      }

      if (line === 'END:VCARD') {
        if (inContact && (currentContact.name || currentContact.phone)) {
          const id = `contact-${Date.now()}-${contacts.length}-${Math.random().toString(36).slice(2, 7)}`
          const phone = currentContact.phone || ''
          const formattedPhone = phone ? formatEgyptianPhone(phone) : ''

          let status: ContactRecord['status'] = 'pending'
          let error = ""

          if (!phone) {
            status = 'invalid'
            error = 'لا يوجد رقم'
          } else if (!formattedPhone) {
            status = 'invalid'
            error = 'رقم غير صحيح'
          }

          contacts.push({
            id,
            name: currentContact.name || `جهة اتصال ${contacts.length + 1}`,
            phone,
            formattedPhone,
            da_wa_stage: commonSettings.da_wa_stage,
            da_i_id: commonSettings.da_i_id,
            notes: commonSettings.notes,
            status,
            error,
            selected: status === 'pending',
            isEdited: false,
          })
        }
        inContact = false
        continue
      }

      if (inContact) {
        if (line.startsWith('FN:') || line.startsWith('FN;')) {
          const value = line.substring(line.indexOf(':') + 1).trim()
          if (value) currentContact.name = value
        } else if (line.startsWith('TEL;') || line.startsWith('TEL:')) {
          const telLine = line.substring(line.indexOf(':') + 1).trim()
          if (!currentContact.phone && telLine) currentContact.phone = telLine
        } else if (line.startsWith('N:') || line.startsWith('N;')) {
          if (!currentContact.name) {
            const value = line.substring(line.indexOf(':') + 1)
            const nameParts = value.split(';')
            const firstName = nameParts[1]?.trim() || ''
            const lastName = nameParts[0]?.trim() || ''
            const fullName = [firstName, lastName].filter(Boolean).join(' ')
            if (fullName) currentContact.name = fullName
          }
        }
      }
    }

    return contacts
  }, [commonSettings, formatEgyptianPhone])

  const parseCSV = useCallback((csvContent: string): ContactRecord[] => {
    const contacts: ContactRecord[] = []
    const lines = csvContent.split('\n').filter(line => line.trim())

    if (lines.length === 0) return contacts

    const firstLine = lines[0]
    const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ','

    // Try to detect if first line is a header
    const firstLineLower = firstLine.toLowerCase()
    const isHeader = firstLineLower.includes('name') ||
      firstLineLower.includes('phone') ||
      firstLineLower.includes('اسم') ||
      firstLineLower.includes('هاتف') ||
      firstLineLower.includes('رقم')

    const startIndex = isHeader ? 1 : 0

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const parts = line.split(delimiter).map(part => part.replace(/^["']|["']$/g, '').trim())

      let name = "", phone = ""

      if (parts.length >= 2) {
        // Try to detect which column is name and which is phone
        const firstIsPhone = /^[\+]?[\d\s\-()]{8,}$/.test(parts[0])
        const secondIsPhone = /^[\+]?[\d\s\-()]{8,}$/.test(parts[1])

        if (firstIsPhone && !secondIsPhone) {
          phone = parts[0]
          name = parts[1]
        } else {
          name = parts[0]
          phone = parts[1]
        }
      } else if (parts.length === 1) {
        if (/[\+]?[0-9]{10,13}/.test(parts[0])) {
          phone = parts[0]
        } else {
          name = parts[0]
        }
      }

      const id = `contact-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`
      const formattedPhone = phone ? formatEgyptianPhone(phone) : ""

      let status: ContactRecord['status'] = 'pending'
      let error = ""

      if (!phone) {
        status = 'invalid'
        error = 'لا يوجد رقم'
      } else if (!formattedPhone) {
        status = 'invalid'
        error = 'رقم غير صحيح'
      }

      contacts.push({
        id,
        name: name || `مستفيد ${i + 1}`,
        phone,
        formattedPhone,
        da_wa_stage: commonSettings.da_wa_stage,
        da_i_id: commonSettings.da_i_id,
        notes: commonSettings.notes,
        status,
        error,
        selected: status === 'pending',
        isEdited: false,
      })
    }

    return contacts
  }, [commonSettings, formatEgyptianPhone])

  // ─── File Handling ─────────────────────────────────────────────

  const processFile = useCallback((file: globalThis.File) => {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`حجم الملف كبير جداً. الحد الأقصى ${MAX_FILE_SIZE / 1024 / 1024}MB`)
      return
    }

    const extension = file.name.toLowerCase().split('.').pop()
    const validExtensions = importMethod === 'vcf'
      ? ['vcf', 'vcard']
      : ['csv', 'txt']

    if (!extension || !validExtensions.includes(extension)) {
      toast.error(`صيغة غير مدعومة. الصيغ المدعومة: ${validExtensions.join(', ')}`)
      return
    }

    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const fileContent = e.target?.result as string
        let parsedContacts: ContactRecord[] = []

        if (extension === 'vcf' || extension === 'vcard') {
          parsedContacts = parseVCF(fileContent)
        } else {
          parsedContacts = parseCSV(fileContent)
        }

        if (parsedContacts.length === 0) {
          toast.error('لم يتم العثور على جهات اتصال في الملف')
          return
        }

        // Deduplicate within file
        const seenPhones = new Set<string>()
        const deduplicatedContacts: ContactRecord[] = []
        let duplicateCount = 0

        for (const contact of parsedContacts) {
          if (contact.formattedPhone && seenPhones.has(contact.formattedPhone)) {
            duplicateCount++
            continue // Skip file-internal duplicates
          }
          if (contact.formattedPhone) {
            seenPhones.add(contact.formattedPhone)
          }
          deduplicatedContacts.push(contact)
        }

        setContacts(deduplicatedContacts)
        setCurrentStep(2)
        setDuplicateCheckDone(false)

        const fileType = extension === 'vcf' || extension === 'vcard' ? 'vCard' : 'نصي'
        let message = `تم تحميل ${deduplicatedContacts.length} جهة اتصال من ملف ${fileType}`
        if (duplicateCount > 0) {
          message += ` (تم تجاهل ${duplicateCount} مكرر)`
        }
        toast.success(message)

      } catch (err) {
        console.error("Error parsing file:", err)
        toast.error('تعذر قراءة الملف. تأكد من صحة التنسيق')
      }
    }

    reader.onerror = () => {
      toast.error('حدث خطأ أثناء قراءة الملف')
    }

    reader.readAsText(file, 'UTF-8')
  }, [importMethod, parseVCF, parseCSV])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) processFile(file)
    // Reset input so the same file can be selected again
    if (event.target) event.target.value = ''
  }

  // ─── Drag and Drop ─────────────────────────────────────────────

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set false if leaving the drop zone
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  // ─── Contact Operations ────────────────────────────────────────

  const applyCommonSettings = () => {
    setContacts(prev => prev.map(contact => {
      if (contact.status === 'success') return contact // Don't modify already imported
      return {
        ...contact,
        da_wa_stage: commonSettings.da_wa_stage,
        da_i_id: commonSettings.da_i_id,
        notes: commonSettings.notes,
        isEdited: true,
      }
    }))
    toast.success('تم تطبيق الإعدادات على جميع الجهات')
  }

  const checkExistingPhones = async () => {
    if (contacts.length === 0) return
    setLoading(true)

    try {
      const validContacts = contacts.filter(c =>
        c.formattedPhone && c.status !== 'success'
      )

      if (validContacts.length === 0) {
        toast.info('لا توجد جهات صالحة للفحص')
        setLoading(false)
        return
      }

      const updatedContacts = [...contacts]

      // Firestore "in" queries support max 10 items
      for (let i = 0; i < validContacts.length; i += FIRESTORE_IN_LIMIT) {
        const batchPhones = validContacts
          .slice(i, i + FIRESTORE_IN_LIMIT)
          .map(c => c.formattedPhone)
          .filter(Boolean)

        if (batchPhones.length === 0) continue

        const phoneQuery = query(
          collection(db, "beneficiaries"),
          where("phone", "in", batchPhones)
        )
        const querySnapshot = await getDocs(phoneQuery)
        const existingPhones = new Set(
          querySnapshot.docs.map(doc => doc.data().phone)
        )

        validContacts.slice(i, i + FIRESTORE_IN_LIMIT).forEach(contact => {
          if (existingPhones.has(contact.formattedPhone)) {
            const contactIndex = updatedContacts.findIndex(c => c.id === contact.id)
            if (contactIndex !== -1) {
              updatedContacts[contactIndex] = {
                ...updatedContacts[contactIndex],
                status: 'duplicate',
                error: 'رقم مسجل مسبقاً في النظام',
                selected: false, // Auto-deselect duplicates
              }
            }
          }
        })
      }

      setContacts(updatedContacts)
      setDuplicateCheckDone(true)
      const duplicateCount = updatedContacts.filter(c => c.status === 'duplicate').length
      if (duplicateCount > 0) {
        toast.warning(`تم العثور على ${duplicateCount} رقم مكرر في النظام`)
      } else {
        toast.success('لم يتم العثور على أرقام مكررة')
      }
    } catch (error) {
      console.error("Error checking phones:", error)
      toast.error('حدث خطأ أثناء فحص الأرقام المكررة')
    } finally {
      setLoading(false)
    }
  }

  const updateContact = (id: string, updates: Partial<ContactRecord>) => {
    setContacts(prev => prev.map(contact => {
      if (contact.id !== id) return contact

      const updated = { ...contact, ...updates, isEdited: true }

      // Re-validate phone if it was changed
      if (updates.phone !== undefined || updates.formattedPhone !== undefined) {
        const phoneToFormat = updates.phone || contact.phone
        const newFormatted = formatEgyptianPhone(phoneToFormat)
        updated.formattedPhone = newFormatted

        if (!phoneToFormat) {
          updated.status = 'invalid'
          updated.error = 'لا يوجد رقم'
        } else if (!newFormatted) {
          updated.status = 'invalid'
          updated.error = 'رقم غير صحيح'
        } else if (contact.status === 'invalid') {
          updated.status = 'pending'
          updated.error = undefined
        }
      }

      return updated
    }))
  }

  const deleteContact = (id: string) => {
    const contactToDelete = contacts.find(c => c.id === id)
    if (contactToDelete) {
      setDeletedContacts(prev => [...prev, contactToDelete])
    }
    setContacts(prev => prev.filter(contact => contact.id !== id))
    toast.info('تم حذف الجهة', {
      action: {
        label: 'تراجع',
        onClick: () => undoLastDelete()
      }
    })
  }

  const undoLastDelete = () => {
    if (deletedContacts.length === 0) return
    const lastDeleted = deletedContacts[deletedContacts.length - 1]
    setDeletedContacts(prev => prev.slice(0, -1))
    setContacts(prev => [...prev, lastDeleted])
    toast.success('تم استعادة الجهة')
  }

  const toggleSelectAll = () => {
    const selectableFiltered = filteredContacts.filter(c =>
      c.status !== 'success' && c.status !== 'invalid'
    )
    const allSelected = selectableFiltered.length > 0 && selectableFiltered.every(c => c.selected)

    setContacts(prev => prev.map(c => {
      const isInFiltered = filteredContacts.find(fc => fc.id === c.id)
      if (isInFiltered && c.status !== 'success' && c.status !== 'invalid') {
        return { ...c, selected: !allSelected }
      }
      return c
    }))
  }

  // ─── Import ────────────────────────────────────────────────────

  const handleImport = async () => {
    const selectedContacts = contacts.filter(c =>
      c.selected && (c.status === 'pending' || c.status === 'duplicate')
    )

    if (selectedContacts.length === 0) {
      toast.error('لا توجد جهات محددة للاستيراد')
      return
    }

    // Warn about duplicates
    const duplicateSelected = selectedContacts.filter(c => c.status === 'duplicate').length
    if (duplicateSelected > 0) {
      const confirmed = window.confirm(
        `هناك ${duplicateSelected} جهة مكررة محددة. هل تريد المتابعة؟`
      )
      if (!confirmed) return
    }

    setLoading(true)
    setImportProgress(0)
    setImportedCount(0)
    setFailedCount(0)
    setCurrentStep(3)

    let successful = 0
    let failed = 0

    try {
      for (let i = 0; i < selectedContacts.length; i += IMPORT_BATCH_SIZE) {
        const batch = writeBatch(db)
        const currentBatch = selectedContacts.slice(i, i + IMPORT_BATCH_SIZE)
        const batchRefs: { contact: ContactRecord; ref: ReturnType<typeof doc> }[] = []

        for (const contact of currentBatch) {
          if (!validateEgyptianPhone(contact.formattedPhone || contact.phone)) {
            updateContact(contact.id, {
              status: 'error',
              error: 'رقم غير صالح للاستيراد'
            })
            failed++
            continue
          }

          const newBeneficiary: Omit<Beneficiary, "id"> = {
            name: contact.name.trim(),
            phone: contact.formattedPhone,
            da_i_id: contact.da_i_id,
            da_wa_stage: contact.da_wa_stage,
            notes: contact.notes.trim(),
            created_at: new Date(),
          }

          const docRef = doc(collection(db, "beneficiaries"))
          batch.set(docRef, newBeneficiary)
          batchRefs.push({ contact, ref: docRef })
        }

        try {
          await batch.commit()
          batchRefs.forEach(({ contact }) => {
            updateContact(contact.id, { status: 'success' })
          })
          successful += batchRefs.length
        } catch (batchError) {
          console.error("Batch commit failed:", batchError)
          batchRefs.forEach(({ contact }) => {
            updateContact(contact.id, {
              status: 'error',
              error: 'فشل في حفظ الدفعة'
            })
          })
          failed += batchRefs.length
        }

        const progress = Math.min(100, ((i + currentBatch.length) / selectedContacts.length) * 100)
        setImportProgress(progress)
        setImportedCount(successful)
        setFailedCount(failed)

        // Small delay to allow UI updates
        if (i + IMPORT_BATCH_SIZE < selectedContacts.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      setImportProgress(100)
      setImportedCount(successful)
      setFailedCount(failed)

      if (successful > 0) {
        toast.success('تم الاستيراد بنجاح', {
          description: `تم إضافة ${successful} مستفيد${failed > 0 ? ` (فشل ${failed})` : ''}`,
        })
        onImportComplete?.()
      } else if (failed > 0) {
        toast.error('فشل الاستيراد', {
          description: `فشل إضافة ${failed} مستفيد`,
        })
      }

    } catch (error) {
      console.error("Import failed:", error)
      toast.error('حدث خطأ أثناء الاستيراد')
    } finally {
      setLoading(false)
    }
  }

  // ─── UI Helpers ────────────────────────────────────────────────

  const getStatusBadge = (status: ContactRecord['status']) => {
    const config = {
      pending: { label: 'قيد الانتظار', variant: 'secondary' as const, icon: null, className: "" },
      success: { label: 'ناجح', variant: 'default' as const, icon: <CheckCircle className="h-3 w-3" />, className: "bg-success/20 text-success" },
      error: { label: 'خطأ', variant: 'destructive' as const, icon: <AlertCircle className="h-3 w-3" />, className: "" },
      duplicate: { label: 'مكرر', variant: 'outline' as const, icon: <AlertCircle className="h-3 w-3" />, className: "border-warning text-warning hover:bg-warning/10" },
      invalid: { label: 'غير صالح', variant: 'destructive' as const, icon: <X className="h-3 w-3" />, className: "" },
    }

    const cfg = config[status]
    return (
      <Badge variant={cfg.variant} className={`text-xs gap-1 whitespace-nowrap ${cfg.className}`}>
        {cfg.icon}
        {cfg.label}
      </Badge>
    )
  }

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = searchQuery === '' ||
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone.includes(searchQuery) ||
      contact.formattedPhone.includes(searchQuery)

    const matchesFilter = filterStatus === 'all' || contact.status === filterStatus

    return matchesSearch && matchesFilter
  })

  const selectedCount = contacts.filter(c =>
    c.selected && (c.status === 'pending' || c.status === 'duplicate')
  ).length

  const statusCounts = {
    total: contacts.length,
    selected: contacts.filter(c => c.selected).length,
    pending: contacts.filter(c => c.status === 'pending').length,
    success: contacts.filter(c => c.status === 'success').length,
    error: contacts.filter(c => c.status === 'error' || c.status === 'invalid').length,
    duplicate: contacts.filter(c => c.status === 'duplicate').length,
  }

  const getStepStatus = (step: number) => {
    if (currentStep > step) return 'complete'
    if (currentStep === step) return 'current'
    return 'upcoming'
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 hover:bg-primary/5 transition-colors">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">استيراد جهات اتصال</span>
          <span className="sm:hidden">استيراد</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] lg:max-w-5xl max-h-[90dvh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
          <DialogTitle className="flex items-center gap-3 text-lg sm:text-xl">
            <div className="p-2 rounded-lg bg-primary/10">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div>استيراد جهات الاتصال</div>
              <DialogDescription className="text-xs sm:text-sm mt-1">
                {fileName
                  ? `الملف: ${fileName}`
                  : 'استيراد جماعي لجهات الاتصال من الملفات'}
              </DialogDescription>
            </div>
          </DialogTitle>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mt-4 px-2">
            {[1, 2, 3].map((step, index) => {
              const status = getStepStatus(step)
              const labels = ['اختيار الملف', 'المراجعة والتعديل', 'الاستيراد']

              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all
                      ${status === 'complete' ? 'bg-success text-white' : ''}
                      ${status === 'current' ? 'bg-primary text-white ring-4 ring-primary/20' : ''}
                      ${status === 'upcoming' ? 'bg-muted text-muted-foreground' : ''}
                    `}>
                      {status === 'complete' ? <CheckCircle className="h-4 w-4" /> : step}
                    </div>
                    <span className={`text-xs hidden sm:block ${status === 'current' ? 'font-medium text-primary' : 'text-muted-foreground'}`}>
                      {labels[index]}
                    </span>
                  </div>
                  {index < 2 && (
                    <div className={`h-[2px] flex-1 mx-2 transition-colors ${status === 'complete' ? 'bg-success' : 'bg-muted'}`} />
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
                <h3 className="font-semibold text-lg mb-2">اختر نوع الملف المراد استيراده</h3>
                <p className="text-sm text-muted-foreground">حدد صيغة الملف الذي تريد استيراد الجهات منه</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <button
                  onClick={() => setImportMethod('vcf')}
                  className={`
                    group relative p-6 rounded-xl border-2 transition-all duration-200
                    hover:shadow-lg hover:scale-[1.02]
                    ${importMethod === 'vcf'
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/50'}
                  `}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className={`
                      p-4 rounded-full transition-colors
                      ${importMethod === 'vcf' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}
                    `}>
                      <File className="h-8 w-8" />
                    </div>
                    <div className="text-center">
                      <h4 className="font-semibold text-base mb-1">ملف vCard</h4>
                      <p className="text-xs text-muted-foreground">استيراد من جهات اتصال الهاتف</p>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">.vcf</p>
                    </div>
                  </div>
                  {importMethod === 'vcf' && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle className="h-5 w-5 text-primary" />
                    </div>
                  )}
                </button>

                <button
                  onClick={() => setImportMethod('csv')}
                  className={`
                    group relative p-6 rounded-xl border-2 transition-all duration-200
                    hover:shadow-lg hover:scale-[1.02]
                    ${importMethod === 'csv'
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/50'}
                  `}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className={`
                      p-4 rounded-full transition-colors
                      ${importMethod === 'csv' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}
                    `}>
                      <FileText className="h-8 w-8" />
                    </div>
                    <div className="text-center">
                      <h4 className="font-semibold text-base mb-1">ملف نصي</h4>
                      <p className="text-xs text-muted-foreground">استيراد من ملف Excel أو نصي</p>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">.csv / .txt</p>
                    </div>
                  </div>
                  {importMethod === 'csv' && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle className="h-5 w-5 text-primary" />
                    </div>
                  )}
                </button>
              </div>

              {/* Drag & Drop Upload Area */}
              <div className="max-w-2xl mx-auto">
                <div
                  ref={dropZoneRef}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className={`
                    border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
                    ${isDragging
                      ? 'border-primary bg-primary/10 scale-[1.02] shadow-lg'
                      : 'border-border bg-muted/50 hover:bg-muted hover:border-primary/30'}
                  `}
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className={`
                      p-4 rounded-full transition-all
                      ${isDragging ? 'bg-primary text-white scale-110' : 'bg-primary/10'}
                    `}>
                      <Upload className={`h-8 w-8 ${isDragging ? 'text-white' : 'text-primary'}`} />
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium text-base">
                        {isDragging
                          ? 'أفلت الملف هنا'
                          : importMethod === 'vcf'
                            ? 'ارفع ملف vCard'
                            : 'ارفع ملف CSV أو TXT'}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        اسحب الملف وأفلته هنا أو انقر للاختيار
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        الحد الأقصى: {MAX_FILE_SIZE / 1024 / 1024}MB
                      </p>
                    </div>

                    <Input
                      type="file"
                      accept={importMethod === 'vcf' ? ".vcf,.vcard" : ".csv,.txt"}
                      onChange={handleFileUpload}
                      ref={fileInputRef}
                      className="hidden"
                    />

                    <Button
                      variant="default"
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      اختر ملف
                    </Button>
                  </div>
                </div>

                {/* Instructions */}
                <div className="mt-6 p-4 bg-info/10 border border-info/30 rounded-lg">
                  <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-info" />
                    كيفية تصدير جهات الاتصال من هاتفك:
                  </h5>
                  <ol className="text-sm text-muted-foreground space-y-1 pr-5 list-decimal">
                    <li>افتح تطبيق <strong>جهات الاتصال</strong> في هاتفك</li>
                    <li>اضغط على <strong>القائمة</strong> (⋮) أو <strong>الإعدادات</strong></li>
                    <li>اختر <strong>تصدير</strong> أو <strong>مشاركة</strong></li>
                    <li>
                      {importMethod === 'vcf'
                        ? 'حدد تصدير كملف vCard (.vcf)'
                        : 'احفظ كملف CSV أو TXT'}
                    </li>
                    <li>احفظ الملف وارفعه هنا</li>
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
                    <span className="font-medium text-sm">الإعدادات المشتركة</span>
                  </div>
                  {showSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showSettings && (
                  <div className="p-4 space-y-4 border-t bg-background">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="common-stage" className="text-sm font-medium">مرحلة الدعوة</Label>
                        <Select
                          value={commonSettings.da_wa_stage}
                          onValueChange={(value) => setCommonSettings(prev => ({ ...prev, da_wa_stage: value }))}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DAWA_STAGES.map((stage) => (
                              <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {userRole === "admin" && !assignedPreacherId && (
                        <div className="space-y-2">
                          <Label htmlFor="common-preacher" className="text-sm font-medium">تعيين لداعية</Label>
                                                    {loadingPreachers ? (
                            <div className="flex items-center gap-2 p-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm">جاري التحميل...</span>
                            </div>
                          ) : (
                            <Select
                              value={commonSettings.da_i_id}
                              onValueChange={(value) => setCommonSettings(prev => ({ ...prev, da_i_id: value }))}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="اختر داعية" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={user?.uid || ""}>
                                  (أنا) {user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'داعية'}
                                </SelectItem>
                                {preachers.map((preacher) => (
                                  <SelectItem key={preacher.id} value={preacher.id}>
                                    {preacher.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="common-notes" className="text-sm font-medium">ملاحظات (اختياري)</Label>
                        <Input
                          id="common-notes"
                          value={commonSettings.notes}
                          onChange={(e) => setCommonSettings(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="ملاحظات عامة"
                          className="h-9"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button onClick={applyCommonSettings} className="gap-2" size="sm">
                        <CheckCheck className="h-4 w-4" />
                        تطبيق على الجميع
                      </Button>
                      <Button
                        variant="outline"
                        onClick={checkExistingPhones}
                        disabled={loading}
                        className="gap-2"
                        size="sm"
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        فحص الأرقام المكررة
                      </Button>
                    </div>

                    {!duplicateCheckDone && (
                      <Alert className="text-xs border-warning/50 bg-warning/5">
                        <AlertCircle className="h-4 w-4 text-warning" />
                        <AlertDescription className="text-warning">
                          يُنصح بفحص الأرقام المكررة قبل الاستيراد لتجنب التكرار في قاعدة البيانات
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
                    الجهات ({filteredContacts.length} من {contacts.length})
                  </h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      محدد: {statusCounts.selected}
                    </Badge>
                    {statusCounts.success > 0 && (
                      <Badge className="gap-1 bg-success/20 text-success">
                        ناجح: {statusCounts.success}
                      </Badge>
                    )}
                    {statusCounts.error > 0 && (
                      <Badge variant="destructive" className="gap-1">
                        خطأ: {statusCounts.error}
                      </Badge>
                    )}
                    {statusCounts.duplicate > 0 && (
                      <Badge variant="outline" className="gap-1 border-warning text-warning">
                        مكرر: {statusCounts.duplicate}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 w-full sm:w-48"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setSearchQuery('')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل ({statusCounts.total})</SelectItem>
                      <SelectItem value="pending">قيد الانتظار ({statusCounts.pending})</SelectItem>
                      <SelectItem value="success">ناجح ({statusCounts.success})</SelectItem>
                      <SelectItem value="error">خطأ ({statusCounts.error})</SelectItem>
                      <SelectItem value="duplicate">مكرر ({statusCounts.duplicate})</SelectItem>
                      <SelectItem value="invalid">غير صالح</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Contacts Table - Now using the Table components from File 1 */}
              <div className="border rounded-lg overflow-hidden bg-background">
                {/* Table Actions */}
                <div className="px-4 py-3 bg-muted border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="select-all"
                        checked={
                          filteredContacts.filter(c => c.status !== 'success' && c.status !== 'invalid').length > 0 &&
                          filteredContacts.filter(c => c.status !== 'success' && c.status !== 'invalid').every(c => c.selected)
                        }
                        onCheckedChange={toggleSelectAll}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="select-all" className="text-sm cursor-pointer font-medium">
                        تحديد الكل
                      </Label>
                    </div>

                    {deletedContacts.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={undoLastDelete}
                        className="gap-1.5 text-xs text-primary hover:text-primary"
                      >
                        <Undo2 className="h-3 w-3" />
                        تراجع ({deletedContacts.length})
                      </Button>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDetails(!showDetails)}
                    className="gap-2 text-xs"
                  >
                    {showDetails ? (
                      <>
                        <EyeOff className="h-3 w-3" />
                        عرض مبسط
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3" />
                        عرض تفصيلي
                      </>
                    )}
                  </Button>
                </div>

                {/* Table Content */}
                <TableResponsive maxHeight="400px">
                  {filteredContacts.length === 0 ? (
                    <TableEmpty
                      title="لا توجد جهات تطابق البحث"
                      description="جرّب تغيير معايير البحث أو الفلتر"
                      icon={<Users className="h-10 w-10 text-muted-foreground/50" />}
                    />
                  ) : (
                    <table className="w-full">
                      <thead className="bg-muted sticky top-0 z-10">
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="p-3 text-center w-12">#</th>
                          <th className="p-3 text-right">الاسم</th>
                          <th className="p-3 text-right">رقم الهاتف</th>
                          {showDetails && (
                            <>
                              <th className="p-3 text-right">المرحلة</th>
                              <th className="p-3 text-right">ملاحظات</th>
                            </>
                          )}
                          <th className="p-3 text-center">الحالة</th>
                          <th className="p-3 text-center w-20">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredContacts.map((contact) => (
                          <tr
                            key={contact.id}
                            className={`
                              border-b transition-colors
                              ${contact.status === 'success' ? 'bg-success/5 opacity-70' : ''}
                              ${contact.status === 'error' || contact.status === 'invalid' ? 'bg-destructive/5' : ''}
                              ${contact.status === 'duplicate' ? 'bg-warning/5' : ''}
                              ${contact.selected && contact.status === 'pending' ? 'bg-primary/5' : ''}
                              hover:bg-muted/50
                            `}
                          >
                            <td className="p-3 text-center">
                              <Checkbox
                                checked={contact.selected}
                                onCheckedChange={(checked) =>
                                  updateContact(contact.id, { selected: checked === true })
                                }
                                disabled={contact.status === 'success' || contact.status === 'invalid'}
                                className="h-4 w-4"
                              />
                            </td>

                            <td className="p-3">
                              {showDetails ? (
                                <Input
                                  value={contact.name}
                                  onChange={(e) => updateContact(contact.id, { name: e.target.value })}
                                  className="h-8 text-sm"
                                  disabled={contact.status === 'success'}
                                />
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium truncate max-w-[200px]" title={contact.name}>
                                    {contact.name}
                                  </span>
                                  {contact.isEdited && (
                                    <Badge variant="outline" className="text-[10px] px-1">معدل</Badge>
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
                                    disabled={contact.status === 'success'}
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
                                    {contact.formattedPhone || contact.phone || 'لا يوجد'}
                                  </span>
                                </div>
                              )}
                            </td>

                            {showDetails && (
                              <>
                                <td className="p-3">
                                  <Select
                                    value={contact.da_wa_stage}
                                    onValueChange={(value) => updateContact(contact.id, { da_wa_stage: value })}
                                    disabled={contact.status === 'success'}
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
                                <td className="p-3">
                                  <Input
                                    value={contact.notes}
                                    onChange={(e) => updateContact(contact.id, { notes: e.target.value })}
                                    className="h-8 text-xs"
                                    placeholder="ملاحظات"
                                    disabled={contact.status === 'success'}
                                  />
                                </td>
                              </>
                            )}

                            <td className="p-3">
                              <div className="flex flex-col gap-1 items-center">
                                {getStatusBadge(contact.status)}
                                {contact.error && (
                                  <span className="text-[10px] text-destructive max-w-[100px] truncate" title={contact.error}>
                                    {contact.error}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="p-3 text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteContact(contact.id)}
                                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                disabled={contact.status === 'success'}
                                title="حذف"
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
                      ? 'فشل الاستيراد'
                      : 'تم الاستيراد بنجاح!'
                    : 'جاري الاستيراد...'}
                </h3>
                <p className="text-muted-foreground">
                  {!loading && importProgress >= 100
                    ? `تم إضافة ${importedCount} مستفيد بنجاح${failedCount > 0 ? ` (فشل ${failedCount})` : ''}`
                    : 'الرجاء الانتظار حتى يتم استيراد جميع الجهات'}
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-3">
                <Progress value={importProgress} className="h-3" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">التقدم</span>
                  <span className="font-medium">{Math.round(importProgress)}%</span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="text-center p-4 rounded-lg bg-success/10 border border-success/30">
                    <div className="text-2xl font-bold text-success">{importedCount}</div>
                    <div className="text-xs text-success mt-1">تم بنجاح</div>
                  </div>
                  {failedCount > 0 && (
                    <div className="text-center p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                      <div className="text-2xl font-bold text-destructive">{failedCount}</div>
                      <div className="text-xs text-destructive mt-1">فشل</div>
                    </div>
                  )}
                </div>

                {/* Show failed contacts summary */}
                {!loading && failedCount > 0 && (
                  <div className="mt-4 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                    <h4 className="text-sm font-medium text-destructive mb-2">الجهات التي فشل استيرادها:</h4>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {contacts
                        .filter(c => c.status === 'error')
                        .map(c => (
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

        <DialogFooter className="px-4 sm:px-6 pb-4 pt-3 border-t bg-muted flex-col sm:flex-row gap-2">
          <div className="flex-1 flex items-center gap-4 text-sm text-muted-foreground order-2 sm:order-1">
            {currentStep === 2 && (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-medium">جاهز للاستيراد:</span>
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {selectedCount} جهة
                </Badge>
                {!duplicateCheckDone && selectedCount > 0 && (
                  <span className="text-xs text-warning">⚠ لم يتم فحص التكرار</span>
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
                رجوع
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
              {currentStep === 3 && !loading && importProgress >= 100 ? 'إغلاق' : 'إلغاء'}
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
                    جاري الاستيراد...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    استيراد ({selectedCount})
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
                مراجعة الفاشلة
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}