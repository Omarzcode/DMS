"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Users, BarChart3, Calendar, BookOpen, LogIn, Sparkles, TrendingUp, Shield, Heart, Clock } from "lucide-react"
import { AdminSetupNotice } from "@/components/auth/admin-setup-notice"

export default function HomePage() {
  const { user, userRole, loading, signInWithGoogle, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // This effect handles automatic redirection for logged-in and approved users.
    if (!loading && user) {
      if (userRole === 'admin') {
        router.replace('/admin');
      } else if (userRole === 'da\'i') {
        router.replace('/dashboard');
      }
    }
  }, [user, userRole, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
        <div className="flex items-center gap-3 animate-fade-in">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <span className="text-lg font-medium text-muted-foreground">جاري التحميل...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
        {/* Header */}
        <header className="container mx-auto px-4 py-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center justify-center gap-3">
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-bg-primary shadow-lg">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 h-4 w-4 gradient-bg-secondary rounded-full flex items-center justify-center">
                  <Sparkles className="h-2 w-2 text-white" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold gradient-text-primary">نظام إدارة الدعوة</span>
                <span className="text-sm text-muted-foreground">منصة متطورة لإدارة الأنشطة الدعوية</span>
              </div>
            </div>
            <Button 
              onClick={signInWithGoogle} 
              className="gradient-bg-primary hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              size="lg"
            >
              <LogIn className="ml-2 h-5 w-5" />
              تسجيل الدخول
            </Button>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex items-center">
          <div className="container mx-auto px-4 py-20">
            <div className="max-w-5xl mx-auto text-center animate-slide-up">
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-8 leading-tight">
                <span className="gradient-text-primary">نظام إدارة</span> <br /> <span className="text-foreground">الدعوة الذكي</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
                حل شامل ومتطور للمنظمات الإسلامية لإدارة الدعاة، وتتبع تقدم المستفيدين، وتحليل فعالية الدعوة 
                بدقة واحترافية مع واجهة عصرية وسهلة الاستخدام.
              </p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (userRole === "pending") {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-4">
            <div className="text-center max-w-md mx-auto px-4 animate-fade-in">
                <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-sm p-8">
                    <Clock className="h-16 w-16 mx-auto mb-6 text-purple-500" />
                    <CardTitle className="text-3xl font-bold mb-4 gradient-text-primary">Account Pending Approval</CardTitle>
                    <CardDescription className="text-lg text-muted-foreground mb-8">
                        Welcome, {user.displayName}! Your account has been created and is currently awaiting approval from an administrator.
                    </CardDescription>
                    <Button 
                        onClick={logout}
                        variant="destructive"
                        size="lg"
                    >
                        <LogOut className="mr-2 h-5 w-5" />
                        Log Out
                    </Button>
                </Card>
            </div>
        </div>
    )
  }

  // Show a loading state while the automatic redirect happens for approved users.
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
        <div className="flex items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            <span className="text-lg font-medium text-muted-foreground">Redirecting to your dashboard...</span>
        </div>
    </div>
  );
}

