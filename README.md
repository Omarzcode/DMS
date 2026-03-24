
<p align="center">
    <img src="/public/zeta_dark.png" align="center" width="10%">
</p>

<p align="center">
  <h1 align="center">DMS — Da'wa Management System</h1>
</p>

<p align="center">
  <em>A modern, role-based platform for managing preachers, beneficiaries, and da'wa activities</em>
</p>

<p align="center">
  <img src="https://img.shields.io/github/license/Omarzcode/DMS?style=default&logo=opensourceinitiative&logoColor=white&color=0080ff" alt="license">
  <img src="https://img.shields.io/github/last-commit/Omarzcode/DMS?style=default&logo=git&logoColor=white&color=0080ff" alt="last-commit">
  <img src="https://img.shields.io/github/languages/top/Omarzcode/DMS?style=default&color=0080ff" alt="repo-top-language">
  <img src="https://img.shields.io/github/languages/count/Omarzcode/DMS?style=default&color=0080ff" alt="repo-language-count">
  <img src="https://img.shields.io/badge/PWA-enabled-blue?style=default&logo=pwa&logoColor=white&color=0080ff" alt="pwa">
</p>

<br>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Project Structure](#-project-structure)
  - [Project Index](#-project-index)
- [Getting Started](#-getting-started)
  - [Prerequisites](#-prerequisites)
  - [Installation](#-installation)
  - [Usage](#-usage)
  - [Testing](#-testing)
- [Project Roadmap](#-project-roadmap)
- [Contributing](#-contributing)
- [License](#-license)
- [Acknowledgments](#-acknowledgments)

---

## 🔍 Overview

**DMS (Da'wa Management System)** is a full-stack web application built with **Next.js 14**, **Firebase**, and **TypeScript**. It is designed to help Islamic organizations manage their da'wa operations efficiently — including tracking beneficiaries, organizing activities, monitoring preacher performance, and providing real-time analytics through an intuitive admin dashboard.

The system supports two primary roles:
- 🛡️ **Admin** — Full access to analytics, user management, beneficiaries, and all activities
- 📋 **Preacher (Da'iya)** — Personal dashboard to manage assigned beneficiaries and activities

The app is also a **Progressive Web App (PWA)**, supporting offline access, installability, and mobile-first design.

---

## ✨ Features

- 🔐 **Authentication & Authorization** — Secure sign-in with Firebase Authentication and role-based access control
- 👥 **Beneficiary Management** — Add, edit, transfer, and track beneficiaries with detailed profiles and contact import
- 🕌 **Activity Tracking** — Manage lessons, sections, events, and maqari (study circles) with attendance logging
- 📊 **Admin Analytics Dashboard** — Visual charts for activity engagement, preacher performance, attendance trends, growth, and stage distribution
- 🧑‍💼 **Preacher Portal** — Personal stats, assigned beneficiaries, and maqari management
- 🌙 **Dark / Light Theme** — Full theme toggle support via `next-themes`
- 📱 **PWA Support** — Installable app with service worker for offline functionality
- 🧭 **Responsive Sidebar Navigation** — Mobile-friendly collapsible sidebar
- 🔍 **Data Health Check** — Built-in tools to verify and maintain data integrity
- 📁 **Firebase Storage Integration** — File and image management
- ✅ **Type-Safe Codebase** — Full TypeScript support with ESLint enforcement

---

## 📂 Project Structure

```sh
└── DMS/
    ├── README.md
    ├── app
    │   ├── admin               # Admin dashboard pages (analytics, users, activities, beneficiaries)
    │   ├── dashboard           # Preacher dashboard pages (beneficiaries, activities, maqari)
    │   ├── error.tsx           # Global error boundary
    │   ├── globals.css         # Global styles
    │   ├── layout.tsx          # Root layout with theme provider and service worker
    │   ├── loading.tsx         # Global loading state
    │   ├── not-found.tsx       # 404 page
    │   ├── offline             # Offline fallback page (PWA)
    │   └── page.tsx            # Landing / Sign-in page
    ├── components
    │   ├── activities          # Activity list, overview, creation, attendance dialogs
    │   ├── admin               # Admin sidebar, dashboard stats, analytics charts
    │   ├── auth                # Auth guard, sign-in form, admin management
    │   ├── beneficiaries       # Beneficiary CRUD dialogs, transfer, data health check
    │   ├── preacher            # Preacher sidebar, stats, and beneficiary views
    │   ├── service-worker-register.tsx  # PWA service worker registration
    │   ├── theme-provider.tsx  # next-themes provider wrapper
    │   └── ui                  # Reusable UI components (shadcn/ui based)
    ├── hooks
    │   ├── use-auth.tsx        # Firebase authentication state hook
    │   ├── use-dashboard-data.ts  # Firestore dashboard data fetching hook
    │   └── use-mobile.tsx      # Mobile screen detection hook
    ├── lib
    │   ├── auth-utils.ts       # Role checking and auth helper functions
    │   ├── firebase.ts         # Firebase app initialization and exports
    │   ├── firestore-collections.ts  # Firestore collection references
    │   └── utils.ts            # General utility functions (cn, etc.)
    ├── middleware.ts            # Next.js route protection middleware
    ├── next.config.mjs         # Next.js configuration
    ├── package.json
    ├── postcss.config.mjs
    ├── public
    │   ├── manifest.json       # PWA web app manifest
    │   ├── sw.js               # Service worker for offline support
    │   └── ...                 # App icons and placeholder images
    ├── tailwind.config.ts
    └── tsconfig.json
```

---

### 📁 Project Index

<details open>
  <summary><b><code>DMS/</code></b></summary>

  <details>
    <summary><b>Root Config Files</b></summary>
    <blockquote>
      <table>
        <tr><td><b>next.config.mjs</b></td><td>Next.js configuration including PWA settings and image domains</td></tr>
        <tr><td><b>middleware.ts</b></td><td>Protects routes by checking Firebase auth session before rendering</td></tr>
        <tr><td><b>tailwind.config.ts</b></td><td>Tailwind CSS configuration with custom theme colors and dark mode</td></tr>
        <tr><td><b>tsconfig.json</b></td><td>TypeScript compiler configuration with path aliases</td></tr>
        <tr><td><b>components.json</b></td><td>shadcn/ui component configuration file</td></tr>
        <tr><td><b>postcss.config.mjs</b></td><td>PostCSS configuration for Tailwind processing</td></tr>
        <tr><td><b>package.json</b></td><td>Project dependencies, scripts, and metadata</td></tr>
      </table>
    </blockquote>
  </details>

  <details>
    <summary><b>lib/</b></summary>
    <blockquote>
      <table>
        <tr><td><b>firebase.ts</b></td><td>Initializes Firebase app with Auth, Firestore, and Storage services</td></tr>
        <tr><td><b>firestore-collections.ts</b></td><td>Centralized Firestore collection and document references</td></tr>
        <tr><td><b>auth-utils.ts</b></td><td>Helper functions for role validation (isAdmin, isPreacher)</td></tr>
        <tr><td><b>utils.ts</b></td><td>Shared utilities including the `cn()` class merging function</td></tr>
      </table>
    </blockquote>
  </details>

  <details>
    <summary><b>hooks/</b></summary>
    <blockquote>
      <table>
        <tr><td><b>use-auth.tsx</b></td><td>Custom hook providing current user, role, and auth loading state</td></tr>
        <tr><td><b>use-dashboard-data.ts</b></td><td>Fetches and returns preacher-specific dashboard data from Firestore</td></tr>
        <tr><td><b>use-mobile.tsx</b></td><td>Detects mobile viewport for responsive sidebar behavior</td></tr>
      </table>
    </blockquote>
  </details>

  <details>
    <summary><b>components/auth/</b></summary>
    <blockquote>
      <table>
        <tr><td><b>auth-guard.tsx</b></td><td>Wraps pages to block unauthenticated or unauthorized access</td></tr>
        <tr><td><b>sign-in-form.tsx</b></td><td>Email/password sign-in form with Firebase Authentication</td></tr>
        <tr><td><b>admin-management.tsx</b></td><td>Interface for admins to manage user roles</td></tr>
        <tr><td><b>admin-setup-notice.tsx</b></td><td>First-time setup notice for initial admin configuration</td></tr>
      </table>
    </blockquote>
  </details>

  <details>
    <summary><b>components/admin/charts/</b></summary>
    <blockquote>
      <table>
        <tr><td><b>activity-engagement-chart.tsx</b></td><td>Chart showing engagement rates across different activity types</td></tr>
        <tr><td><b>preacher-performance-chart.tsx</b></td><td>Comparative bar chart of preacher performance metrics</td></tr>
        <tr><td><b>attendance-trend-chart.tsx</b></td><td>Line chart tracking attendance trends over time</td></tr>
        <tr><td><b>inactive-beneficiaries.tsx</b></td><td>Highlights beneficiaries with no recent activity</td></tr>
        <tr><td><b>stage-distribution-chart.tsx</b></td><td>Pie/donut chart showing beneficiary stage distribution</td></tr>
        <tr><td><b>growth-chart.tsx</b></td><td>Growth chart for beneficiaries and activities over time</td></tr>
      </table>
    </blockquote>
  </details>

  <details>
    <summary><b>public/</b></summary>
    <blockquote>
      <table>
        <tr><td><b>manifest.json</b></td><td>PWA manifest defining app name, icons, theme color, and display mode</td></tr>
        <tr><td><b>sw.js</b></td><td>Service worker handling caching strategies for offline PWA support</td></tr>
      </table>
    </blockquote>
  </details>

</details>

---

## 🚀 Getting Started

### ✅ Prerequisites

Before getting started with DMS, ensure your environment meets the following requirements:

- **Node.js** v18 or higher — [Download](https://nodejs.org/)
- **npm** v9 or higher (comes with Node.js)
- A **Firebase** project with the following services enabled:
  - Authentication (Email/Password)
  - Firestore Database

---

### 📥 Installation

**1. Clone the repository**
```sh
git clone https://github.com/Omarzcode/DMS
```

**2. Navigate to the project directory**
```sh
cd DMS
```

**3. Install dependencies**

Using `npm`:
```sh
npm install
```

**4. Set up environment variables**

Create a `.env.local` file in the root directory:
```sh
cp .env.example .env.local
```

Add your Firebase configuration:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

> ⚠️ **Never commit `.env.local` to version control**

---

### ▶️ Usage

Start the development server:

```sh
npm run dev
```

Open your browser at:
```
http://localhost:3000
```

Build for production:
```sh
npm run build
npm start
```

**User Flow:**
1. Sign in at the landing page
2. Based on your role, you'll be redirected to:
   - 🛡️ `/admin` — Full admin dashboard with analytics and management tools
   - 📋 `/dashboard` — Preacher portal for managing beneficiaries and activities

---

### 🧪 Testing

Run the test suite:

```sh
npm test
```

Run linting:
```sh
npm run lint
```

---

## 🗺️ Project Roadmap

- [x] **`v1.0`** User authentication with role-based access control
- [x] **`v1.1`** Beneficiary management (add, edit, transfer, delete)
- [x] **`v1.2`** Activity management (lessons, events, sections, maqari)
- [x] **`v1.3`** Admin analytics dashboard with interactive charts
- [x] **`v1.4`** PWA support with offline mode
- [x] **`v1.5`** Dark/light theme toggle
- [ ] **`v2.1`** Export reports to PDF / Excel
- [ ] **`v2.2`** Multi-language support (Arabic / English)
- [ ] **`v2.3`** Mobile app wrapper (React Native / Capacitor)

---

## 🤝 Contributing

- **💬 [Join the Discussions](https://github.com/Omarzcode/DMS/discussions)** — Share insights, feedback, or questions
- **🐛 [Report Issues](https://github.com/Omarzcode/DMS/issues)** — Submit bugs or feature requests
- **💡 [Submit Pull Requests](https://github.com/Omarzcode/DMS/blob/main/CONTRIBUTING.md)** — Contribute improvements

<details closed>
<summary>Contributing Guidelines</summary>

1. **Fork the Repository** — Fork the project to your GitHub account
2. **Clone Locally**
   ```sh
   git clone https://github.com/Omarzcode/DMS
   ```
3. **Create a New Branch**
   ```sh
   git checkout -b feature/your-feature-name
   ```
4. **Make Your Changes** — Develop and test your changes locally
5. **Commit Your Changes**
   ```sh
   git commit -m "feat: add your feature description"
   ```
6. **Push to GitHub**
   ```sh
   git push origin feature/your-feature-name
   ```
7. **Submit a Pull Request** — Open a PR with a clear description of your changes
8. **Review** — Wait for review and approval before merging

> Please ensure your code passes `npm run lint` before submitting a PR

</details>

<details closed>
<summary>Contributor Graph</summary>
<br>
<p align="left">
  <a href="https://github.com/Omarzcode/DMS/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=Omarzcode/DMS">
  </a>
</p>
</details>

---

## 📝 License

This project is licensed under the **MIT License**.  
See the [LICENSE](./LICENSE) file for full details.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) — The React framework for production
- [Firebase](https://firebase.google.com/) — Backend-as-a-service for auth, database & storage
- [shadcn/ui](https://ui.shadcn.com/) — Beautifully designed reusable components
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS framework
- [Lucide React](https://lucide.dev/) — Clean and consistent icon library
- [Recharts](https://recharts.org/) — Charting library for React
- [next-themes](https://github.com/pacocoursey/next-themes) — Theme management for Next.js
- All contributors who helped build and improve this project ❤️

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/Omarzcode">Omar</a>
</p>
