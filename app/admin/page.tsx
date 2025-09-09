"use client"

import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Users, BarChart3, Calendar, BookOpen, LogIn, Sparkles, TrendingUp, Shield, Heart, Clock, LogOut } from "lucide-react"
import { AdminSetupNotice } from "@/components/auth/admin-setup-notice"

export default function HomePage() {
  const { user, userRole, loading, signInWithGoogle, logout } = useAuth()

  if (loading) { /* ... Loading state ... */ }
  if (!user) { /* ... Landing Page for logged-out users ... */ }

  // ** بداية التعديل: عرض صفحة الانتظار للمستخدمين الجدد **
  if (userRole === "pending") {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-4">
            <div className="text-center max-w-md mx-auto px-4 animate-fade-in">
                <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-sm p-8">
                    <Clock className="h-16 w-16 mx-auto mb-6 text-purple-500" />
                    <CardTitle className="text-3xl font-bold mb-4 gradient-text-primary">Account Pending Approval</CardTitle>
                    <CardDescription className="text-lg text-muted-foreground mb-8">
                        Welcome, {user?.displayName}! Your account has been created and is currently awaiting approval from an administrator.
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

  // Redirect authenticated & approved users to their dashboard
  if (userRole === "admin") { /* ... Admin redirect ... */ }

  return (
    <div>
      {/* Da'i redirect or dashboard content goes here */}
      <h1>Welcome to the Da'i Dashboard</h1>
    </div>
  );
}
