# Engineering Management System (EMS)

## Project Overview
A Next.js 15 + Firebase web application for managing Islamic da'wa preachers (da'is) and their beneficiaries. Features role-based access control with two user roles: `admin` and `da'i` (preacher).

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication
- **UI**: shadcn/ui + Tailwind CSS
- **Charts**: Recharts with ResponsiveContainer
- **Package Manager**: npm (with `--legacy-peer-deps` due to vaul@0.9.x / React 19 conflict)

## Environment Setup
- **Port**: 5000 on 0.0.0.0
- **Firebase API Key**: Replit secret `GOOGLE_API_KEY` mapped to `NEXT_PUBLIC_FIREBASE_API_KEY` in `next.config.mjs` via `env:` block. Do NOT duplicate as a separate env var.
- **Service Worker**: `public/sw.js` excludes `/_next/` assets; cache version `ems-v2`

## Architecture
- `app/` — Next.js App Router pages
  - `app/dashboard/` — Preacher (da'i) portal, includes `layout.tsx` with mobile bottom nav
  - `app/admin/` — Admin portal, includes `layout.tsx` with mobile bottom nav
- `components/preacher/` — Preacher-specific components (sidebar, stats, bottom nav)
- `components/admin/` — Admin-specific components (sidebar, charts, bottom nav)
- `components/beneficiaries/` — Beneficiary management (tables, dialogs)
- `components/activities/` — Activity/maqari management (lists, dialogs)
- `components/ui/` — shadcn/ui base components + custom wrappers

## Key Components

### Mobile Navigation
- `components/preacher/preacher-bottom-nav.tsx` — Fixed bottom nav for mobile (Dashboard, Beneficiaries, Maqari, Activities). Hidden on `md:` and above.
- `components/admin/admin-bottom-nav.tsx` — Fixed bottom nav for mobile (Dashboard, Beneficiaries, Activities, Analytics, Users). Hidden on `md:` and above.
- Both layouts (`app/dashboard/layout.tsx`, `app/admin/layout.tsx`) include the respective bottom nav.
- CSS in `globals.css` adds `padding-bottom: 4.5rem` to `#main-content` (SidebarInset) on mobile to prevent content from being hidden behind the bottom nav.

### Responsive Dialogs
- `components/ui/responsive-dialog.tsx` — Wrapper that renders shadcn `Dialog` on desktop and `Sheet` (bottom slide-up) on mobile using `useIsMobile` hook.
- Applied to all major dialogs:
  - `add-beneficiary-dialog.tsx`
  - `edit-beneficiary-dialog.tsx`
  - `beneficiary-details-dialog.tsx`
  - `transfer-beneficiary-dialog.tsx`
  - `create-activity-dialog.tsx`
  - `attendance-dialog.tsx`
  - `view-attendees-dialog.tsx`

### Sidebar (Desktop Only)
- `components/preacher/preacher-sidebar.tsx` — shadcn Sidebar with collapsible activity sub-menu
- `components/admin/admin-sidebar.tsx` — shadcn Sidebar with analytics and management groups

## User Roles & Routes
- `admin` → `/admin/*`
- `da'i` (preacher) → `/dashboard/*`
- `pending` → blocked at middleware

## Important Notes
- Direction is `ltr` (changed from original RTL in globals.css)
- Font: Geist Sans (changed from Noto Sans Arabic)
- Touch targets: 44px minimum enforced via CSS
- iOS zoom prevention: `font-size: 16px` on inputs in mobile media query
- Charts use `ResponsiveContainer` from recharts throughout
