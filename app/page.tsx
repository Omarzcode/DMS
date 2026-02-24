"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Loader2,
  Users,
  BarChart3,
  Calendar,
  BookOpen,
  LogIn,
  Sparkles,
  Shield,
  Clock,
  LogOut,
  Mail,
} from "lucide-react"
import { ThemeToggleButton } from "@/components/ui/theme-toggle"

export default function HomePage() {
  const { user, userRole, loading, signInWithGoogle, logout } = useAuth()
  const router = useRouter()
  const [isSigningIn, setIsSigningIn] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      if (userRole === "admin") {
        router.replace("/admin")
      } else if (userRole === "da'i") {
        router.replace("/dashboard")
      }
    }
  }, [user, userRole, loading, router])

  const handleSignIn = async () => {
    setIsSigningIn(true)
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error("Error signing in:", error)
    } finally {
      setIsSigningIn(false)
    }
  }

  // ── Loading State ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 animate-fade-in">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-lg font-medium text-muted-foreground">
            Loading...
          </span>
        </div>
      </div>
    )
  }

  // ── Unauthenticated State ──
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row bg-background overflow-hidden">
        {/* Global Theme Toggle */}
        <div className="fixed top-4 start-4 z-50">
          <ThemeToggleButton />
        </div>

        {/* Left Side - Hero Section */}
        <div className="flex-1 flex flex-col justify-center p-8 lg:p-16 relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-20 right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-accent/15 rounded-full blur-3xl animate-pulse-slower" />

          <div className="relative z-10 max-w-2xl mx-auto lg:mx-0">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-12 animate-fade-in hover:scale-[1.01] transition-transform duration-500">
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl gradient-bg-primary shadow-2xl">
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 h-6 w-6 gradient-bg-secondary rounded-full flex items-center justify-center shadow-lg">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-bold gradient-text-primary">
                  Engineering Management System
                </span>
                <span className="text-sm text-muted-foreground">
                  Advanced platform for managing engineering activities
                </span>
              </div>
            </div>

            {/* Main Heading */}
            <h1 className="text-3xl sm:text-5xl lg:text-7xl font-bold mb-6 leading-tight animate-slide-up">
              <span className="gradient-text-primary">Intelligent</span>
              <br />
              <span className="text-foreground">Business Management</span>
            </h1>

            

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-up">
              <FeatureCard
                icon={<Users className="h-5 w-5" />}
                title="Employee Management"
                description="Comprehensive tracking of all employees"
              />
              <FeatureCard
                icon={<BarChart3 className="h-5 w-5" />}
                title="Advanced Analytics"
                description="Deep insights into business performance"
              />
              <FeatureCard
                icon={<Calendar className="h-5 w-5" />}
                title="Smart Scheduling"
                description="Efficient task organization"
              />
              <FeatureCard
                icon={<Shield className="h-5 w-5" />}
                title="Advanced Security"
                description="Strong data protection"
              />
            </div>
          </div>
        </div>

        {/* Right Side - Sign In Card */}
        <div className="flex-1 flex items-center justify-center p-8 lg:p-16 bg-muted/30 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-2xl border border-border/50 bg-card/90 backdrop-blur-sm animate-fade-in">
            <CardHeader className="space-y-4 text-center pb-8 pt-10">
              <div className="mx-auto w-20 h-20 rounded-full gradient-bg-primary flex items-center justify-center shadow-lg">
                <LogIn className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold gradient-text-primary">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                Sign in to access your control panel
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <Button
                onClick={handleSignIn}
                disabled={isSigningIn}
                aria-label={
                  isSigningIn
                    ? "Signing in"
                    : "Sign in with Google"
                }
                className="w-full h-14 gradient-bg-primary hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-lg font-semibold text-primary-foreground"
                size="lg"
              >
                {isSigningIn ? (
                  <Loader2 className="ml-3 h-6 w-6 animate-spin" />
                ) : (
                  <svg
                    className="ml-3 h-6 w-6"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                {isSigningIn
                  ? "Signing in..."
                  : "Sign in with Google"}
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              {/* Email Login Placeholder */}
              <div className="text-center">
                <Button variant="outline" className="w-full" disabled>
                  <Mail className="ml-2 h-4 w-4" />
                  Sign in with Email
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Coming Soon
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ── Pending Approval State ──
  if (userRole === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        {/* Global Theme Toggle */}
        <div className="fixed top-4 start-4 z-50">
          <ThemeToggleButton />
        </div>

        <Card className="max-w-md w-full shadow-2xl border border-border/50 bg-card/90 backdrop-blur-sm animate-fade-in">
          <CardHeader className="text-center space-y-4 pb-8 pt-10">
            <div className="mx-auto w-20 h-20 rounded-full bg-warning/15 flex items-center justify-center">
              <Clock className="h-10 w-10 text-warning" />
            </div>
            <CardTitle className="text-3xl font-bold gradient-text-primary">
              Pending Review
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Hello {user.displayName}! Your account has been created and is now pending review by the administrator
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={logout}
              variant="destructive"
              size="lg"
              className="w-full h-12"
            >
              <LogOut className="ml-2 h-5 w-5" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Redirecting State ──
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-lg font-medium text-muted-foreground">
          Redirecting to dashboard...
        </span>
      </div>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="group flex items-start gap-3 p-4 rounded-xl bg-card/60 backdrop-blur-sm border border-border/50 shadow-sm hover:shadow-md hover:border-border transition-all duration-300">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-bg-primary shadow-md flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
        <div className="text-white">{icon}</div>
      </div>
      <div className="space-y-1">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors">
          {description}
        </p>
      </div>
    </div>
  )
}
