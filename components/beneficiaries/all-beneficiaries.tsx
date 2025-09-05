"use client"

import { useState, useEffect } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, Search, Phone, AlertCircle, ArrowRightLeft, Edit } from "lucide-react"
import type { Beneficiary, Preacher } from "@/lib/firestore-collections"
import { DAWA_STAGES } from "@/lib/firestore-collections"
import { AddBeneficiaryDialog } from "./add-beneficiary-dialog"
import { EditBeneficiaryDialog } from "./edit-beneficiary-dialog"
import { TransferBeneficiaryDialog } from "./transfer-beneficiary-dialog"

export function AllBeneficiaries() {
  const { userRole } = useAuth()
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [preachers, setPreachers] = useState<Preacher[]>([])
  const [filteredBeneficiaries, setFilteredBeneficiaries] = useState<Beneficiary[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [stageFilter, setStageFilter] = useState<string>("all")
  const [preacherFilter, setPreacherFilter] = useState<string>("all")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userRole !== "admin") {
      setError("You don't have permission to view all beneficiaries.")
      setLoading(false)
      return
    }

    fetchData()
  }, [userRole])

  useEffect(() => {
    filterBeneficiaries()
  }, [beneficiaries, searchTerm, stageFilter, preacherFilter])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch all beneficiaries and preachers
      const [beneficiariesSnapshot, preachersSnapshot] = await Promise.all([
        getDocs(collection(db, "beneficiaries")),
        getDocs(collection(db, "preachers")),
      ])

      const beneficiariesData = beneficiariesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Beneficiary[]

      const preachersData = preachersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Preacher[]

      setBeneficiaries(beneficiariesData)
      setPreachers(preachersData)
      setError(null)
    } catch (error) {
      console.error("Error fetching data:", error)
      setError("Failed to load beneficiaries")
    } finally {
      setLoading(false)
    }
  }

  const filterBeneficiaries = () => {
    let filtered = beneficiaries

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (b) =>
          b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.phone.includes(searchTerm) ||
          b.batch.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filter by stage
    if (stageFilter !== "all") {
      filtered = filtered.filter((b) => b.da_wa_stage === stageFilter)
    }

    // Filter by preacher
    if (preacherFilter !== "all") {
      filtered = filtered.filter((b) => b.da_i_id === preacherFilter)
    }

    setFilteredBeneficiaries(filtered)
  }

  const getPreacherName = (preacherId: string) => {
    const preacher = preachers.find((p) => p.id === preacherId)
    return preacher?.name || "Unknown Preacher"
  }

  const handleBeneficiaryAdded = (newBeneficiary: Beneficiary) => {
    setBeneficiaries((prev) => [...prev, newBeneficiary])
  }

  const handleBeneficiaryUpdated = (updatedBeneficiary: Beneficiary) => {
    setBeneficiaries((prev) => prev.map((b) => (b.id === updatedBeneficiary.id ? updatedBeneficiary : b)))
  }

  const handleBeneficiaryTransferred = (transferredBeneficiary: Beneficiary) => {
    setBeneficiaries((prev) => prev.map((b) => (b.id === transferredBeneficiary.id ? transferredBeneficiary : b)))
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h2 className="text-2xl font-bold">All Beneficiaries</h2>
          <Badge variant="secondary">{beneficiaries.length}</Badge>
        </div>
        <AddBeneficiaryDialog onBeneficiaryAdded={handleBeneficiaryAdded} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or batch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {DAWA_STAGES.map((stage) => (
              <SelectItem key={stage} value={stage}>
                {stage}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={preacherFilter} onValueChange={setPreacherFilter}>
          <SelectTrigger className="w-48">
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
      </div>

      {/* Beneficiaries Grid */}
      {filteredBeneficiaries.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {beneficiaries.length === 0 ? "No beneficiaries found" : "No beneficiaries match your filters"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredBeneficiaries.map((beneficiary) => (
            <Card key={beneficiary.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{beneficiary.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    <EditBeneficiaryDialog beneficiary={beneficiary} onBeneficiaryUpdated={handleBeneficiaryUpdated}>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </EditBeneficiaryDialog>
                    <TransferBeneficiaryDialog
                      beneficiary={beneficiary}
                      onTransferComplete={handleBeneficiaryTransferred}
                    >
                      <Button variant="ghost" size="icon">
                        <ArrowRightLeft className="h-4 w-4" />
                      </Button>
                    </TransferBeneficiaryDialog>
                  </div>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  {beneficiary.phone}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Batch:</span>
                  <Badge variant="outline">{beneficiary.batch}</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Stage:</span>
                  <Badge>{beneficiary.da_wa_stage}</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Preacher:</span>
                  <span className="text-sm font-medium">{getPreacherName(beneficiary.da_i_id)}</span>
                </div>

                {beneficiary.notes && (
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">Notes:</span>
                    <p className="text-sm bg-muted p-2 rounded">{beneficiary.notes}</p>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Added: {beneficiary.created_at?.toDate().toLocaleDateString() || "Unknown"}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
