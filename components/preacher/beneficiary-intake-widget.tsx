"use client"

import { useState, useEffect, useMemo } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Beneficiary } from "@/lib/firestore-collections"
import { AddBeneficiaryDialog } from "@/components/beneficiaries/add-beneficiary-dialog"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Search,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Phone,
  Users,
  X,
  ArrowRight,
  Sparkles,
} from "lucide-react"
import Link from "next/link"

export function BeneficiaryIntakeWidget() {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [prefilledName, setPrefilledName] = useState("")

  const fetchBeneficiaries = async () => {
    try {
      setLoading(true)
      const snap = await getDocs(collection(db, "beneficiaries"))
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Beneficiary)
        .filter((b) => !b.deleted)
      setBeneficiaries(list)
    } catch (err) {
      console.error("Failed to load beneficiaries:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBeneficiaries()
  }, [])

  // Search matching results
  const searchResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return []
    return beneficiaries.filter((b) => {
      const matchName = b.name.toLowerCase().includes(term)
      const matchPhone = b.phone?.includes(term)
      const matchBatch = b.batch?.toLowerCase().includes(term)
      return matchName || matchPhone || matchBatch
    })
  }, [beneficiaries, searchTerm])

  const hasSearched = searchTerm.trim().length >= 2
  const notFound = hasSearched && searchResults.length === 0

  const handleOpenAdd = (nameToPrefill?: string) => {
    setPrefilledName(nameToPrefill?.trim() || "")
    setIsAddOpen(true)
  }

  return (
    <Card className="border border-border/70 shadow-xs backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="space-y-1">
          <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span>Beneficiary Database Check & Intake</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Instantly check if a beneficiary is already in the database before adding them.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, phone number (01xxxxxxxxx), or batch..."
            className="pl-9 pr-9 h-10 text-sm bg-background/50 focus-visible:ring-primary/40"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-sm"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* State: Not Found -> Direct CTA to Add */}
        {notFound && (
          <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <span className="text-xs">
                No matching beneficiary found in database for <strong>&ldquo;{searchTerm}&rdquo;</strong>.
              </span>
              <Button
                size="sm"
                variant="default"
                onClick={() => handleOpenAdd(searchTerm)}
                className="gap-1.5 shrink-0 self-start sm:self-auto bg-amber-600 hover:bg-amber-700 text-white border-0 shadow-xs"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Add &ldquo;{searchTerm.slice(0, 18)}&rdquo; to Database</span>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* State: Matching Results Found */}
        {hasSearched && searchResults.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Found {searchResults.length} existing {searchResults.length === 1 ? "beneficiary" : "beneficiaries"} in database:
              </span>
              <Button
                variant="link"
                size="sm"
                onClick={() => handleOpenAdd(searchTerm)}
                className="h-auto p-0 text-xs text-primary"
              >
                + Register as new anyway
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {searchResults.slice(0, 6).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-card/60 hover:border-primary/30 transition-all text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-foreground truncate">{b.name}</div>
                    <div className="flex items-center gap-2 text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {b.phone}
                      </span>
                      {b.batch && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                          {b.batch}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0 font-medium">
                    {b.da_wa_stage}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Default State: Quick overview & helper */}
        {!hasSearched && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <span>
                Total accessible beneficiaries in database: <strong className="text-foreground">{beneficiaries.length}</strong>
              </span>
            </div>
            <Link
              href="/dashboard/beneficiaries"
              className="text-primary hover:underline font-medium flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Manage all beneficiaries</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </CardContent>

      {/* Embedded Add Beneficiary Dialog */}
      <AddBeneficiaryDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        initialName={prefilledName}
        onBeneficiaryAdded={(newB) => {
          setBeneficiaries((prev) => [newB, ...prev])
          setSearchTerm("")
        }}
      />
    </Card>
  )
}
