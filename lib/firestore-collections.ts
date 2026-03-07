import {
  collection,
  type CollectionReference,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  Timestamp,
} from "firebase/firestore"
import { db } from "./firebase"

// ─── User Roles ───────────────────────────────────────────────────

export type UserRole = "admin" | "da'i" | "pending"

// ─── Da'wa Stages ─────────────────────────────────────────────────

// Fix 7: Removed incorrect "English" comment
export const DAWA_STAGES = [
  "تواصل جديد",
  "اهتمام أولي",
  "حضور منتظم",
  "متعلم ملتزم",
] as const

export type DawaStage = (typeof DAWA_STAGES)[number]

// ─── Fix 5: Shared timestamp type ────────────────────────────────
// Firestore returns Timestamp objects. Using this union prevents
// runtime errors when data comes directly from Firestore vs plain JS.

export type FirestoreDate = Timestamp | Date

// ─── Interfaces ───────────────────────────────────────────────────

export interface Preacher {
  id:         string
  name:       string
  email:      string
  role:       UserRole
  // Fix 5: Use FirestoreDate
  created_at: FirestoreDate
}

export interface Beneficiary {
  id:          string
  name:        string
  phone:       string
  da_i_id:     string       // Reference to preacher UID
  // Fix 6: batch is optional — may not be set on all records
  batch?:      string
  da_wa_stage: DawaStage
  notes?:      string
  // Fix 5: Use FirestoreDate
  created_at:  FirestoreDate
}

export interface Activity {
  id:           string
  name:         string
  creator_id:   string
  creator_name: string
  // Fix 5: Use FirestoreDate
  created_at:   FirestoreDate
  event_date?:  FirestoreDate
  // Fix 8: Added commonly needed fields
  description?: string
  batch?:       string
}

// Fix 1, 3, 4, 9: Single unified AttendanceRecord — removed the duplicate
// declaration and merged all real fields into one correct interface.
export interface AttendanceRecord {
  id:               string
  activity_id:      string
  activity_name:    string   // Fix 9: Present in both old declarations — kept
  activity_type:    string   // e.g. "maqari" | "events" | "lessons" | "sections"
  beneficiary_id:   string
  beneficiary_name: string
  present:          boolean
  logged_by_id:     string
  logged_by_name:   string
  // Fix 4: Only logged_at — removed the ghost field attended_at
  // Fix 5: Use FirestoreDate
  logged_at:        FirestoreDate
}

// Fix 10: Added "profile_updated" action type for edit dialog logs
export interface ProgressLog {
  id:                string
  action:            "transfer" | "stage_change" | "note_added" | "profile_updated"
  details:           string
  performed_by:      string
  performed_by_name: string
  // Fix 5: Use FirestoreDate
  timestamp:         FirestoreDate
}

// ─── Fix 11: Type-safe converters ────────────────────────────────
// Using withConverter gives compile-time safety and avoids unsafe casts.
// It also gives you a single place to handle Timestamp → Date if needed.

function makeConverter<T extends object>(): FirestoreDataConverter<T> {
  return {
    toFirestore: (data: T) => data,
    fromFirestore: (snap: QueryDocumentSnapshot) => snap.data() as T,
  }
}

// ─── Collection References ────────────────────────────────────────
// Fix 2: All collection refs are defined AFTER their types

export const preachersCollection =
  collection(db, "preachers").withConverter(makeConverter<Preacher>()) as CollectionReference<Preacher>

export const beneficiariesCollection =
  collection(db, "beneficiaries").withConverter(makeConverter<Beneficiary>()) as CollectionReference<Beneficiary>

export const attendanceCollection =
  collection(db, "attendance").withConverter(makeConverter<AttendanceRecord>()) as CollectionReference<AttendanceRecord>

export const maqariCollection =
  collection(db, "maqari").withConverter(makeConverter<Activity>()) as CollectionReference<Activity>

export const eventsCollection =
  collection(db, "events").withConverter(makeConverter<Activity>()) as CollectionReference<Activity>

export const lessonsCollection =
  collection(db, "lessons").withConverter(makeConverter<Activity>()) as CollectionReference<Activity>

export const sectionsCollection =
  collection(db, "sections").withConverter(makeConverter<Activity>()) as CollectionReference<Activity>