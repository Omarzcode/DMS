// app/layout.tsx
import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { AuthProvider } from "@/hooks/use-auth"  // ← Real Firebase auth
import { Toaster } from "sonner"
import { ThemeProvider } from "next-themes"
import ServiceWorkerRegister from "@/components/service-worker-register" // ← Add
import { PointerLockFix } from "@/components/ui/pointer-lock-fix"

export const metadata: Metadata = {
  title: "Engineering Management System",
  description: "Professional CRM for Engineering organizations",
  generator: "theta.app",
  icons: {
    icon: "/zeta.png",
    shortcut: "/zeta.png",
    apple: "/apple-icon-180.png",   // ← Fix this path
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EMS",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FDFCF8" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0f08" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PointerLockFix />
          <AuthProvider>
            <ServiceWorkerRegister />
            {children}
            <Toaster position="top-center" richColors />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
  
}