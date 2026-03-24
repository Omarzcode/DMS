# DMS (Da'wa Management System) — Complete Codebase Overview

**Version**: 0.1.0 (Beta)  
**Last Updated**: 2024  
**Maintained By**: DMS Team — [@Omarzcode](https://github.com/Omarzcode)  
**Repository**: [github.com/Omarzcode/DMS](https://github.com/Omarzcode/DMS)

---

## 📋 Table of Contents

1. [System Summary](#1-system-summary)
2. [Authentication & User Roles](#2-authentication--user-roles)
3. [Database Structure](#3-database-structure)
4. [Authorization & Access Control](#4-authorization--access-control)
5. [Beneficiary Management](#5-beneficiary-management)
6. [Activity Management](#6-activity-management)
7. [Dashboard & Analytics](#7-dashboard--analytics)
8. [Admin Panel Features](#8-admin-panel-features)
9. [Data Management & Logging](#9-data-management--logging)
10. [Offline & PWA Capabilities](#10-offline--pwa-capabilities)
11. [UI Component Library](#11-ui-component-library)
12. [Technical Stack](#12-technical-stack)
13. [Key Pages & Routing Structure](#13-key-pages--routing-structure)
14. [Data Flow & Custom Hooks](#14-data-flow--custom-hooks)
15. [Architectural Patterns](#15-architectural-patterns)
16. [Configuration & Environment](#16-configuration--environment)
17. [Build & Run Commands](#17-build--run-commands)
18. [Feature Comparison: Admin vs Preacher](#18-feature-comparison-admin-vs-preacher)
19. [System Capabilities Summary](#19-system-capabilities-summary)

---

## 1. System Summary

The **DMS (Da'wa Management System)** is a **Progressive Web App (PWA)** built with **Next.js 15**,
designed specifically for Islamic da'wa (preaching/outreach) organizations. It provides a
centralized platform for managing volunteer preachers, beneficiaries, spiritual development
tracking, and community activities — all backed by **Firebase (Firestore, Auth, Storage)**.

### What the System Manages

| Domain | Description |
|--------|-------------|
| **Users** | Preachers (Da'is), Admins, and Pending users |
| **Beneficiaries** | Individuals tracked through 4 spiritual development stages |
| **Activities** | Maqra'a, Events, Lessons, and Sections |
| **Attendance** | Per-activity attendance records for each beneficiary |
| **Progress Logs** | Full audit trail of all changes made to beneficiary records |
| **Analytics** | System-wide and personal dashboards with charts and metrics |

### Core Design Principles

- **Role-Based Access**: Three distinct roles with clear permission boundaries
- **Mobile-First**: Responsive UI optimized for phones, tablets, and desktops
- **Offline Support**: PWA with service worker for offline functionality
- **Data Integrity**: Built-in health check tools, soft-delete, and audit trails
- **Scalability**: Firestore batch operations handle large datasets efficiently

---

## 2. Authentication & User Roles

### Authentication Method

| Property | Details |
|----------|---------|
| **Provider** | Google OAuth 2.0 via Firebase Authentication |
| **Flow** | Users sign in with existing Google accounts |
| **Initial Admin** | Configured via `NEXT_PUBLIC_INITIAL_ADMIN_EMAIL` env variable |
| **Auto-Admin** | The configured email automatically receives admin privileges on first login |
| **Session** | Firebase tokens — auto-refreshed, persist across browser sessions |
| **Logout** | Full session cleanup including local data erasure |

### Google OAuth Flow

```
1. User clicks "Sign In with Google"
         ↓
2. Redirected to Google OAuth consent screen
         ↓
3. User grants permissions
         ↓
4. Firebase handles token exchange
         ↓
5. User profile auto-created in Firestore (preachers collection)
         ↓
6. Role assigned (default: "pending" for new users)
         ↓
7. Auto-redirect based on assigned role
```

### User Roles (3 Types)

Defined in `lib/firestore-collections.ts`:

| Role | Description | Default Route | Access Level |
|------|-------------|---------------|--------------|
| **admin** | System administrator | `/admin` | Full system access, user management, all analytics |
| **da'i** | Preacher / Outreach worker | `/dashboard` | Own beneficiaries, own activities, personal analytics |
| **pending** | New user awaiting approval | `/` (home) | Read-only, no data management capabilities |

### Role-Based Redirects

```typescript
// Automatic redirect logic after authentication
if (role === "admin")    → redirect("/admin")
if (role === "da'i")     → redirect("/dashboard")
if (role === "pending")  → redirect("/")
```

### User Profile Structure

Every authenticated user has a profile stored in the `preachers` Firestore collection:

```typescript
{
  id:         string      // Firebase Auth UID
  name:       string      // Display name from Google account
  email:      string      // Google account email
  role:       "admin" | "da'i" | "pending"
  created_at: Timestamp   // Date of first login / profile creation
}
```

---

## 3. Database Structure

All data is stored in **Firebase Firestore** (NoSQL, document-based database).

### Collections Overview

| Collection | Purpose | Key Relationships |
|-----------|---------|-------------------|
| `preachers` | All system users and their roles | Root entity |
| `beneficiaries` | All individuals being mentored | Belongs to a preacher |
| `activities` | All da'wa activities | Created by a preacher |
| `attendance` | Attendance records per activity | Links beneficiary ↔ activity |
| `progress_logs` | Audit trail for beneficiary changes | Belongs to a beneficiary |

---

### Collection 1: `preachers`

```typescript
{
  id:         string      // Firebase Auth UID (used as document ID)
  name:       string      // Full display name
  email:      string      // Unique Google account email
  role:       "admin" | "da'i" | "pending"
  created_at: Timestamp   // When the profile was created
}
```

**Access Rules**:
- Admins → full read/write
- Users → can read their own profile only

---

### Collection 2: `beneficiaries`

```typescript
{
  id:           string       // Auto-generated Firestore document ID
  name:         string       // Full name of beneficiary
  phone:        string       // Egyptian phone format: 01X XXXXXXXX
  da_i_id:      string       // Firestore UID of assigned preacher
  batch?:       string       // Optional batch/cohort group name
  da_wa_stage:  DawaStage    // Current spiritual development stage
  notes?:       string       // Personal notes or remarks
  created_at:   Timestamp    // When record was created

  // Soft Delete Fields
  deleted?:     boolean      // True = archived (not permanently deleted)
  deletedAt?:   Timestamp    // Timestamp of when it was archived
}
```

**Da'wa Stages** — 4 progression levels:

| Stage | Key | Description |
|-------|-----|-------------|
| 1 | `"New Contact"` | Initial contact, early stage |
| 2 | `"Initial Interest"` | Showing interest in learning |
| 3 | `"Regular Attendance"` | Attending consistently |
| 4 | `"Committed Learner"` | Most advanced stage |

**Recommended Firestore Indexes**:

| Fields | Direction | Use Case |
|--------|-----------|---------|
| `da_i_id`, `created_at` | Asc, Desc | Filter by preacher |
| `deleted`, `created_at` | Asc, Desc | Archived records |
| `da_wa_stage`, `created_at` | Asc, Desc | Stage filtering |
| `phone` | Asc | Duplicate detection |

**Access Rules**:
- Admins → see all beneficiaries
- Preachers → see only records where `da_i_id == their UID`

---

### Collection 3: `activities`

All four activity types are stored in **separate Firestore collections**:
`maqari` / `events` / `lessons` / `sections`

```typescript
{
  id:            string        // Auto-generated
  name:          string        // Activity name/title
  type:          ActivityType  // Auto-set by app based on collection
  creator_id:    string        // UID of the preacher who created it
  creator_name:  string        // Cached name for display (denormalized)
  created_at:    Timestamp     // Creation timestamp
  event_date?:   Timestamp     // Optional: when the activity takes place
  description?:  string        // Optional: details or notes about activity
  batch?:        string        // Optional: associated batch/group
}
```

**Activity Types**:

| Type | Collection | Purpose |
|------|-----------|---------|
| **Maqra'a** | `maqari` | Personal Quran recitation circles |
| **Events** | `events` | Community gatherings and celebrations |
| **Lessons** | `lessons` | Structured educational sessions |
| **Sections** | `sections` | Organizational divisions or groups |

**Recommended Firestore Indexes**:

| Fields | Direction | Use Case |
|--------|-----------|---------|
| `creator_id`, `created_at` | Asc, Desc | Preacher's own activities |
| `type`, `created_at` | Asc, Desc | Filter by activity type |
| `event_date` | Desc | Timeline sorting |

**Access Rules**:
- Admins → see all activities across the system
- Preachers → see only activities where `creator_id == their UID`

---

### Collection 4: `attendance`

```typescript
{
  id:                string     // Auto-generated
  activity_id:       string     // Reference to activity document
  activity_name:     string     // Cached name (denormalized for display)
  activity_type:     string     // Cached type (denormalized for display)
  beneficiary_id:    string     // Reference to beneficiary document
  beneficiary_name:  string     // Cached name (denormalized for display)
  present:           boolean    // true = attended | false = absent
  logged_by_id:      string     // UID of the preacher who logged this
  logged_by_name:    string     // Cached name (denormalized for display)
  logged_at:         Timestamp  // When the attendance was recorded
}
```

**Recommended Firestore Indexes**:

| Fields | Direction | Use Case |
|--------|-----------|---------|
| `activity_id`, `logged_at` | Asc, Desc | View attendance for a specific activity |
| `beneficiary_id`, `logged_at` | Asc, Desc | View a beneficiary's activity history |

**Access Rules**:
- Admins → see all attendance records
- Preachers → see attendance for own activities and own beneficiaries

---

### Collection 5: `progress_logs`

Full audit trail of all changes made to beneficiary records:

```typescript
{
  id:                 string     // Auto-generated
  beneficiary_id:     string     // Reference to the affected beneficiary
  action:             ActionType // Type of change that occurred
  details:            string     // Human-readable description of the change
  performed_by:       string     // UID of the user who made the change
  performed_by_name:  string     // Cached name for display
  timestamp:          Timestamp  // Exact time the change was made
}
```

**Action Types**:

| Action | Trigger |
|--------|---------|
| `"transfer"` | Beneficiary was reassigned to a different preacher |
| `"stage_change"` | Da'wa stage was updated |
| `"note_added"` | Notes were added or modified |
| `"profile_updated"` | Any profile field was changed (name, phone, batch, etc.) |
| `"archived"` | Beneficiary was soft-deleted |
| `"restored"` | Archived beneficiary was reactivated |

**Recommended Firestore Indexes**:

| Fields | Direction | Use Case |
|--------|-----------|---------|
| `beneficiary_id`, `timestamp` | Asc, Desc | Full history of a beneficiary |
| `action`, `timestamp` | Asc, Desc | Filter by action type |
| `performed_by`, `timestamp` | Asc, Desc | Changes made by a specific user |

**Access Rules**:
- Admins → see all progress logs
- Preachers → see logs for their own beneficiaries only

---

### Data Relationships Diagram

```
Preachers (1)
    │
    ├──────────────→ Beneficiaries (Many)
    │                       │
    │                       ├──────→ Attendance Records (Many)
    │                       │
    │                       └──────→ Progress Logs (Many)
    │
    ├──────────────→ Activities (Many)
    │                       │
    │                       └──────→ Attendance Records (Many)
    │
    └──────────────→ Progress Logs (Many)
```

---

## 4. Authorization & Access Control

### Auth Guard Component
**File**: `components/auth/auth-guard.tsx`

- Wraps protected pages using the `requiredRole` prop
- Checks user authentication status on every render
- Redirects users if their role does not match the required role
- Displays a loading skeleton while auth state is being determined

```tsx
// Usage Example
<AuthGuard requiredRole="admin">
  <AdminDashboard />
</AuthGuard>
```

### Key Auth Utility Functions
**File**: `lib/auth-utils.ts`

| Function | Description |
|----------|-------------|
| `createUserProfile()` | Creates new user profile in Firestore on first login |
| `getUserProfile()` | Fetches full user profile and role from Firestore |
| `updateUserRole()` | Admin: change a user's role |
| `isAdmin()` | Returns true if current user has admin role |
| `isPreacher()` | Returns true if current user has da'i role |
| `canAccessAdminFeatures()` | Role check for admin-only features |
| `canManageBeneficiaries()` | Returns true for both admin and da'i roles |

### Next.js Middleware
**File**: `middleware.ts`

- Server-side route protection layer
- Checks Firebase session cookie before rendering any protected page
- Redirects unauthenticated users to the login page
- Works in tandem with the `AuthGuard` component for double protection

---

## 5. Beneficiary Management

Beneficiary management is the **core feature** of the DMS system.
The following components make up the complete beneficiary management module.

---

### 5.1 All Beneficiaries View
**File**: `components/beneficiaries/all-beneficiaries.tsx`

The main list component with full CRUD and bulk operations.

#### Viewing & Navigation

| Feature | Details |
|---------|---------|
| **Pagination** | Configurable page sizes: 10 / 25 / 50 / 100 items |
| **Sorting** | By name, phone, da'wa stage, or creation date (asc/desc) |
| **Search** | Full-text search by name or phone number |
| **Filter by Stage** | Show only beneficiaries at a specific da'wa stage |
| **Filter by Preacher** | Admin can filter by assigned preacher |
| **Filter by Date** | Filter by creation date range |
| **Advanced Stage View** | Quick filter for Committed Learners (most advanced) |

#### CRUD Operations

| Operation | Description |
|-----------|-------------|
| **Add** | Open AddBeneficiaryDialog to create new record |
| **Edit** | Update name, phone, batch, stage, or notes |
| **Delete** | Soft-delete (archive) the record |
| **Restore** | Reactivate an archived beneficiary |
| **View Details** | Open detailed view with history and stats |

#### Bulk Operations

| Operation | Description |
|-----------|-------------|
| **Bulk Edit** | Update batch, stage, or notes across multiple records |
| **Bulk Transfer** | Move multiple beneficiaries to a different preacher |
| **Bulk Delete** | Archive multiple records in one action |
| **Select All** | Select all records on current page |

#### Export

| Feature | Details |
|---------|---------|
| **CSV Export** | Download beneficiary list respecting current filters |
| **Columns Included** | Name, phone, preacher, stage, batch, notes, creation date |

---

### 5.2 Add Beneficiary Dialog
**File**: `components/beneficiaries/add-beneficiary-dialog.tsx`

| Field | Type | Required |
|-------|------|---------|
| Name | Text | ✅ Yes |
| Phone | Text (auto-formatted) | ✅ Yes |
| Da'wa Stage | Select dropdown | ✅ Yes |
| Assigned Preacher | Select (admin only) | ✅ Yes |
| Batch | Text | ❌ Optional |
| Notes | Textarea | ❌ Optional |

- **Smart Phone Formatting**: Auto-normalizes Egyptian phone numbers to `01X XXXXXXXX` format
- **Real-time Validation**: Inline errors shown as user types
- **Duplicate Check**: Warns if phone number already exists in system

---

### 5.3 Edit Beneficiary Dialog
**File**: `components/beneficiaries/edit-beneficiary-dialog.tsx`

- Edit any field: name, phone, batch, stage, notes
- **Automatic Progress Log**: Every edit creates a `profile_updated` log entry
- **Stage Change Log**: Stage changes create a dedicated `stage_change` log entry
- **Validation**: Same rules as add form

---

### 5.4 Beneficiary Details Dialog
**File**: `components/beneficiaries/beneficiary-details-dialog.tsx`

Comprehensive view of a single beneficiary record:

**Profile Section**:
- Full name, phone number
- Assigned preacher name
- Current da'wa stage with visual badge
- Batch/group assignment
- Personal notes
- Creation date

**Attendance Statistics** (by activity type):

| Type | Shown |
|------|-------|
| Maqra'a | Total sessions attended |
| Events | Total events attended |
| Lessons | Total lessons attended |
| Sections | Total sections attended |

**Progress History**:
- Full chronological list of all changes
- Shows: action type, details, who made the change, and when
- Covers transfers, stage changes, edits, archive/restore events

**Quick Actions**:
- ✏️ Edit profile
- 🔄 Transfer to another preacher
- 🗃️ Archive / restore
- 🗑️ Delete

---

### 5.5 Transfer Beneficiary Dialog
**File**: `components/beneficiaries/transfer-beneficiary-dialog.tsx`

- Select new preacher from dropdown list
- Prevents assigning to the current preacher (no-op guard)
- **Automatic Progress Log**: Creates a `transfer` entry with old and new preacher names
- **Batch Transfer**: Supports transferring multiple selected beneficiaries at once

---

### 5.6 Contact Import Dialog
**File**: `components/beneficiaries/contact-import-dialog.tsx`

Advanced bulk import tool for adding multiple beneficiaries at once.

#### Supported File Formats

| Format | Extension | Size Limit |
|--------|----------|------------|
| CSV | `.csv` | 10 MB |
| VCard | `.vcf` | 10 MB |

#### Import Processing Pipeline

```
1. File uploaded
       ↓
2. Parse contacts (extract name + phone)
       ↓
3. Auto-format phone numbers
       ↓
4. Check for intra-file duplicates
       ↓
5. Check against existing database records
       ↓
6. Display preview with validation status per row
       ↓
7. User configures bulk settings (batch, preacher, stage, notes)
       ↓
8. User selects which records to import (can deselect duplicates/errors)
       ↓
9. Import with real-time progress bar
       ↓
10. Results shown (success count, errors, duplicates skipped)
```

#### Features

| Feature | Details |
|---------|---------|
| **Phone Auto-Formatting** | Normalizes spaces, dashes, country code prefixes |
| **Duplicate Detection (DB)** | Checks against all existing phone numbers |
| **Duplicate Detection (File)** | Detects duplicates within the uploaded file itself |
| **Similar Number Alert** | Warns about numbers that look similar but aren't exact |
| **Bulk Preacher Assignment** | Assign all imports to one preacher |
| **Bulk Stage Assignment** | Set initial da'wa stage for all new contacts |
| **Bulk Batch Assignment** | Group all imports into a batch/cohort |
| **Selective Import** | Choose exactly which rows to import |
| **Progress Tracking** | Real-time progress bar during import |
| **Error Reporting** | Per-row error messages for invalid records |
| **Undo Capability** | Revert a recent import batch |
| **Batch Write Optimization** | Uses Firestore batches (500 docs max per batch) |

#### Row Status Indicators

| Status | Meaning |
|--------|---------|
| 🕐 Pending | Not yet processed |
| ✅ Success | Successfully imported |
| ❌ Error | Import failed (see error message) |
| 🔁 Duplicate | Already exists — skipped |

---

### 5.7 Data Health Check Tool
**File**: `components/beneficiaries/data-health-check.tsx`

An automated data quality scanner that detects and helps fix issues across
the entire beneficiaries dataset.

#### Issues Detected

| Issue Type | Category | Description |
|-----------|---------|-------------|
| Fixable phone numbers | ⚡ Auto-fixable | Wrong format: spaces, dashes, wrong prefix |
| Invalid phone numbers | ❌ Error | Format can't be corrected |
| Missing name | 📋 Warning | Beneficiary has no name |
| Missing phone | 📋 Warning | Beneficiary has no phone number |
| Missing preacher | 📋 Warning | Not assigned to any preacher |
| Missing stage | 📋 Warning | No da'wa stage assigned |
| Duplicate phones | 🔁 Duplicate | Two records with same phone number |
| Complete duplicates | 🔁 Duplicate | Same name AND phone number |
| Orphaned records | ⚠️ Orphan | Assigned preacher UID no longer exists in system |

#### Fix Capabilities

| Action | Description |
|--------|-------------|
| **One-Click Fix** | Fix a single phone formatting issue |
| **Bulk Fix** | Fix all or selected fixable issues at once |
| **Merge Duplicates** | Combine two duplicate records into one |
| **Delete Invalid** | Remove records that cannot be fixed |
| **Reassign Orphans** | Assign orphaned beneficiaries to an active preacher |
| **Export Report** | Download health check results as CSV |

#### Health Score

- Real-time data quality percentage **(0–100%)**
- Shown as a progress bar and percentage label
- Updates live as issues are fixed
- All fixes are logged to `progress_logs` with user + timestamp

---

## 6. Activity Management

### 6.1 Activity Types Overview

| Type | Icon | Collection | Purpose |
|------|------|-----------|---------|
| **Maqra'a** | 📖 | `maqari` | Quran recitation circles (one-on-one or small groups) |
| **Events** | 📅 | `events` | Community gatherings, celebrations, outreach events |
| **Lessons** | 📚 | `lessons` | Structured Islamic educational sessions |
| **Sections** | 👥 | `sections` | Organizational divisions or departmental groups |

---

### 6.2 Create Activity Dialog
**File**: `components/activities/create-activity-dialog.tsx`

| Field | Required | Notes |
|-------|---------|-------|
| Activity Name | ✅ Yes | Must be non-empty |
| Activity Type | ✅ Yes | Select from 4 types |
| Description | ❌ Optional | Free-text details |
| Event Date | ❌ Optional | Date and time picker |
| Batch | ❌ Optional | Associate with a group |

- Creator ID and name are **auto-set** from the currently authenticated user
- Timestamp is **auto-generated** on submission

---

### 6.3 Activity List View
**File**: `components/activities/activity-list.tsx`

| Feature | Details |
|---------|---------|
| **View All** | Show all activities of a specific type |
| **My Activities Filter** | Toggle to show only activities created by current user |
| **Search** | Search by activity name |
| **Sort by Date** | Event date ascending or descending |
| **Sort by Created** | Newest first or oldest first |
| **Sort by Name** | Alphabetical A-Z or Z-A |
| **Sort by Attendance** | Most attended first |
| **Pagination** | Configurable page size |
| **Activity Card** | Shows name, creator, event date, description preview |
| **Quick Actions** | Log attendance, view attendees, delete |

---

### 6.4 Activities Overview
**File**: `components/activities/activities-overview.tsx`

Summary dashboard widget showing:
- Count of each activity type (maqari / events / lessons / sections)
- Real-time count updates
- Quick navigation links to each activity type's full list
- Total activities count across all types

---

### 6.5 Attendance Tracking Dialog
**File**: `components/activities/attendance-dialog.tsx`

Used to log which beneficiaries attended a specific activity:

| Feature | Details |
|---------|---------|
| **Beneficiary List** | Shows all beneficiaries assigned to the preacher |
| **Search** | Filter beneficiaries during entry |
| **Mark Present/Absent** | Checkbox per beneficiary |
| **Select All** | Bulk mark all as present |
| **Deselect All** | Bulk mark all as absent |
| **Submit** | Writes all records to `attendance` collection |
| **Auto Timestamp** | `logged_at` set automatically on submit |
| **Progress Bar** | Real-time progress during submission |
| **Creator Cached** | `logged_by_id` and `logged_by_name` auto-set |

---

### 6.6 View Attendees Dialog
**File**: `components/activities/view-attendees-dialog.tsx`

View attendance records for a specific activity:
- Total attendee count
- List of who attended and who was absent
- Attendance percentage
- Activity history across sessions
- Beneficiary engagement by activity type

---

### 6.7 My Maqara'a View
**File**: `components/activities/my-maqari.tsx`

Personal view for preachers showing only their Maqra'a (recitation circles):
- Create new Maqra'a
- View all personal circles
- Log attendance for each circle
- View attendance history per circle
- Filter by batch/group

---

## 7. Dashboard & Analytics

### 7.1 Preacher Dashboard (Personal)
**File**: `app/dashboard/page.tsx`

| Metric | Description |
|--------|-------------|
| **Total Beneficiaries** | All beneficiaries assigned to this preacher |
| **New This Month** | Beneficiaries added in current calendar month |
| **My Maqara'a** | Total recitation circles created by this preacher |
| **Recent Activity** | Latest activities created |
| **Month-over-Month Growth** | Comparison of this month vs. last month |

**Quick Access Links**:
- → My Beneficiaries
- → My Maqara'a
- → Log Attendance
- → Recently Created Activities

---

### 7.2 Admin Dashboard (System-Wide)
**File**: `app/admin/page.tsx`

| Metric | Description |
|--------|-------------|
| **Total Beneficiaries** | System-wide count |
| **Total Preachers** | All active da'i users |
| **Total Activities** | Across all 4 types |
| **Inactive Beneficiaries** | No attendance in last 30 days |
| **New Users This Month** | New registrations |
| **Committed Learners** | Count of beneficiaries at most advanced stage |
| **Activities Breakdown** | Count per activity type |

---

### 7.3 Analytics Pages

#### Beneficiary Analytics
**Route**: `/admin/analytics/beneficiaries`

| Chart/Report | Description |
|-------------|-------------|
| **Growth Chart** | 12-month cumulative beneficiary growth line chart |
| **New vs Total** | Monthly new additions vs. total running count |
| **Stage Distribution** | Pie/bar chart of all 4 da'wa stages |
| **Inactive List** | Beneficiaries with no attendance in 30+ days, with preacher info |

#### Preacher Performance Analytics
**Route**: `/admin/analytics/preachers`

| Chart/Report | Description |
|-------------|-------------|
| **Beneficiaries per Preacher** | Bar chart showing assignment load |
| **Advanced Beneficiaries** | Preachers with most Committed Learners |
| **Activity Count** | Number of activities created per preacher |
| **Engagement Metrics** | Attendance rates per preacher |

#### Activity Analytics
**Route**: `/admin/analytics/activities`

| Chart/Report | Description |
|-------------|-------------|
| **Engagement Trends** | Participation rates by activity type over time |
| **Attendance Trends** | Overall attendance patterns across all activities |
| **Activity Type Distribution** | Count breakdown by type (maqari / events / lessons / sections) |
| **Creation Timeline** | When activities were created month-by-month |

---

### 7.4 Charts Used

| Chart | Library | Used For |
|-------|---------|---------|
| Area Chart | Recharts | Growth trends, attendance over time |
| Line Chart | Recharts | Month-over-month comparisons |
| Pie / Donut Chart | Recharts | Stage distribution |
| Bar Chart | Recharts | Preacher performance comparison |
| Progress Bars | Custom (Tailwind) | Health score, import progress |

---

## 8. Admin Panel Features

### 8.1 User Management
**File**: `app/admin/users/page.tsx`

#### View Sections

| Section | Description |
|---------|-------------|
| **Pending Approvals** | New users awaiting role assignment |
| **Active Preachers** | All users with da'i role |
| **Administrators** | All users with admin role |

#### Statistics Panel

| Stat | Description |
|------|-------------|
| Total Users | All registered accounts |
| Active Preachers | Total da'i role users |
| Pending Approvals | Awaiting role assignment |
| Total Admins | All admin role users |

#### User Actions

| Action | Description |
|--------|-------------|
| **Approve User** | Change role from `pending` → `da'i` |
| **Promote to Admin** | Change role from `da'i` → `admin` |
| **Remove User** | Deactivate or delete user from system |
| **View Email** | See registered email address |
| **View Join Date** | See when user first registered |

---

### 8.2 Admin Beneficiary Management
**File**: `app/admin/beneficiaries/page.tsx`

- System-wide view of **all beneficiaries** (not filtered by preacher)
- All same CRUD, bulk operations, export features as preacher view
- Data Health Check tool accessible here
- Contact Import tool accessible here
- Can transfer any beneficiary to any preacher

---

### 8.3 Admin Activity Management
**File**: `app/admin/activities/page.tsx`

- System-wide view of **all activities** across all preachers
- Separate sub-pages for each activity type:
  - `/admin/activities/maqari`
  - `/admin/activities/events`
  - `/admin/activities/lessons`
  - `/admin/activities/sections`
- Can view and delete any activity in the system

---

## 9. Data Management & Logging

### 9.1 Soft Delete System

Beneficiaries are **never permanently deleted** by default:

| Field | Purpose |
|-------|---------|
| `deleted: boolean` | Marks record as archived |
| `deletedAt: Timestamp` | Records when it was archived |

**Behavior**:
- Active list: queries where `deleted != true`
- Archive list: queries where `deleted == true`
- Restore: sets `deleted = false`, clears `deletedAt`
- Progress log entry created for both archive and restore actions

---

### 9.2 Progress Logging System

Every significant change to a beneficiary record is **automatically logged**
to the `progress_logs` collection without any manual action required.

#### Auto-Logged Events

| Event | Action Value | What's Logged |
|-------|-------------|---------------|
| Transfer | `"transfer"` | Old preacher → new preacher name |
| Stage change | `"stage_change"` | Old stage → new stage |
| Note added/edited | `"note_added"` | Note content preview |
| Profile update | `"profile_updated"` | Fields that were changed |
| Archived | `"archived"` | Who archived and when |
| Restored | `"restored"` | Who restored and when |

**Each log entry always includes**:
- `performed_by` — UID of user who made the change
- `performed_by_name` — Cached display name
- `timestamp` — Exact time of change
- `details` — Human-readable description of what changed

---

### 9.3 Batch Operations & Firestore Optimization

Large operations use **Firestore batch writes** for atomicity and performance:

```typescript
const batch = writeBatch(db)

// Example: bulk transfer multiple beneficiaries
selectedBeneficiaries.forEach(b => {
  const ref = doc(db, "beneficiaries", b.id)
  batch.update(ref, {
    da_i_id: newPreacherId,
    da_i_name: newPreacherName
  })
})

await batch.commit() // All updates applied atomically
```

**Firestore Batch Limits**:
- Maximum **500 operations** per batch
- Import tool automatically splits large imports into multiple batches
- Ensures no partial writes on failure

---

## 10. Offline & PWA Capabilities

### 10.1 Service Worker
**File**: `public/sw.js`

| Property | Value |
|----------|-------|
| **Caching Strategy** | Network-first with offline fallback |
| **Offline Page** | `/offline` — shown when no connection detected |
| **Cached Assets** | App manifest, icons, static shell |
| **Skipped from Cache** | Next.js internal chunks, Firebase/Google Auth, API calls |

**Why API calls are skipped from cache**:
- Auth tokens are time-sensitive
- Data freshness is critical for a management system
- Prevents stale data being shown as if it were live

### 10.2 PWA Manifest
**File**: `public/manifest.json`

| Property | Value |
|----------|-------|
| **Display Mode** | Standalone (no browser chrome) |
| **Installable** | Yes — "Add to Home Screen" on mobile and desktop |
| **Theme Colors** | Custom brand color scheme |
| **Shortcuts** | Quick links to dashboard |
| **Icons** | Multiple resolutions for all device types |
| **Offline Support** | Fallback page when no internet |

### 10.3 PWA Installation

| Platform | Method |
|----------|--------|
| **Android** | Menu → "Add to Home Screen" |
| **iOS 16.4+** | Share → "Add to Home Screen" |
| **Chrome Desktop** | Click install icon in address bar |
| **Edge Desktop** | Settings → "Install this site as an app" |

### 10.4 What Works Offline

| Feature | Offline Available? |
|---------|-------------------|
| View cached pages | ✅ Yes |
| Navigate between pages | ✅ Yes |
| View previously loaded data | ✅ Yes (from cache) |
| Create new records | ❌ No (requires Firestore) |
| Real-time data sync | ❌ No |
| Firebase Authentication | ❌ No |
| File uploads | ❌ No |

### 10.5 PWA Component
**File**: `components/service-worker-register.tsx`

- Registers the service worker on app load
- Handles registration errors gracefully
- Only registers in production environment

---

## 11. UI Component Library

The project uses **Radix UI primitives** composed via **Shadcn/UI** with **Tailwind CSS** styling.
All components support dark mode and are fully accessible (WCAG 2.1 AA).

### Theme Support
**File**: `components/theme-provider.tsx`

| Feature | Details |
|---------|---------|
| **Dark Mode** | Full dark/light theme toggle |
| **System Detection** | Respects OS-level dark mode preference |
| **Manual Override** | User can override system preference |
| **Persistence** | Theme preference saved to `localStorage` |
| **Smooth Transition** | Animated theme switching |
| **Toggle Component** | `components/ui/theme-toggle.tsx` |

### Component Categories

#### Form Components

| Component | File | Purpose |
|-----------|------|---------|
| Input | `ui/input.tsx` | Text input fields |
| Textarea | `ui/textarea.tsx` | Multi-line text input |
| Label | `ui/label.tsx` | Accessible form labels |
| Select | `ui/select.tsx` | Dropdown selections |
| Checkbox | `ui/checkbox.tsx` | Boolean toggles |
| Calendar | `ui/calendar.tsx` | Date picker |

#### Layout & Structure

| Component | File | Purpose |
|-----------|------|---------|
| Card | `ui/card.tsx` | Content containers |
| Separator | `ui/separator.tsx` | Visual dividers |
| Sidebar | `ui/sidebar.tsx` | Collapsible navigation panel |
| Sheet | `ui/sheet.tsx` | Mobile slide-out drawer |
| Tabs | `ui/tabs.tsx` | Tabbed content switching |
| Collapsible | `ui/collapsible.tsx` | Expandable/collapsible sections |
| Breadcrumb | `ui/breadcrumb.tsx` | Page location indicator |

#### Data Display

| Component | File | Purpose |
|-----------|------|---------|
| Table | `ui/table.tsx` | Data tables with sorting support |
| Badge | `ui/badge.tsx` | Status and category labels |
| Avatar | `ui/avatar.tsx` | User profile pictures |
| Skeleton | `ui/skeleton.tsx` | Loading placeholder animations |
| Progress | `ui/progress.tsx` | Progress bars |
| Alert | `ui/alert.tsx` | Info / warning / error messages |
| Stats Card | `ui/stats-card.tsx` | Custom metric display cards |
| Empty State | `ui/empty-state.tsx` | Shown when lists are empty |
| Highlight Text | `ui/highlight-text.tsx` | Search term highlighting |
| Chart | `ui/chart.tsx` | Recharts integration wrapper |

#### Dialogs & Overlays

| Component | File | Purpose |
|-----------|------|---------|
| Dialog | `ui/dialog.tsx` | Standard modal dialog |
| Alert Dialog | `ui/alert-dialog.tsx` | Confirmation modals (danger-aware) |
| Confirm Dialog | `ui/confirm-dialog.tsx` | Generic confirmation prompt |
| Confirm Dialog 2 | `ui/confirm-dialog2.tsx` | Alternate confirmation style |
| Logout Dialog | `ui/logout-dialog.tsx` | Confirm logout action |
| Popover | `ui/popover.tsx` | Floating info panels |
| Tooltip | `ui/tooltip.tsx` | Hover tooltips |

#### Navigation & Branding

| Component | File | Purpose |
|-----------|------|---------|
| Button | `ui/button.tsx` | Action buttons (multiple variants) |
| Logo | `ui/logo.tsx` | App logo with dark/light variant |
| Theme Toggle | `ui/theme-toggle.tsx` | Switch between dark and light mode |

---

## 12. Technical Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 15.2.8 | React framework with App Router, SSR/SSG |
| **React** | 19 | UI component library |
| **TypeScript** | 5 | Static type checking |
| **Tailwind CSS** | 3.4 | Utility-first styling |
| **Radix UI + Shadcn/UI** | Latest | Accessible component primitives |
| **React Hook Form** | 7.5 | Performant form state management |
| **Zod** | 3.24 | Schema-first form validation |
| **Recharts** | 2.x | Chart and data visualization library |
| **Lucide React** | 0.454 | SVG icon library (300+ icons) |
| **Sonner** | Latest | Toast notification system |
| **next-themes** | Latest | Dark/light mode provider |
| **clsx** | Latest | Conditional class merging utility |
| **tailwind-merge** | Latest | Tailwind class conflict resolver |
| **class-variance-authority** | Latest | Component variant management |

### Backend & Services

| Technology | Purpose |
|-----------|---------|
| **Firebase Firestore** | NoSQL cloud database |
| **Firebase Authentication** | Google OAuth 2.0 |
| **Firebase Storage** | File and image storage |
| **Google OAuth** | Authentication provider |
| **Vercel** | Recommended deployment platform |

### Development Tools

| Tool | Purpose |
|------|---------|
| **TypeScript 5** | Strict type checking across codebase |
| **ESLint** | Code quality and style enforcement |
| **PostCSS** | CSS processing pipeline |
| **Autoprefixer** | Browser compatibility prefixes |
| **pnpm** | Fast, efficient package manager (alternative to npm) |

---

## 13. Key Pages & Routing Structure

```
app/
│
├── page.tsx                            # Landing page / Google Sign-In
├── layout.tsx                          # Root layout — ThemeProvider + ServiceWorker
├── error.tsx                           # Global error boundary
├── loading.tsx                         # Global loading state
├── not-found.tsx                       # 404 Not Found page
│
├── offline/
│   └── page.tsx                        # PWA offline fallback page
│
├── dashboard/                          # 🔒 Requires: da'i or admin role
│   ├── page.tsx                        # Preacher personal dashboard
│   ├── beneficiaries/
│   │   └── page.tsx                    # My assigned beneficiaries
│   ├── maqari/
│   │   └── page.tsx                    # My Maqara'a (recitation circles)
│   └── activities/
│       ├── page.tsx                    # Activities overview (all types)
│       ├── maqari/page.tsx             # My Maqra'a activities
│       ├── events/page.tsx             # My Events
│       ├── lessons/page.tsx            # My Lessons
│       └── sections/page.tsx          # My Sections
│
└── admin/                              # 🔒 Requires: admin role only
    ├── page.tsx                        # Admin system-wide dashboard
    ├── users/
    │   └── page.tsx                    # User management (approve, promote, remove)
    ├── beneficiaries/
    │   └── page.tsx                    # All beneficiaries (system-wide)
    ├── analytics/
    │   ├── beneficiaries/
    │   │   ├── page.tsx                # Beneficiary analytics & charts
    │   │   └── loading.tsx             # Loading skeleton
    │   ├── preachers/
    │   │   ├── page.tsx                # Preacher performance charts
    │   │   └── loading.tsx             # Loading skeleton
    │   └── activities/
    │       ├── page.tsx                # Activity analytics & charts
    │       └── loading.tsx             # Loading skeleton
    └── activities/
        ├── page.tsx                    # All activities overview
        ├── maqari/page.tsx
        ├── events/page.tsx
        ├── lessons/page.tsx
        └── sections/page.tsx
```

---

## 14. Data Flow & Custom Hooks

### `useAuth()` Hook
**File**: `hooks/use-auth.tsx`

The central authentication state manager for the entire application.

| Provided | Type | Description |
|---------|------|-------------|
| `user` | FirebaseUser | Currently authenticated user object |
| `userRole` | string | Role: `"admin"` / `"da'i"` / `"pending"` |
| `userProfile` | object | Full Firestore profile document |
| `loading` | boolean | True while auth state is being determined |
| `signInWithGoogle()` | function | Trigger Google OAuth sign-in flow |
| `logout()` | function | Sign out and clear all session data |

- Sets up a Firebase `onAuthStateChanged` listener on app mount
- Automatically fetches user profile from Firestore after auth
- Persists auth state across page refreshes

---

### `useDashboardData()` Hook
**File**: `hooks/use-dashboard-data.ts`

Fetches all data needed to power both admin and preacher dashboards.

| Returned Data | Admin | Preacher |
|--------------|-------|---------|
| `beneficiaries` | All in system | Only assigned to current preacher |
| `preachers` | All users | All users (for transfer/assign UI) |
| `attendanceRecords` | All records | Own records only |
| `activities` | All 4 types, all creators | Own activities only |
| `loading` | Boolean loading state | Boolean loading state |
| `error` | Error object if any | Error object if any |
| `refresh()` | Re-fetch all data | Re-fetch all data |

**Behavior**:
- Role-based data filtering is applied **at the query level** (not client-side)
- Admins receive unfiltered data from all Firestore collections
- Preachers receive data filtered by their UID

---

### `useMobile()` Hook
**File**: `hooks/use-mobile.tsx`

- Detects if the current viewport is mobile-sized
- Used to switch between `Sheet` (mobile) and `Dialog` (desktop) layouts
- Returns `boolean`: `true` if screen width < 640px

---

## 15. Architectural Patterns

### Authorization Wrapper Pattern

```tsx
// Every protected page uses this wrapper
<AuthGuard requiredRole="admin">
  <PageContent />
</AuthGuard>
```

- Blocks render until auth state is confirmed
- Shows loading skeleton during auth check
- Redirects on insufficient permissions
- Works at both component and middleware level

---

### Responsive Dialog Pattern

```tsx
// Automatically uses Sheet on mobile, Dialog on desktop
<ResponsiveDialog>
  <FormContent />
</ResponsiveDialog>
```

- `Sheet` used on mobile for touch-friendly slide-up panels
- `Dialog` used on desktop for centered modal experience
- Controlled by `useMobile()` hook internally

---

### Firestore Denormalization Pattern

To avoid expensive JOIN-like queries, some data is **cached inside documents**:

```typescript
// attendance document caches names at write time
{
  activity_id:       "abc123",
  activity_name:     "Monday Maqra'a",      // ← cached, not looked up
  beneficiary_id:    "xyz789",
  beneficiary_name:  "Ahmed Mohamed",       // ← cached, not looked up
  logged_by_name:    "Ustaz Omar",          // ← cached, not looked up
}
```

**Trade-off**: Slightly stale cached names if original records are renamed,
but avoids N+1 query problems on large lists.

---

### Error Handling Pattern

```typescript
try {
  await firestoreOperation()
  toast.success("Operation completed")
} catch (error) {
  console.error(error)
  toast.error("Something went wrong. Please try again.")
}
```

- All async Firestore operations wrapped in `try/catch`
- User-friendly toast messages via **Sonner**
- Errors never expose raw Firebase error messages to users
- Error states rendered in UI components (not just toasts)

---

### Manual Refresh Pattern

The app uses a **load-once + manual refresh** strategy rather than real-time listeners:

**Reason**: Real-time listeners on large collections are expensive in Firestore billing.

```typescript
// Data loads on mount, refresh button re-fetches
const { data, refresh } = useDashboardData()

// Refresh button in UI
<Button onClick={refresh}>🔄 Refresh</Button>
```

---

## 16. Configuration & Environment

### Required Environment Variables

```env
# Firebase Project Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Admin Configuration
NEXT_PUBLIC_INITIAL_ADMIN_EMAIL=admin@yourdomain.com
```

> ⚠️ All variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.
> Never store private keys or secrets with this prefix.

### Firestore Security Rules (Recommended)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function: check user role from Firestore
    function getUserRole() {
      return get(/databases/$(database)/documents/preachers/$(request.auth.uid)).data.role;
    }
    function isAdmin() {
      return request.auth != null && getUserRole() == 'admin';
    }
    function isPreacher() {
      return request.auth != null && getUserRole() == "da'i";
    }

    // Preachers collection
    match /preachers/{userId} {
      allow read: if request.auth != null;
      allow write: if isAdmin() || request.auth.uid == userId;
    }

    // Beneficiaries
    match /beneficiaries/{docId} {
      allow read: if isAdmin() ||
        (isPreacher() && resource.data.da_i_id == request.auth.uid);
      allow write: if isAdmin() || isPreacher();
    }

    // Activities (maqari, events, lessons, sections)
    match /{activityType}/{docId} {
      allow read: if request.auth != null;
      allow write: if isAdmin() ||
        (isPreacher() && request.resource.data.creator_id == request.auth.uid);
    }

    // Attendance
    match /attendance/{docId} {
      allow read: if request.auth != null;
      allow write: if isAdmin() || isPreacher();
    }

    // Progress Logs (audit trail — write-only for preachers)
    match /progress_logs/{docId} {
      allow read: if isAdmin() ||
        (isPreacher() && resource.data.performed_by == request.auth.uid);
      allow write: if isAdmin() || isPreacher();
    }
  }
}
```

---

## 17. Build & Run Commands

```bash
# Install dependencies
npm install
# OR (faster)
pnpm install

# Start development server (runs on port 5000)
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run ESLint code quality checks
npm run lint
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

```bash
docker build -t dms .
docker run -p 5000:5000 --env-file .env.local dms
```

### Vercel Deployment (Recommended)

```bash
# Automatic deployment on push to main branch
git push origin main
```

Add all `.env.local` variables to Vercel project settings before deploying.

---

## 18. Feature Comparison: Admin vs Preacher

| Feature | Admin | Preacher (da'i) | Pending |
|---------|:-----:|:---------------:|:-------:|
| System dashboard | ✅ Full | ✅ Personal only | ❌ |
| View beneficiaries | ✅ All | ✅ Assigned only | ❌ |
| Add beneficiary | ✅ | ✅ | ❌ |
| Edit beneficiary | ✅ Any | ✅ Own only | ❌ |
| Transfer beneficiary | ✅ Any | ✅ Own only | ❌ |
| Archive/restore beneficiary | ✅ | ✅ | ❌ |
| Bulk operations | ✅ | ✅ | ❌ |
| Export CSV | ✅ | ✅ | ❌ |
| Import contacts | ✅ | ✅ | ❌ |
| Data health check | ✅ Full | ✅ Limited | ❌ |
| Create activities | ✅ | ✅ | ❌ |
| Log attendance | ✅ | ✅ | ❌ |
| View analytics | ✅ System-wide | ✅ Personal only | ❌ |
| View all preachers' data | ✅ | ❌ | ❌ |
| Approve pending users | ✅ | ❌ | ❌ |
| Promote users to admin | ✅ | ❌ | ❌ |
| Remove users | ✅ | ❌ | ❌ |
| View system reports | ✅ | ❌ | ❌ |
| Access all activities | ✅ | ❌ | ❌ |

---

## 19. System Capabilities Summary

The DMS is a **comprehensive da'wa management platform** purpose-built for
Islamic outreach organizations. Here is a complete summary of what the system delivers:

| Domain | Capability |
|--------|-----------|
| ✅ **Authentication** | Google OAuth, role-based access (Admin / Preacher / Pending) |
| ✅ **User Management** | Approve users, assign roles, promote, remove |
| ✅ **Beneficiary Management** | Full CRUD, bulk ops, transfers, archiving, import, export |
| ✅ **Activity Management** | 4 activity types, create, search, sort, paginate |
| ✅ **Attendance Tracking** | Per-activity attendance logging with bulk select |
| ✅ **Progress Logging** | Automatic audit trail for all beneficiary changes |
| ✅ **Data Health Check** | Duplicate detection, orphan detection, auto-fix tools |
| ✅ **Analytics & Charts** | 12-month trends, stage distribution, performance metrics |
| ✅ **Offline Support** | PWA with service worker, installable, offline fallback page |
| ✅ **Dark Mode** | Full dark/light theme with system detection |
| ✅ **Mobile Responsive** | Adaptive layouts, touch-friendly, mobile-first design |
| ✅ **Export** | CSV downloads for beneficiary lists with filter support |
| ✅ **Batch Operations** | Bulk edit, transfer, delete with Firestore optimization |
| ✅ **Security** | Firestore rules, HTTPS, env variables, role guards |
| ✅ **Type Safety** | Full TypeScript coverage with strict mode |

---

*This document serves as the primary technical reference for the DMS codebase.
For the public-facing setup guide, see [README.md](./README.md).*
