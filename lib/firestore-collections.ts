import { collection, type CollectionReference } from "firebase/firestore"
import { db } from "./firebase"
export const attendanceCollection = collection(db, "attendance") as CollectionReference<AttendanceRecord>
// User roles
export type UserRole = "admin" | "da'i" | "pending"

// Da'wa stages for beneficiaries (Arabic)
export const DAWA_STAGES = [
  "تواصل جديد",
  "اهتمام أولي", 
  "حضور منتظم",
  "متعلم ملتزم",
  "مشارك نشط",
  "قائد مجتمعي",
] as const

export type DawaStage = (typeof DAWA_STAGES)[number]

// Firestore document types

export interface Preacher {
  id: string
  name: string
  email: string
  role: UserRole
  created_at: Date
}
export interface Beneficiary {
  id: string
  name: string
  phone: string
  da_i_id: string // Reference to preacher UID
  batch: string
  da_wa_stage: DawaStage
  notes?: string
  created_at: Date
}

export interface Activity {
  id: string
  name: string
  creator_id: string
  creator_name: string
  created_at: Date
  event_date?: Date
}

export interface AttendanceRecord {
  id: string
  activity_id: string
  activity_name: string
  attended_at: Date
}

export interface ProgressLog {
  id: string
  action: "transfer" | "stage_change" | "note_added"
  details: string
  performed_by: string
  performed_by_name: string
  timestamp: Date
}
export interface AttendanceRecord {
  id: string
  activity_id: string
  activity_type: string // e.g., 'maqari', 'events'
  beneficiary_id: string
  beneficiary_name: string
  present: boolean
  logged_by_id: string
  logged_by_name: string
  logged_at: Date
}

// Collection references
export const preachersCollection = collection(db, "preachers") as CollectionReference<Preacher>
export const beneficiariesCollection = collection(db, "beneficiaries") as CollectionReference<Beneficiary>
export const maqariCollection = collection(db, "maqari") as CollectionReference<Activity>
export const eventsCollection = collection(db, "events") as CollectionReference<Activity>
export const lessonsCollection = collection(db, "lessons") as CollectionReference<Activity>
export const sectionsCollection = collection(db, "sections") as CollectionReference<Activity>