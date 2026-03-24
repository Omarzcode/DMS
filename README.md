<div align="center">

<img src="https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/ec559a9f6bfd399b82bb44393651661b08aaf7ba/icons/folder-markdown-open.svg" width="120px" />

# DMS — Da'wa Management System

![Next.js](https://img.shields.io/badge/Next.js%2015-000000?style=flat&logo=next.js)
![React](https://img.shields.io/badge/React%2019-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript%205-3178C6?style=flat&logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat&logo=firebase&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS%203-06B6D4?style=flat&logo=tailwind-css&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Enabled-5A0FC8?style=flat&logo=pwa)
![License](https://img.shields.io/badge/License-MIT-green.svg)
![Version](https://img.shields.io/badge/Version-1.0.0-blue.svg)
![Last Commit](https://img.shields.io/github/last-commit/Omarzcode/DMS?color=0080ff)

A comprehensive **Progressive Web Application (PWA)** designed for Islamic da'wa
(outreach) organizations to manage volunteers, beneficiaries, activities,
and track spiritual development progress.

**[Features](#features) • [Installation](#installation--setup) •
[Architecture](#architecture) • [Database](#database-structure) •
[Configuration](#configuration) • [Contributing](#contributing)**

[🌐 Live Demo](#) • [🐛 Report Bug](https://github.com/Omarzcode/DMS/issues) •
[💡 Request Feature](https://github.com/Omarzcode/DMS/issues)

</div>

---

## 📋 Table of Contents

1. [Overview](#1-overview)
2. [Screenshots](#2-screenshots)
3. [Features](#3-features)
4. [Technology Stack](#4-technology-stack)
5. [Architecture](#5-architecture)
6. [Database Structure](#6-database-structure)
7. [Installation & Setup](#7-installation--setup)
8. [Development](#8-development)
9. [Deployment](#9-deployment)
10. [Authentication & Authorization](#10-authentication--authorization)
11. [PWA & Offline Support](#11-pwa--offline-support)
12. [Configuration](#12-configuration)
13. [Project Structure](#13-project-structure)
14. [Component Library](#14-component-library)
15. [Performance Optimizations](#15-performance-optimizations)
16. [Browser Support](#16-browser-support)
17. [Contributing](#17-contributing)
18. [Troubleshooting](#18-troubleshooting)
19. [License](#19-license)
20. [Acknowledgments](#20-acknowledgments)

---

## 1. Overview

**DMS (Da'wa Management System)** is a full-featured management platform built
specifically for Islamic organizations managing Da'wa (spiritual outreach)
activities. It enables administrators and volunteer preachers to:

- 👥 **Manage Beneficiaries** — Track individuals through four distinct
  spiritual development stages with full CRUD, bulk operations, and CSV export
- 📅 **Organize Activities** — Create and manage Quran recitation circles,
  events, lessons, and organizational sections
- 📊 **Track Progress** — Monitor attendance, engagement, and spiritual
  advancement with a complete audit trail
- 📥 **Bulk Import** — Import contacts via CSV/VCard with automatic validation
  and intelligent duplicate detection
- 🔍 **Data Integrity** — Detect and resolve data quality issues automatically
  with a built-in health check tool
- 📈 **Real-time Analytics** — Dashboards with charts and metrics for
  organizational insights
- 📱 **Offline Support** — Continue working without internet connection as a
  fully installable PWA
- 🔒 **Role-based Access** — Different views and capabilities for admins
  vs. preachers vs. pending users

The application is designed with **accessibility**, **performance**, and
**user experience** as core principles, featuring a modern responsive interface
that works seamlessly across all devices and screen sizes.

---

## 2. Screenshots

> 📸 Screenshots and demo GIFs will be added here.

| Admin Dashboard | Beneficiary Management |
|----------------|----------------------|
| ![Admin Dashboard](./public/placeholder.jpg) | ![Beneficiary Management](./public/placeholder.jpg) |

| Activity Tracking | Analytics Charts |
|------------------|-----------------|
| ![Activity Tracking](./public/placeholder.jpg) | ![Analytics](./public/placeholder.jpg) |

> To add real screenshots: replace the placeholder paths above with actual
> screenshots from your deployment.

---

## 3. Features

### 🔐 Authentication & Authorization

#### Firebase Google OAuth Integration

- **Seamless Google Login** — Users authenticate via Google OAuth 2.0
- **Auto Role Assignment** — First-time admin gets special access via
  environment configuration (`NEXT_PUBLIC_INITIAL_ADMIN_EMAIL`)
- **Persistent Sessions** — Sessions maintained securely with Firebase tokens,
  auto-refreshed before expiration
- **Profile Auto-Creation** — User profile created automatically in Firestore
  on first login
- **Secure Logout** — Full session termination with local data cleanup

#### Three-Tier Role System

| Role | Default Route | Capabilities |
|------|--------------|--------------|
| **Admin** | `/admin` | Full system access — manage all data, all users, all analytics, all preachers & beneficiaries |
| **Da'i (Preacher)** | `/dashboard` | Manage own assigned beneficiaries, create and view own activities, personal dashboard |
| **Pending** | `/` | View-only access — awaiting admin approval to become a preacher |

---

### 👥 Beneficiary Management

#### Create & Edit Beneficiaries

- **Full Information Capture**:
  - Name, phone number
  - Assigned preacher (da'i)
  - Spiritual development stage (4 stages)
  - Batch/group categorization
  - Personal notes and remarks
- **Smart Phone Formatting** — Automatic Egyptian phone number normalization
  to `01X XXXXXXXX` format
- **Real-time Validation** — Inline errors shown as user types
- **Duplicate Check** — Warns if phone number already exists in system
- **Automatic Timestamps** — Creation and last-update times tracked

#### Da'wa Stage Progression

| Stage | Description |
|-------|-------------|
| **New Contact** | Initial contact — early outreach stage |
| **Initial Interest** | Showing genuine interest in learning |
| **Regular Attendance** | Consistently attending activities |
| **Committed Learner** | Most advanced — deeply engaged learner |

#### Advanced Filtering & Search

| Filter | Description |
|--------|-------------|
| **Full-text Search** | Search by name or phone number |
| **Stage Filter** | View beneficiaries at a specific spiritual stage |
| **Preacher Filter** | Show only beneficiaries assigned to specific preacher (admin) |
| **Advanced Stage View** | Quick filter for Committed Learners |
| **Sorting** | By name, creation date, or stage (asc/desc) |
| **Pagination** | 10 / 25 / 50 / 100 items per page |

#### Bulk Operations

| Operation | Description |
|-----------|-------------|
| **Bulk Edit** | Update batch, stage, or notes across multiple records |
| **Bulk Transfer** | Move multiple beneficiaries to a different preacher |
| **Bulk Delete** | Archive multiple records at once |
| **Select All** | Select all items on current page |

#### Export Functionality

- **CSV Export** — Download beneficiary list respecting current active filters
- **Custom Columns** — Includes name, phone, assigned preacher, stage,
  batch, notes, creation date

---

#### Bulk Contact Import (Advanced)

**File**: `components/beneficiaries/contact-import-dialog.tsx`

| Format | Extension | Size Limit |
|--------|----------|------------|
| CSV | `.csv` | 10 MB |
| VCard | `.vcf` | 10 MB |

**Import Processing Pipeline**:

```
1. File uploaded
        ↓
2. Parse contacts (extract name + phone)
        ↓
3. Auto-format phone numbers
        ↓
4. Detect intra-file duplicates
        ↓
5. Check against existing database
        ↓
6. Show preview with per-row validation status
        ↓
7. User configures bulk settings
   (batch / preacher / stage / notes)
        ↓
8. User selects which rows to import
        ↓
9. Import with real-time progress bar
        ↓
10. Results: success count, errors, duplicates skipped
```

**Features**:

| Feature | Details |
|---------|---------|
| **Phone Auto-Format** | Normalizes spaces, dashes, prefixes |
| **DB Duplicate Check** | Checks all existing phone numbers |
| **File Duplicate Check** | Detects duplicates within uploaded file |
| **Similar Number Alert** | Warns about close-but-not-exact matches |
| **Bulk Preacher Assignment** | Assign all imports to one preacher |
| **Bulk Stage Assignment** | Set initial stage for all new contacts |
| **Bulk Batch Assignment** | Group all imports into a cohort |
| **Selective Import** | Choose exactly which rows to import |
| **Progress Bar** | Real-time import progress indicator |
| **Error Reporting** | Per-row error messages for invalid records |
| **Undo Capability** | Revert a recent import batch |
| **Batch Write Optimization** | Firestore batches (max 500 docs each) |

**Row Status Indicators**:

| Status | Meaning |
|--------|---------|
| 🕐 Pending | Not yet processed |
| ✅ Success | Successfully imported |
| ❌ Error | Import failed — see error message |
| 🔁 Duplicate | Already exists — skipped |

---

#### Data Health Check Tool

**File**: `components/beneficiaries/data-health-check.tsx`

An intelligent automated data quality scanner that detects and helps
fix issues across the entire beneficiaries dataset.

**Issues Detected**:

| Issue | Type | Description |
|-------|------|-------------|
| Fixable phone numbers | ⚡ Auto-fixable | Wrong format — spaces, dashes, wrong prefix |
| Invalid phone numbers | ❌ Error | Format cannot be corrected |
| Missing name | 📋 Warning | Beneficiary has no name recorded |
| Missing phone | 📋 Warning | No phone number on record |
| Missing preacher | 📋 Warning | Not assigned to any preacher |
| Missing stage | 📋 Warning | No da'wa stage assigned |
| Duplicate phones | 🔁 Duplicate | Two records share the same phone |
| Complete duplicates | 🔁 Duplicate | Same name AND same phone number |
| Orphaned records | ⚠️ Orphan | Assigned preacher UID no longer exists |

**Fix Capabilities**:

| Action | Description |
|--------|-------------|
| **One-Click Fix** | Fix a single phone formatting issue |
| **Bulk Fix** | Fix all or selected fixable issues at once |
| **Merge Duplicates** | Combine two duplicate records into one |
| **Delete Invalid** | Remove records that cannot be repaired |
| **Reassign Orphans** | Re-assign orphaned beneficiaries to an active preacher |
| **Export Report** | Download health check results as CSV |
| **Health Score** | Real-time data quality percentage (0–100%) |
| **Audit Trail** | All fixes logged with user identity + timestamp |

---

#### Archive & Restore (Soft Delete)

- **Soft Delete** — Beneficiaries marked as archived, never permanently removed
- **Archive List** — View all archived beneficiaries separately
- **Restore** — Reactivate archived records at any time
- **Audit Trail** — Archive and restore actions logged automatically

---

### 📅 Activity Management

#### Four Types of Activities

| Type | Icon | Purpose |
|------|------|---------|
| **Maqra'a** | 📖 | Quran recitation circles — one-on-one or small groups |
| **Events** | 📅 | Community gatherings, celebrations, outreach meetings |
| **Lessons** | 📚 | Structured Islamic educational sessions |
| **Sections** | 👥 | Organizational groups and departmental divisions |

#### Activity Features

- **Create Activities** — Name, type, description, event date, batch assignment
- **Search & Filter** — By name, type, batch, or creator
- **Sort Options** — By event date, creation date, name, or attendance count
- **Pagination** — Configurable items per page
- **Attendance Tracking** — Mark beneficiaries present/absent with checkboxes
- **Bulk Select** — Select all / deselect all attendees
- **Activity History** — View past sessions and attendance patterns
- **Preacher View** — Preachers see and manage only their own activities

---

### 📊 Dashboard & Analytics

#### Admin Dashboard (System-Wide)

**Key Metrics**:

| Metric | Description |
|--------|-------------|
| Total Beneficiaries | System-wide count |
| Total Active Preachers | All da'i role users |
| Total Activities | Across all 4 activity types |
| Inactive Beneficiaries | No attendance in last 30 days |
| New Users This Month | New registrations |
| Committed Learners | Count at most advanced stage |

**Analytics Pages**:

| Page | Route | Charts Included |
|------|-------|----------------|
| Beneficiary Analytics | `/admin/analytics/beneficiaries` | Growth chart, stage distribution, inactive list |
| Preacher Performance | `/admin/analytics/preachers` | Performance comparison, beneficiary load, activity count |
| Activity Analytics | `/admin/analytics/activities` | Engagement trends, attendance patterns, type distribution |

#### Preacher Dashboard (Personal)

| Metric | Description |
|--------|-------------|
| My Beneficiaries | Total assigned to this preacher |
| New This Month | Added in current calendar month |
| Month-over-Month | Growth comparison vs. last month |
| My Maqara'a | Total recitation circles created |
| Recent Activity | Latest activities and attendance logs |

---

### 🛠️ Admin Panel

#### User Management (`/admin/users`)

| Action | Description |
|--------|-------------|
| **View All Users** | See all registered users with roles and join dates |
| **Approve Users** | Convert `pending` → `da'i` role |
| **Promote Users** | Elevate `da'i` → `admin` role |
| **Remove Users** | Deactivate or remove users from system |

**User Sections**:
- 🕐 Pending Approvals
- ✅ Active Preachers
- 🛡️ Administrators

---

### 🌙 Theme & Responsive Design

#### Dark Mode Support

| Feature | Details |
|---------|---------|
| System Detection | Automatically respects OS dark mode setting |
| Manual Toggle | Users can override system preference |
| Persistence | Theme saved to `localStorage` |
| Smooth Transitions | Animated theme switching |
| Full Coverage | Every component is themed correctly |

#### Responsive Breakpoints

| Device | Breakpoint |
|--------|-----------|
| Mobile | < 640px |
| Tablet | 640px – 1024px |
| Desktop | > 1024px |

---

### 🔄 Data Management & Audit Trail

#### Progress / Change Logging

Every significant change to a beneficiary is **automatically logged** to the
`progress_logs` collection:

| Action | Trigger |
|--------|---------|
| `transfer` | Beneficiary reassigned to a different preacher |
| `stage_change` | Da'wa stage updated |
| `note_added` | Notes added or modified |
| `profile_updated` | Any profile field changed |
| `archived` | Beneficiary soft-deleted |
| `restored` | Archived beneficiary reactivated |

Each log entry captures: action type, details, user who performed it, and timestamp.

---

## 4. Technology Stack

### Frontend

```
├── Next.js 15.2.8           # React framework — App Router, SSR/SSG
├── React 19                 # UI component library
├── TypeScript 5             # Static type checking
├── Tailwind CSS 3.4         # Utility-first CSS framework
├── Shadcn/UI (Radix UI)     # Accessible, unstyled component primitives
├── React Hook Form 7.5      # Performant form state management
├── Zod 3.24                 # TypeScript-first schema validation
├── Recharts 2.x             # Chart and data visualization
├── Lucide React 0.454       # SVG icon library (300+ icons)
├── Sonner                   # Toast notification system
├── next-themes              # Dark/light mode provider
├── clsx                     # Conditional className utility
├── tailwind-merge           # Tailwind class conflict resolver
└── class-variance-authority # Component variant management
```

### Backend & Services

```
├── Firebase Firestore       # NoSQL real-time cloud database
├── Firebase Authentication  # Google OAuth 2.0
├── Firebase Storage         # File and image storage
└── Vercel                   # Recommended deployment platform
```

### Build & Development Tools

```
├── TypeScript 5             # Strict type checking
├── ESLint                   # Code quality linting
├── PostCSS                  # CSS processing
├── Autoprefixer             # Browser compatibility
└── pnpm                     # Fast, efficient package manager
```

---

## 5. Architecture

### App Structure (Next.js 15 App Router)

```
DMS/
├── app/                              # Next.js App Router
│   ├── page.tsx                      # Landing / Sign-in page
│   ├── layout.tsx                    # Root layout — ThemeProvider + ServiceWorker
│   ├── error.tsx                     # Global error boundary
│   ├── not-found.tsx                 # 404 page
│   ├── loading.tsx                   # Global loading state
│   ├── offline/
│   │   └── page.tsx                  # PWA offline fallback
│   ├── admin/                        # 🔒 Admin-only routes
│   │   ├── page.tsx                  # Admin system dashboard
│   │   ├── layout.tsx                # Admin layout with sidebar
│   │   ├── users/page.tsx            # User management
│   │   ├── beneficiaries/page.tsx    # All beneficiaries (system-wide)
│   │   ├── analytics/
│   │   │   ├── beneficiaries/        # Beneficiary analytics
│   │   │   ├── preachers/            # Preacher performance
│   │   │   └── activities/           # Activity analytics
│   │   └── activities/
│   │       ├── page.tsx
│   │       ├── maqari/page.tsx
│   │       ├── events/page.tsx
│   │       ├── lessons/page.tsx
│   │       └── sections/page.tsx
│   └── dashboard/                    # 🔒 Preacher routes
│       ├── page.tsx                  # Personal dashboard
│       ├── layout.tsx                # Dashboard layout with sidebar
│       ├── beneficiaries/page.tsx    # My assigned beneficiaries
│       ├── maqari/page.tsx           # My Maqara'a
│       └── activities/
│           ├── page.tsx
│           ├── maqari/page.tsx
│           ├── events/page.tsx
│           ├── lessons/page.tsx
│           └── sections/page.tsx
│
├── components/                       # Reusable React components
│   ├── ui/                           # 30+ Shadcn/UI components
│   ├── auth/                         # Auth guard, sign-in, admin setup
│   ├── beneficiaries/                # Full beneficiary management suite
│   │   ├── all-beneficiaries.tsx
│   │   ├── add-beneficiary-dialog.tsx
│   │   ├── edit-beneficiary-dialog.tsx
│   │   ├── transfer-beneficiary-dialog.tsx
│   │   ├── beneficiary-details-dialog.tsx
│   │   ├── contact-import-dialog.tsx  # ⭐ Advanced bulk import
│   │   └── data-health-check.tsx      # ⭐ Data quality tool
│   ├── activities/                    # Activity management suite
│   │   ├── all-activities.tsx
│   │   ├── activity-list.tsx
│   │   ├── activities-overview.tsx
│   │   ├── create-activity-dialog.tsx
│   │   ├── attendance-dialog.tsx
│   │   ├── view-attendees-dialog.tsx
│   │   └── my-maqari.tsx
│   ├── admin/                         # Admin-specific components
│   │   ├── admin-sidebar.tsx
│   │   ├── dashboard-stats.tsx
│   │   └── charts/
│   │       ├── activity-engagement-chart.tsx
│   │       ├── preacher-performance-chart.tsx
│   │       ├── attendance-trend-chart.tsx
│   │       ├── inactive-beneficiaries.tsx
│   │       ├── stage-distribution-chart.tsx
│   │       └── growth-chart.tsx
│   ├── preacher/                      # Preacher dashboard components
│   │   ├── preacher-sidebar.tsx
│   │   ├── my-beneficiaries.tsx
│   │   └── preacher-stats.tsx
│   ├── theme-provider.tsx             # next-themes dark mode provider
│   └── service-worker-register.tsx    # PWA service worker registration
│
├── hooks/                            # Custom React hooks
│   ├── use-auth.tsx                  # Firebase auth state + methods
│   ├── use-dashboard-data.ts         # Role-filtered dashboard data
│   └── use-mobile.tsx                # Mobile viewport detection
│
├── lib/                              # Utilities & configuration
│   ├── firebase.ts                   # Firebase app initialization
│   ├── firestore-collections.ts      # Types, schemas, collection refs
│   ├── auth-utils.ts                 # Auth helper functions
│   └── utils.ts                      # General utilities (cn, etc.)
│
├── public/                           # Static assets
│   ├── manifest.json                 # PWA web app manifest
│   ├── sw.js                         # Service worker
│   └── [icons...]                    # App icons — multiple resolutions
│
├── middleware.ts                     # Next.js server-side route protection
├── next.config.mjs                   # Next.js configuration
├── tailwind.config.ts                # Tailwind customization
├── tsconfig.json                     # TypeScript configuration
├── package.json                      # Dependencies and scripts
└── README.md                         # This file
```

### Data Flow Architecture

```
User Browser
      │
      ▼
┌─────────────────────────┐
│     Next.js App         │
├─────────────────────────┤
│  Pages (App Router)     │
│  React Components       │
│  Custom Hooks           │
│  Auth Guard / Middleware│
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│     Firebase SDK        │
├─────────────────────────┤
│  Auth (Google OAuth)    │
│  Firestore (Database)   │
│  Storage (Files)        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Firebase Cloud        │
├─────────────────────────┤
│  Authentication Server  │
│  Firestore Database     │
│  Cloud Storage          │
└─────────────────────────┘
```

---

## 6. Database Structure

### Collections Overview

| Collection | Purpose | Key Relationship |
|-----------|---------|-----------------|
| `preachers` | All registered users and roles | Root entity |
| `beneficiaries` | All individuals being mentored | Belongs to a preacher |
| `maqari` | Maqra'a activity records | Created by a preacher |
| `events` | Event activity records | Created by a preacher |
| `lessons` | Lesson activity records | Created by a preacher |
| `sections` | Section activity records | Created by a preacher |
| `attendance` | Attendance per activity | Links beneficiary ↔ activity |
| `progress_logs` | Full audit trail of changes | Belongs to a beneficiary |

---

### Collection 1: `preachers`

```typescript
{
  id:         string      // Firebase Auth UID (used as document ID)
  name:       string      // Display name from Google account
  email:      string      // Google account email (unique)
  role:       "admin" | "da'i" | "pending"
  created_at: Timestamp   // First login / profile creation date
}
```

---

### Collection 2: `beneficiaries`

```typescript
{
  id:           string       // Auto-generated Firestore ID
  name:         string       // Full name
  phone:        string       // Egyptian format: 01X XXXXXXXX
  da_i_id:      string       // Assigned preacher UID
  batch?:       string       // Optional batch/cohort group
  da_wa_stage:  DawaStage    // Spiritual development stage
  notes?:       string       // Personal notes or remarks
  created_at:   Timestamp    // Record creation timestamp

  // Soft Delete
  deleted?:     boolean      // true = archived
  deletedAt?:   Timestamp    // When it was archived
}

// DawaStage type
type DawaStage =
  | "New Contact"
  | "Initial Interest"
  | "Regular Attendance"
  | "Committed Learner"
```

**Recommended Firestore Indexes**:

| Fields | Order | Use Case |
|--------|-------|---------|
| `da_i_id`, `created_at` | Asc, Desc | Filter by preacher |
| `deleted`, `created_at` | Asc, Desc | Archive list queries |
| `da_wa_stage`, `created_at` | Asc, Desc | Stage filtering |
| `phone` | Asc | Duplicate detection |

---

### Collection 3: `activities` (4 sub-collections)

Stored in separate collections: `maqari`, `events`, `lessons`, `sections`

```typescript
{
  id:            string       // Auto-generated
  name:          string       // Activity name/title
  type:          ActivityType // Auto-set by the app
  creator_id:    string       // UID of creating preacher
  creator_name:  string       // Cached display name
  created_at:    Timestamp    // Creation timestamp
  event_date?:   Timestamp    // Optional: when activity occurs
  description?:  string       // Optional: activity details
  batch?:        string       // Optional: associated group
}

// ActivityType
type ActivityType =
  | "maqra'a"
  | "event"
  | "lesson"
  | "section"
```

---

### Collection 4: `attendance`

```typescript
{
  id:                string     // Auto-generated
  activity_id:       string     // Reference to activity document
  activity_name:     string     // Cached (denormalized for display)
  activity_type:     string     // Cached (denormalized for display)
  beneficiary_id:    string     // Reference to beneficiary
  beneficiary_name:  string     // Cached (denormalized for display)
  present:           boolean    // true = attended | false = absent
  logged_by_id:      string     // UID of preacher who logged this
  logged_by_name:    string     // Cached display name
  logged_at:         Timestamp  // When attendance was recorded
}
```

**Recommended Firestore Indexes**:

| Fields | Order | Use Case |
|--------|-------|---------|
| `activity_id`, `logged_at` | Asc, Desc | Attendance per activity |
| `beneficiary_id`, `logged_at` | Asc, Desc | Beneficiary history |

---

### Collection 5: `progress_logs`

```typescript
{
  id:                 string     // Auto-generated
  beneficiary_id:     string     // Affected beneficiary
  action:             string     // Type of change (see below)
  details:            string     // Human-readable description
  performed_by:       string     // UID of user who made the change
  performed_by_name:  string     // Cached display name
  timestamp:          Timestamp  // Exact time of change
}

// Action values
type Action =
  | "transfer"         // Reassigned to different preacher
  | "stage_change"     // Da'wa stage updated
  | "note_added"       // Notes added or edited
  | "profile_updated"  // Profile fields changed
  | "archived"         // Beneficiary soft-deleted
  | "restored"         // Archived record reactivated
```

---

### Data Relationships

```
Preachers (1)
    │
    ├──────────────→ Beneficiaries (Many)
    │                       │
    │                       ├──────→ Attendance Records (Many)
    │                       │
    │                       └──────→ Progress Logs (Many)
    │
    └──────────────→ Activities (Many)
                            │
                            └──────→ Attendance Records (Many)
```

---

## 7. Installation & Setup

### Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | v18.0.0+ | [Download here](https://nodejs.org/) |
| npm or pnpm | Latest | pnpm recommended for speed |
| Git | Any | For version control |
| Firebase Account | — | With Google Auth + Firestore enabled |
| Modern Browser | — | Chrome, Firefox, Edge, Safari |

---

### Step 1: Clone Repository

```bash
git clone https://github.com/Omarzcode/DMS.git
cd DMS
```

---

### Step 2: Install Dependencies

```bash
# Using npm
npm install

# OR using pnpm (recommended — faster)
pnpm install
```

---

### Step 3: Configure Firebase

1. Go to [firebase.google.com](https://firebase.google.com) and create a project
2. Enable **Google Authentication** in Firebase Console → Authentication → Sign-in method
3. Create a **Firestore database** in production mode
4. Go to **Project Settings** → Your apps → Web app → copy config

---

### Step 4: Create Environment File

Create `.env.local` in the project root:

```env
# ─── Firebase Configuration (Required) ───────────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# ─── Admin Configuration (Required) ──────────────────────────────
# This email will automatically receive admin role on first login
NEXT_PUBLIC_INITIAL_ADMIN_EMAIL=admin@yourdomain.com
```

> ⚠️ **Important**: Never commit `.env.local` to version control.
> Add it to `.gitignore` immediately.

> ℹ️ All `NEXT_PUBLIC_` variables are **exposed to the browser**.
> Never store private secrets with this prefix.

---

### Step 5: Set Up Firestore Security Rules

In Firebase Console → Firestore → Rules, apply the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: fetch user role from Firestore
    function getUserRole() {
      return get(/databases/$(database)/documents/preachers/$(request.auth.uid)).data.role;
    }
    function isAdmin() {
      return request.auth != null && getUserRole() == 'admin';
    }
    function isPreacher() {
      return request.auth != null && getUserRole() == "da'i";
    }
    function isAuthenticated() {
      return request.auth != null;
    }

    // Preachers collection
    match /preachers/{userId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin() || request.auth.uid == userId;
    }

    // Beneficiaries
    match /beneficiaries/{docId} {
      allow read: if isAdmin() ||
        (isPreacher() && resource.data.da_i_id == request.auth.uid);
      allow write: if isAdmin() || isPreacher();
    }

    // Activities (maqari, events, lessons, sections)
    match /maqari/{docId}   { allow read: if isAuthenticated(); allow write: if isAdmin() || isPreacher(); }
    match /events/{docId}   { allow read: if isAuthenticated(); allow write: if isAdmin() || isPreacher(); }
    match /lessons/{docId}  { allow read: if isAuthenticated(); allow write: if isAdmin() || isPreacher(); }
    match /sections/{docId} { allow read: if isAuthenticated(); allow write: if isAdmin() || isPreacher(); }

    // Attendance
    match /attendance/{docId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin() || isPreacher();
    }

    // Progress logs (audit trail)
    match /progress_logs/{docId} {
      allow read: if isAdmin() ||
        (isPreacher() && resource.data.performed_by == request.auth.uid);
      allow write: if isAdmin() || isPreacher();
    }
  }
}
```

---

### Step 6: Create Firestore Indexes

In Firebase Console → Firestore → Indexes, create the following
**composite indexes**:

**beneficiaries collection**:
```
da_i_id (Asc) + created_at (Desc)
deleted (Asc)  + created_at (Desc)
da_wa_stage (Asc) + created_at (Desc)
```

**attendance collection**:
```
activity_id (Asc) + logged_at (Desc)
beneficiary_id (Asc) + logged_at (Desc)
```

**maqari / events / lessons / sections collections**:
```
creator_id (Asc) + created_at (Desc)
```

---

### Step 7: Run Development Server

```bash
npm run dev
```

Open your browser at:
```
http://localhost:5000
```

---

## 8. Development

### Available Commands

```bash
# Start development server with hot reload (port 5000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run ESLint code quality checks
npm run lint
```

### Development Features

- **Hot Module Replacement** — Changes instantly reflected in browser
- **TypeScript Strict Mode** — Full type safety throughout codebase
- **ESLint** — Code quality and style enforcement
- **Source Maps** — Easy debugging in browser DevTools

### Code Style Guidelines

| Rule | Details |
|------|---------|
| **File extensions** | `.ts` for logic, `.tsx` for components |
| **Components** | Functional components with hooks only |
| **Naming** | camelCase for functions/variables, PascalCase for components |
| **Imports** | External libraries first, then internal modules |
| **Comments** | JSDoc for complex functions and hooks |
| **No console.log** | Remove all debug logs before committing |

### Firebase Emulator (Optional)

For local Firebase testing without touching the live database:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Start emulator suite
firebase emulators:start
```

Then update `lib/firebase.ts` to connect to the local emulator endpoints.

---

## 9. Deployment

### Vercel (Recommended)

Vercel is the native deployment platform for Next.js:

**Option A — GitHub Integration (Recommended)**:
1. Go to [vercel.com](https://vercel.com) → New Project
2. Import `https://github.com/Omarzcode/DMS`
3. Add all environment variables from `.env.local` in Vercel project settings
4. Click Deploy — auto-deploys on every push to `main`

**Option B — CLI**:
```bash
npm install -g vercel
vercel --prod
```

---

### Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and initialize
firebase login
firebase init hosting

# Build and deploy
npm run build
firebase deploy --only hosting
```

---

### Docker

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
# Build image
docker build -t dms .

# Run container
docker run -p 5000:5000 --env-file .env.local dms
```

---

## 10. Authentication & Authorization

### Google OAuth Sign-In Flow

```
1. User clicks "Sign In with Google"
          ↓
2. Google OAuth 2.0 consent screen shown
          ↓
3. User grants permissions
          ↓
4. Firebase handles secure token exchange
          ↓
5. User profile auto-created in Firestore
   (preachers collection, role = "pending")
          ↓
6. If email matches NEXT_PUBLIC_INITIAL_ADMIN_EMAIL
   → role set to "admin" automatically
          ↓
7. Auto-redirect based on assigned role:
   admin   → /admin
   da'i    → /dashboard
   pending → /
```

### Role-Based Access Control

| Role | How Assigned | Routes | Data Scope |
|------|-------------|--------|-----------|
| **Admin** | Auto (initial email) or promoted by admin | `/admin/*` | All data system-wide |
| **Da'i** | Admin approval from pending | `/dashboard/*` | Own data only |
| **Pending** | Default for all new users | `/` | No data access |

### Session Security

| Feature | Implementation |
|---------|---------------|
| Token Storage | Firebase SDK — browser-secure storage |
| Auto-Refresh | Tokens refreshed before expiration automatically |
| Logout | Full session cleanup — tokens and local data cleared |
| Persistence | Login persists across browser sessions |
| Server Protection | `middleware.ts` checks session on every request |
| Component Protection | `<AuthGuard>` double-checks at component level |

---

## 11. PWA & Offline Support

### Service Worker (`public/sw.js`)

| Property | Value |
|----------|-------|
| Strategy | Network-first with offline fallback |
| Offline Page | `/offline` |
| Cached | App shell, manifest, icons, static files |
| Not Cached | Firebase/Auth requests, API calls, Next.js chunks |

### Offline Capabilities

| Feature | Available Offline? |
|---------|:-----------------:|
| View cached pages | ✅ |
| Navigate between pages | ✅ |
| Previously loaded data | ✅ (from cache) |
| Create new records | ❌ |
| Real-time sync | ❌ |
| Firebase Authentication | ❌ |
| File uploads | ❌ |

### Installation by Platform

| Platform | Method |
|----------|--------|
| **Android** | Browser menu → "Add to Home Screen" |
| **iOS 16.4+** | Share button → "Add to Home Screen" |
| **Chrome Desktop** | Install icon in address bar |
| **Edge Desktop** | Settings → "Install this site as an app" |

> ℹ️ **iOS Note**: Full PWA support (including background sync and push
> notifications) requires iOS 16.4 or higher. Older iOS versions support
> basic installation but with limited offline functionality.

---

## 12. Configuration

### Environment Variables Reference

| Variable | Required | Description |
|----------|:--------:|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | ✅ | Firebase project API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | ✅ | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ✅ | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | ✅ | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ✅ | Firebase sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ✅ | Firebase app ID |
| `NEXT_PUBLIC_INITIAL_ADMIN_EMAIL` | ✅ | Email that auto-gets admin role |

> All variables are prefixed with `NEXT_PUBLIC_` because they are
> consumed client-side by the Firebase SDK in the browser.
> No secret server-side keys are required for this application.

### next.config.mjs

Key configuration options:

```javascript
// next.config.mjs
const nextConfig = {
  // Images
  images: { unoptimized: true },  // For self-hosted / Firebase hosting

  // ESLint: set to false for strict builds
  eslint: { ignoreDuringBuilds: true },

  // TypeScript: set to false for strict builds
  typescript: { ignoreBuildErrors: true },
}
```

---

## 13. Project Structure

### How to Navigate the Codebase

**Adding a new feature**:
1. Create UI component in `components/[feature]/`
2. Add business logic in `hooks/`
3. Update data schema in `lib/firestore-collections.ts`
4. Add route page in `app/`

**Fixing a bug**:
1. Check browser console for error details
2. Locate component in `components/`
3. Review Firestore security rules if permission-related
4. Check `lib/auth-utils.ts` for authentication issues

**Investigating data issues**:
1. Review schemas in `lib/firestore-collections.ts`
2. Run the Data Health Check tool in the admin panel
3. Check `progress_logs` collection for change history

---

## 14. Component Library

### Available UI Components (30+)

**Form Components**:

| Component | Purpose |
|-----------|---------|
| `Input` | Text input fields |
| `Textarea` | Multi-line text entry |
| `Label` | Accessible form labels |
| `Select` | Dropdown selections |
| `Checkbox` | Boolean toggles |
| `Calendar` | Date picker |

**Layout Components**:

| Component | Purpose |
|-----------|---------|
| `Card` | Content containers |
| `Dialog` | Desktop modal dialogs |
| `AlertDialog` | Confirmation modals (danger-aware) |
| `Sheet` | Mobile slide-out drawer |
| `Tabs` | Tabbed content interfaces |
| `Collapsible` | Expandable/collapsible sections |
| `Separator` | Visual dividers |
| `Breadcrumb` | Page location indicator |

**Display Components**:

| Component | Purpose |
|-----------|---------|
| `Table` | Sortable data tables |
| `Badge` | Status and category labels |
| `Avatar` | User profile pictures |
| `Skeleton` | Loading placeholder animations |
| `Progress` | Progress bars |
| `Alert` | Info / warning / error messages |
| `Stats Card` | Metric display cards |
| `Empty State` | Shown when lists have no results |
| `Highlight Text` | Search term highlighting in results |
| `Chart` | Recharts integration wrapper |

**Dialog & Overlay Components**:

| Component | Purpose |
|-----------|---------|
| `Confirm Dialog` | Generic yes/no confirmation |
| `Logout Dialog` | Confirm logout with cleanup |
| `Popover` | Floating contextual panels |
| `Tooltip` | Hover information tooltips |

**All components are**:
- ✅ Fully typed with TypeScript
- ✅ Accessible (WCAG 2.1 AA)
- ✅ Dark mode supported
- ✅ Responsive by default

---

## 15. Performance Optimizations

### Code & Bundle

| Optimization | Description |
|-------------|-------------|
| Route-based code splitting | Each route loaded separately on demand |
| Tree shaking | Unused code removed at build time |
| Dynamic imports | Heavy components loaded lazily |
| Bundle minification | Production builds compressed |
| SVG icons | Lucide React uses SVG — no large image files |

### Database

| Optimization | Description |
|-------------|-------------|
| Indexed queries | All filtered queries use Firestore composite indexes |
| Batch writes | Bulk operations use Firestore batches (max 500/batch) |
| Denormalization | Frequently-displayed names cached in documents |
| Pagination | Large lists paginated — never loads all records |
| Soft delete isolation | Archived records filtered at query level |
| Role-filtered queries | Preachers only query their own data — not all data |

### Data Loading Strategy

The app uses a **load-once + manual refresh** pattern instead of real-time
Firestore listeners:

```
Reason: Real-time listeners on large collections
increase Firebase billing significantly.

Strategy: Data loads on page mount,
user can manually refresh with a button.
```

---

## 16. Browser Support

### Supported Browsers

| Browser | Minimum Version |
|---------|:--------------:|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |
| Opera | 76+ |
| Samsung Internet | 14+ |

### PWA Support by Platform

| Platform | PWA Level | Notes |
|----------|-----------|-------|
| Android 8+ | ✅ Full | Install, offline, background sync |
| iOS 16.4+ | ✅ Good | Install + basic offline support |
| iOS < 16.4 | ⚠️ Partial | Web view only, no background sync |
| Chrome Desktop | ✅ Full | Install as standalone app |
| Edge Desktop | ✅ Full | Install as standalone app |

---

## 17. Contributing

### Development Process

1. **Fork the Repository**
   ```bash
   git clone https://github.com/Omarzcode/DMS.git
   ```

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Your Changes**
   - Follow code style guidelines
   - Test your changes manually
   - Update documentation if needed

4. **Commit Your Changes** — Follow conventional commits:
   ```bash
   git commit -m "feat: add bulk transfer confirmation dialog"
   ```

5. **Push and Open a Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Message Convention

| Prefix | Use For |
|--------|---------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation update |
| `style:` | Code formatting (no logic change) |
| `refactor:` | Code restructure without new features |
| `test:` | Adding or updating tests |
| `chore:` | Dependencies, config, tooling |

### PR Checklist

Before submitting a pull request:

- [ ] Code follows TypeScript strict mode
- [ ] No `console.log` statements left in code
- [ ] All components properly typed
- [ ] Changes tested manually in both dark and light mode
- [ ] Mobile view tested (< 640px)
- [ ] No breaking changes to existing features
- [ ] Documentation updated if applicable
- [ ] Environment variables documented if new ones added

### Contributor Graph

<p align="left">
  <a href="https://github.com/Omarzcode/DMS/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=Omarzcode/DMS" />
  </a>
</p>

---

## 18. Troubleshooting

### Common Issues & Solutions

#### 🔴 Firebase Authentication Failing
**Symptom**: "Failed to sign in with Google" error

**Solutions**:
- Verify Firebase project settings are correct in `.env.local`
- Check that Google OAuth redirect URIs include your domain in Firebase Console
- Clear browser cookies and cache, then retry
- Confirm `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` matches your Firebase project

---

#### 🔴 Firestore Permission Denied
**Symptom**: `FirebaseError: Missing or insufficient permissions`

**Solutions**:
- Ensure user is fully authenticated before making requests
- Re-check Firestore Security Rules (see [Step 5](#step-5-set-up-firestore-security-rules))
- Confirm composite indexes are created (see [Step 6](#step-6-create-firestore-indexes))
- Check that the user's role in `preachers` collection is `da'i` or `admin`

---

#### 🔴 Infinite Redirect Loop
**Symptom**: Browser keeps redirecting between pages endlessly

**Solutions**:
- Clear `localStorage`: open DevTools Console → type `localStorage.clear()`
- Clear browser cookies for the domain
- Confirm `AuthGuard` is wrapping the correct pages with the correct role
- Verify Firebase Auth is initialized before routes are rendered

---

#### 🔴 Service Worker Not Working Offline
**Symptom**: App shows error page instead of offline fallback

**Solutions**:
- Verify `public/sw.js` file exists in your build output
- Check browser console for service worker registration errors
- Clear service worker cache: DevTools → Application → Storage → Clear site data
- Hard refresh page after deployment: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)

---

#### 🔴 Bulk Import Failing
**Symptom**: CSV or VCard import not processing correctly

**Solutions**:
- Confirm file format is `.csv` or `.vcf` (not `.xlsx`)
- Check file size is under 10 MB
- For CSV: ensure phone column contains Egyptian numbers (01X format or 002/+20 prefix)
- Check browser console for specific row-level errors
- Verify Firestore write quota has not been exceeded

---

#### 🔴 Slow Loading / Performance Issues
**Symptom**: Pages take a long time to load

**Solutions**:
- Check Firebase Console → Usage for quota or slow query alerts
- Verify all composite Firestore indexes are created
- Open Chrome DevTools → Network tab and look for slow Firestore requests
- Run Lighthouse audit: DevTools → Lighthouse → Generate report
- Check for N+1 query problems in `useDashboardData` hook

---

### Enable Debug Logging

For detailed Firebase debugging in the browser console:

```javascript
// Run in browser DevTools console

// Firebase Auth debug
import { connectAuthEmulator } from "firebase/auth"
// or simply watch:
firebase.auth().onAuthStateChanged(user => console.log("Auth state:", user))
```

---

### Getting Help

| Channel | Link |
|---------|------|
| 🐛 Bug Reports | [GitHub Issues](https://github.com/Omarzcode/DMS/issues) |
| 💬 Discussions | [GitHub Discussions](https://github.com/Omarzcode/DMS/discussions) |
| 📧 Email | support@example.com |
| 📱 Mobile Issues | Email with device model + OS version |

---

## 19. License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2024 Omar — @Omarzcode

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the "Software"),
to deal in the Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, sublicense,
and/or sell copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
```

See the [LICENSE](./LICENSE) file for the full license text.

---

## 20. Acknowledgments

| Resource | Use |
|----------|-----|
| [Next.js](https://nextjs.org/) | Core framework — App Router |
| [Firebase](https://firebase.google.com/) | Auth, database, and storage |
| [Shadcn/UI](https://ui.shadcn.com/) | Component library built on Radix UI |
| [Tailwind CSS](https://tailwindcss.com/) | Utility-first styling |
| [Recharts](https://recharts.org/) | Chart and data visualization |
| [Lucide React](https://lucide.dev/) | SVG icon library |
| [next-themes](https://github.com/pacocoursey/next-themes) | Dark/light mode management |
| [Sonner](https://sonner.emilkowal.ski/) | Toast notification system |
| [Zod](https://zod.dev/) | Schema validation |
| [React Hook Form](https://react-hook-form.com/) | Form state management |

---

## Additional Resources

| Topic | Link |
|-------|------|
| Next.js 15 Docs | [nextjs.org/docs](https://nextjs.org/docs) |
| Firebase Docs | [firebase.google.com/docs](https://firebase.google.com/docs) |
| Shadcn/UI | [ui.shadcn.com](https://ui.shadcn.com) |
| Tailwind CSS | [tailwindcss.com/docs](https://tailwindcss.com/docs) |
| TypeScript Handbook | [typescriptlang.org/docs](https://www.typescriptlang.org/docs) |
| Vercel Deployment | [vercel.com/docs](https://vercel.com/docs/frameworks/nextjs) |
| Firestore Best Practices | [Firebase Docs](https://firebase.google.com/docs/firestore/best-practices) |

---

<div align="center">

**Version**: 1.0.0 &nbsp;|&nbsp;
**Last Updated**: 2024 &nbsp;|&nbsp;
**Maintained by**: [Omar — @Omarzcode](https://github.com/Omarzcode)
```
