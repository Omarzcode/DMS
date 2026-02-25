import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { AuthProvider } from "@/hooks/use-auth"
import { Toaster } from "sonner"
import { ThemeProvider } from "next-themes"

export const metadata: Metadata = {
  title: "Engineering Management System",
  description: "Professional CRM for Engineering organizations",
  generator: "theta.app",
  icons: {
    icon: "/zeta.png",
    shortcut: "/zeta.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "Engineering Management System",
    description: "Professional CRM for Engineering organizations",
    type: "website",
    locale: "en_US",
    siteName: "Engineering Management System",
    images: [
      {
        url: "/zeta.png",
        width: 512,
        height: 512,
        alt: "Engineering Management System Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Engineering Management System",
    description: "Professional CRM for Engineering organizations",
    images: ["/zeta.png"],
  },
  manifest: "/manifest.json",
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
      <body
        className={`${GeistSans.variable} ${GeistMono.variable}`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster position="top-center" richColors />
          </AuthProvider>
        </ThemeProvider>
        <noscript>
          <div style={{
            padding: "2rem",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
            direction: "ltr",
          }}>
            Please enable JavaScript to use this application.
          </div>
        </noscript>
      </body>
    </html>
  )
}
