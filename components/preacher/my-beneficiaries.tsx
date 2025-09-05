"use client"

import { useState, useEffect } from "react"
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, Search, Phone, Edit, AlertCircle } from "lucide-react"
import type { Beneficiary } from "@/lib/firestore-collections"
import { DAWA_STAGES } from "@/lib/firestore-collections"
import { AddBeneficiaryDialog } from "@/components/beneficiaries/add-beneficiary-dialog"
import { EditBeneficiaryDialog } from "@/components/beneficiaries/edit-beneficiary-dialog"

export function MyBeneficiaries() {
  const { user } = useAuth()
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [filteredBeneficiaries, setFilteredBeneficiaries] = useState<Beneficiary[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [stageFilter, setStageFilter] = useState<string>("all")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchBeneficiaries()
    }
  }, [user])

  useEffect(() => {
    filterBeneficiaries()
  }, [beneficiaries, searchTerm, stageFilter])

  const fetchBeneficiaries = async () => {
    if (!user) return

    try {
      setLoading(true)
      const q = query(collection(db, "beneficiaries"), where("da_i_id", "==", user.uid))
      const querySnapshot = await getDocs(q)
      const beneficiariesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Beneficiary[]

      setBeneficiaries(beneficiariesData)
      setError(null)
    } catch (error) {
      console.error("Error fetching beneficiaries:", error)
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

    setFilteredBeneficiaries(filtered)
  }

  const updateBeneficiaryStage = async (beneficiaryId: string, newStage: string) => {
    try {
      await updateDoc(doc(db, "beneficiaries", beneficiaryId), {
        da_wa_stage: newStage,
      })

      // Update local state
      setBeneficiaries((prev) => prev.map((b) => (b.id === beneficiaryId ? { ...b, da_wa_stage: newStage as any } : b)))

      setError(null)
    } catch (error) {
      console.error("Error updating beneficiary stage:", error)
      setError("Failed to update beneficiary stage")
    }
  }

  const handleBeneficiaryAdded = (newBeneficiary: Beneficiary) => {
    setBeneficiaries((prev) => [...prev, newBeneficiary])
  }

  const handleBeneficiaryUpdated = (updatedBeneficiary: Beneficiary) => {
    setBeneficiaries((prev) => prev.map((b) => (b.id === updatedBeneficiary.id ? updatedBeneficiary : b)))
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h2 className="text-2xl font-bold">My Beneficiaries</h2>
          <Badge variant="secondary">{beneficiaries.length}</Badge>
        </div>
        <AddBeneficiaryDialog onBeneficiaryAdded={handleBeneficiaryAdded} />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
      </div>

      {/* Beneficiaries Grid */}
      {filteredBeneficiaries.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {beneficiaries.length === 0 ? "No beneficiaries assigned yet" : "No beneficiaries match your filters"}
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
                  <EditBeneficiaryDialog beneficiary={beneficiary} onBeneficiaryUpdated={handleBeneficiaryUpdated}>
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </EditBeneficiaryDialog>
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

                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Da'wa Stage:</span>
                  <Select
                    value={beneficiary.da_wa_stage}
                    onValueChange={(value) => updateBeneficiaryStage(beneficiary.id, value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAWA_STAGES.map((stage) => (
                        <SelectItem key={stage} value={stage}>
                          {stage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
