"use client"

import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Users, BarChart3, Calendar, BookOpen } from "lucide-react"
import { AdminSetupNotice } from "@/components/auth/admin-setup-notice"

export default function HomePage() {
  const { user, userRole, loading, signInWithGoogle } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">Da'wa Management System</h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              A comprehensive CRM solution for Islamic outreach organizations to manage preachers, track beneficiary
              progress, and analyze da'wa effectiveness.
            </p>

            <Button
              onClick={signInWithGoogle}
              size="lg"
              className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-3 text-lg"
            >
              Sign in with Google
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
            <Card className="border-border">
              <CardHeader className="text-center">
                <Users className="h-12 w-12 text-accent mx-auto mb-4" />
                <CardTitle>Beneficiary Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Track and manage beneficiaries with detailed progress monitoring and stage tracking.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="text-center">
                <BarChart3 className="h-12 w-12 text-accent mx-auto mb-4" />
                <CardTitle>Analytics Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Comprehensive analytics and reporting for measuring da'wa effectiveness and growth.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="text-center">
                <Calendar className="h-12 w-12 text-accent mx-auto mb-4" />
                <CardTitle>Activity Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Manage events, lessons, and maqari with attendance tracking and engagement metrics.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="text-center">
                <BookOpen className="h-12 w-12 text-accent mx-auto mb-4" />
                <CardTitle>Role-Based Access</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Secure role-based permissions for admins and preachers with appropriate access levels.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Redirect authenticated users to their dashboard
  if (userRole === "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto px-4">
          <AdminSetupNotice userEmail={user.email} />
          <h2 className="text-2xl font-bold text-foreground mb-4">Welcome, Admin!</h2>
          <p className="text-muted-foreground mb-6">Redirecting to admin dashboard...</p>
          <Button onClick={() => (window.location.href = "/admin")}>Go to Admin Dashboard</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-4">Welcome, {user.displayName}!</h2>
        <p className="text-muted-foreground mb-6">Redirecting to preacher dashboard...</p>
        <Button onClick={() => (window.location.href = "/dashboard")}>Go to Dashboard</Button>
      </div>
    </div>
  )
}
