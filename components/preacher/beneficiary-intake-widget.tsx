"use client"

import { useState, useEffect, useMemo } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Beneficiary } from "@/lib/firestore-collections"
import { AddBeneficiaryDialog } from "@/components/beneficiaries/add-beneficiary-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Search,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
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
    <div className="rounded-xl border border-border/70 bg-card p-5 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 mb-0.5">
            Directory Intake
          </div>
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            Beneficiary Verification & Quick Check
          </h2>
          <p className="text-xs text-muted-foreground">
            Search before adding to check if a beneficiary already exists in the system.
          </p>
        </div>

        <Link
          href="/dashboard/beneficiaries"
          className="text-xs text-primary hover:underline font-medium flex items-center gap-1 self-start sm:self-auto shrink-0 group"
        >
          <span>View all {beneficiaries.length} records</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="space-y-3.5">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type name, Egyptian phone number (01xxxxxxxxx), or batch code..."
            className="pl-10 pr-10 h-11 text-sm bg-background/60 border-border/80 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all rounded-lg"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* State: Not Found -> Direct CTA to Add */}
        {notFound && (
          <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                No record matches <strong>&ldquo;{searchTerm}&rdquo;</strong> in the database.
              </span>
            </div>
            <Button
              size="sm"
              onClick={() => handleOpenAdd(searchTerm)}
              className="h-8 gap-1.5 text-xs font-medium shrink-0 self-start sm:self-auto shadow-xs"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Register &ldquo;{searchTerm.slice(0, 16)}&rdquo;</span>
            </Button>
          </div>
        )}

        {/* State: Matching Results Found */}
        {hasSearched && searchResults.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Found {searchResults.length} existing {searchResults.length === 1 ? "beneficiary" : "beneficiaries"}:
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
                  className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20 hover:border-primary/40 hover:bg-muted/30 transition-all text-xs min-w-0 gap-2"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="font-semibold text-foreground truncate" title={b.name}>{b.name}</div>
                    <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] min-w-0">
                      <span className="font-mono text-foreground/80 shrink-0">{b.phone || "No phone"}</span>
                      {b.batch && (
                        <>
                          <span className="shrink-0">·</span>
                          <span className="text-muted-foreground truncate max-w-[110px]" title={b.batch}>{b.batch}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] font-medium text-muted-foreground bg-background/80 px-2 py-0.5 rounded border border-border/50 shrink-0 whitespace-nowrap">
                    {b.da_wa_stage || "Registered"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Default State: Quick overview & helper */}
        {!hasSearched && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/70" />
              <span>
                Active database directory: <strong className="text-foreground font-semibold tabular-nums">{beneficiaries.length}</strong> registered beneficiaries
              </span>
            </span>
          </div>
        )}
      </div>

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
    </div>
  )
}
