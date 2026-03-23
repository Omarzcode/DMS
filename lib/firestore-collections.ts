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

export const DAWA_STAGES = [
  "تواصل جديد",
  "اهتمام أولي",
  "حضور منتظم",
  "متعلم ملتزم",
] as const

export type DawaStage = (typeof DAWA_STAGES)[number]

// ─── Shared timestamp type ────────────────────────────────────────

export type FirestoreDate = Timestamp | Date

// ─── Interfaces ───────────────────────────────────────────────────

export interface Preacher {
  id:         string
  name:       string
  email:      string
  role:       UserRole
  created_at: FirestoreDate
}

export interface Beneficiary {
  id:          string
  name:        string
  phone:       string
  da_i_id:     string
  batch?:      string
  da_wa_stage: DawaStage
  notes?:      string
  created_at:  FirestoreDate
  // ─── Soft Delete Fields ───────────────────────────────────────
  deleted?:    boolean
  deletedAt?:  FirestoreDate
}

export interface Activity {
  id:           string
  name:         string
  creator_id:   string
  creator_name: string
  created_at:   FirestoreDate
  event_date?:  FirestoreDate
  description?: string
  batch?:       string
}

export interface AttendanceRecord {
  id:               string
  activity_id:      string
  activity_name:    string
  activity_type:    string
  beneficiary_id:   string
  beneficiary_name: string
  present:          boolean
  logged_by_id:     string
  logged_by_name:   string
  logged_at:        FirestoreDate
}

export interface ProgressLog {
  id:                string
  action:            "transfer" | "stage_change" | "note_added" | "profile_updated"
  details:           string
  performed_by:      string
  performed_by_name: string
  timestamp:         FirestoreDate
}

// ─── Type-safe converters ─────────────────────────────────────────

function makeConverter<T extends object>(): FirestoreDataConverter<T> {
  return {
    toFirestore: (data: T) => data,
    fromFirestore: (snap: QueryDocumentSnapshot) => snap.data() as T,
  }
}

// ─── Collection References ────────────────────────────────────────

export const preachersCollection =
  collection(db, "preachers").withConverter(
    makeConverter<Preacher>()
  ) as CollectionReference<Preacher>

export const beneficiariesCollection =
  collection(db, "beneficiaries").withConverter(
    makeConverter<Beneficiary>()
  ) as CollectionReference<Beneficiary>

export const attendanceCollection =
  collection(db, "attendance").withConverter(
    makeConverter<AttendanceRecord>()
  ) as CollectionReference<AttendanceRecord>

export const maqariCollection =
  collection(db, "maqari").withConverter(
    makeConverter<Activity>()
  ) as CollectionReference<Activity>

export const eventsCollection =
  collection(db, "events").withConverter(
    makeConverter<Activity>()
  ) as CollectionReference<Activity>

export const lessonsCollection =
  collection(db, "lessons").withConverter(
    makeConverter<Activity>()
  ) as CollectionReference<Activity>

export const sectionsCollection =
  collection(db, "sections").withConverter(
    makeConverter<Activity>()
  ) as CollectionReference<Activity>