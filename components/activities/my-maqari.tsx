"use client"

import { useState, useEffect } from "react"
import { collection, query, where, getDocs, doc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BookOpen, Search, Plus, Calendar, Users, Trash2, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import type { Activity } from "@/lib/firestore-collections"
import { CreateActivityDialog } from "./create-activity-dialog"

export function MyMaqari() {
  const { user } = useAuth()
  const [maqari, setMaqari] = useState<Activity[]>([])
  const [filteredMaqari, setFilteredMaqari] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchMaqari()
    }
  }, [user])

  useEffect(() => {
    filterMaqari()
  }, [maqari, searchTerm])

  const fetchMaqari = async () => {
    if (!user) return

    try {
      setLoading(true)
      const q = query(collection(db, "maqari"), where("creator_id", "==", user.uid))
      const querySnapshot = await getDocs(q)
      const maqariData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Activity[]

      setMaqari(maqariData)
      setError(null)
    } catch (error) {
      console.error("Error fetching maqari:", error)
      setError("Failed to load maqari")
    } finally {
      setLoading(false)
    }
  }

  const filterMaqari = () => {
    let filtered = maqari

    if (searchTerm) {
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (m.description && m.description.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    setFilteredMaqari(filtered)
  }

  const handleMaqraCreated = (newMaqra: Activity) => {
    setMaqari((prev) => [newMaqra, ...prev])
  }

  const handleDeleteMaqra = async (maqraId: string) => {
    if (!confirm("Are you sure you want to delete this maqra'a? This action cannot be undone.")) {
      return
    }

    try {
      setDeletingId(maqraId)
      await deleteDoc(doc(db, "maqari", maqraId))
      setMaqari((prev) => prev.filter((m) => m.id !== maqraId))
      setError(null)
    } catch (error) {
      console.error("Error deleting maqra:", error)
      setError("Failed to delete maqra'a")
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-10 w-full" />
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
          <BookOpen className="h-6 w-6" />
          <h2 className="text-2xl font-bold">My Maqari</h2>
          <Badge variant="secondary">{maqari.length}</Badge>
        </div>
        <CreateActivityDialog activityType="maqari" onActivityCreated={handleMaqraCreated}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Maqra'a
          </Button>
        </CreateActivityDialog>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search maqari by name or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Maqari Grid */}
      {filteredMaqari.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {maqari.length === 0 ? "No maqari created yet" : "No maqari match your search"}
            </p>
            {maqari.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Create your first maqra'a to start organizing recitation circles for your beneficiaries.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMaqari.map((maqra) => (
            <Card key={maqra.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{maqra.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteMaqra(maqra.id)}
                    disabled={deletingId === maqra.id}
                    className="text-destructive hover:text-destructive"
                  >
                    {deletingId === maqra.id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <CardDescription>Personal Maqra'a</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {maqra.description && <p className="text-sm text-muted-foreground">{maqra.description}</p>}

                {maqra.event_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(maqra.event_date.seconds * 1000), "PPP")}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>0 attendees</span>
                  </div>
                  <Button variant="outline" size="sm">
                    Manage
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  Created: {format(new Date(maqra.created_at.seconds * 1000), "PPp")}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
