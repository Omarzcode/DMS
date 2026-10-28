"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { collection, getDocs, query, where, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import type {
  Beneficiary,
  Preacher,
  AttendanceRecord,
  Activity,
} from "@/lib/firestore-collections"
import { DAWA_STAGES } from "@/lib/firestore-collections"

// ─── Types ───────────────────────────────────────────────────────

export interface DashboardData {
  beneficiaries: Beneficiary[]
  preachers: Preacher[]
  attendance: AttendanceRecord[]
  activities: {
    maqari: (Activity & { type: string })[]
    events: (Activity & { type: string })[]
    lessons: (Activity & { type: string })[]
    sections: (Activity & { type: string })[]
    all: (Activity & { type: string })[]
  }
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

// ─── Utilities ───────────────────────────────────────────────────

function getDateFromTimestamp(val: unknown): Date {
  if (!val) return new Date(0)
  if (val instanceof Date) return val
  if (typeof val === "object" && val !== null && "seconds" in val) {
    return new Date((val as { seconds: number }).seconds * 1000)
  }
  if (typeof val === "object" && val !== null && "toDate" in val) {
    return (val as { toDate: () => Date }).toDate()
  }
  try {
    const d = new Date(val as string | number)
    return isNaN(d.getTime()) ? new Date(0) : d
  } catch {
    return new Date(0)
  }
}

// ─── Hook ────────────────────────────────────────────────────────

export function useDashboardData(): DashboardData {
  const { user, userRole } = useAuth()
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [preachers, setPreachers] = useState<Preacher[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [allActivities, setAllActivities] = useState<
    (Activity & { type: string })[]
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const isAdmin = userRole === "admin"

      // Fetch all collections in parallel
      const activityTypes = ["maqari", "events", "lessons", "sections"]

      const [
        beneficiariesSnap,
        preachersSnap,
        attendanceSnap,
        ...activitySnaps
      ] = await Promise.all([
        getDocs(query(collection(db, "beneficiaries"), limit(1000))),
        getDocs(collection(db, "preachers")),
        getDocs(query(collection(db, "attendance"), limit(2000))),
        ...activityTypes.map((type) =>
          getDocs(query(collection(db, type), limit(500)))
        ),
      ])

      const bData = beneficiariesSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        created_at: getDateFromTimestamp(d.data().created_at),
      })) as Beneficiary[]

      const pData = preachersSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Preacher[]

      const aData = attendanceSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        logged_at: getDateFromTimestamp(d.data().logged_at),
      })) as AttendanceRecord[]

      const actData = activitySnaps.flatMap((snap, i) =>
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          type: activityTypes[i],
          created_at: getDateFromTimestamp(d.data().created_at),
        }))
      ) as (Activity & { type: string })[]

      setBeneficiaries(bData)
      setPreachers(pData)
      setAttendance(aData)
      setAllActivities(actData)
    } catch (err) {
      console.error("Dashboard data fetch error:", err)
      setError("Failed to load dashboard data.")
    } finally {
      setLoading(false)
    }
  }, [user, userRole])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const activities = useMemo(
    () => ({
      maqari: allActivities.filter((a) => a.type === "maqari"),
      events: allActivities.filter((a) => a.type === "events"),
      lessons: allActivities.filter((a) => a.type === "lessons"),
      sections: allActivities.filter((a) => a.type === "sections"),
      all: allActivities,
    }),
    [allActivities]
  )

  return {
    beneficiaries,
    preachers,
    attendance,
    activities,
    loading,
    error,
    refresh: fetchAll,
  }
}

// ─── Exported utility for other components ───────────────────────

export { getDateFromTimestamp }