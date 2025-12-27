"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Users, BarChart3, Calendar, BookOpen, LogIn, Sparkles, TrendingUp, Shield, Heart, Clock, LogOut, CheckCircle, Zap } from "lucide-react"

export default function HomePage() {
  const { user, userRole, loading, signInWithGoogle, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br bg-background">
        <div className="flex items-center gap-3 animate-fade-in">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-lg font-medium text-muted-foreground">جاري التحميل...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-br bg-background overflow-hidden">
        {/* Left Side - Hero Section */}
        <div className="flex-1 flex flex-col justify-center p-8 lg:p-16 relative">
          {/* Decorative Elements */}
          <div className="absolute top-20 right-20 w-72 h-72 bg-primary rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-primary rounded-full blur-3xl animate-pulse delay-1000"></div>
          
          <div className="relative z-10 max-w-2xl mx-auto lg:mx-0">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-12 animate-fade-in">
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl gradient-bg-primary shadow-2xl">
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 h-6 w-6 gradient-bg-secondary rounded-full flex items-center justify-center shadow-lg">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-bold gradient-text-primary">نظام إدارة الأعمال</span>
                <span className="text-sm text-muted-foreground">منصة متطورة لإدارة الأنشطة الهندسية</span>
              </div>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl lg:text-7xl font-bold mb-6 leading-tight animate-slide-up">
              <span className="gradient-text-primary">نظام إدارة</span>
              <br />
              <span className="text-foreground">الأعمال الذكي</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-12 leading-relaxed animate-slide-up delay-100">
              حل شامل ومتطور للمنظمات الهندسية لإدارة الموظفون، وتتبع تقدم المستفيدين، وتحليل فعالية الأعمال 
              بدقة واحترافية
            </p>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-up delay-200">
              <FeatureCard 
                icon={<Users className="h-5 w-5" />}
                title="إدارة الموظفين"
                description="تتبع شامل لجميع الموظفين"
              />
              <FeatureCard 
                icon={<BarChart3 className="h-5 w-5" />}
                title="تحليلات متقدمة"
                description="رؤى عميقة لأداء الأعمال"
              />
              <FeatureCard 
                icon={<Calendar className="h-5 w-5" />}
                title="جدولة ذكية"
                description="تنظيم فعال للمهام"
              />
              <FeatureCard 
                icon={<Shield className="h-5 w-5" />}
                title="أمان متقدم"
                description="حماية قوية للبيانات"
              />
            </div>
          </div>
        </div>

        {/* Right Side - Sign In Card */}
        <div className="flex-1 flex items-center justify-center p-8 lg:p-16 bg-white/40 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-2xl border-0 bg-white/90 backdrop-blur-sm animate-fade-in">
            <CardHeader className="space-y-4 text-center pb-8">
              <div className="mx-auto w-20 h-20 rounded-full gradient-bg-primary flex items-center justify-center shadow-lg">
                <LogIn className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold gradient-text-primary">
                مرحباً بك
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                سجل الدخول للوصول إلى لوحة التحكم الخاصة بك
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <Button 
                onClick={signInWithGoogle}
                className="w-full h-14 gradient-bg-primary hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-lg font-semibold"
                size="lg"
              >
                <svg className="ml-3 h-6 w-6" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                تسجيل الدخول بواسطة Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground"></span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-primary border border-border">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    تسجيل الدخول آمن ومشفر بالكامل
                  </p>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-primary border border-border">
                  <Zap className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    وصول سريع إلى جميع الميزات
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (userRole === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br bg-background p-4">
        <Card className="max-w-md w-full shadow-2xl border-0 bg-white/90 backdrop-blur-sm animate-fade-in">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="mx-auto w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center">
              <Clock className="h-10 w-10 text-orange-600" />
            </div>
            <CardTitle className="text-3xl font-bold gradient-text-primary">
              قيد المراجعة
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              مرحباً {user.displayName}! تم إنشاء حسابك وهو الآن قيد المراجعة من قبل المسؤول
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={logout}
              variant="destructive"
              size="lg"
              className="w-full h-12"
            >
              <LogOut className="mr-2 h-5 w-5" />
              تسجيل الخروج
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br bg-background">
      <div className="flex items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-lg font-medium text-muted-foreground">جاري التحويل إلى لوحة التحكم...</span>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-white/50 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-bg-primary shadow-md flex-shrink-0">
        <div className="text-white">{icon}</div>
      </div>
      <div>
        <h3 className="font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}