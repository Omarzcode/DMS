"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, query } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Users, BarChart3, Calendar, BookOpen, LogIn, Sparkles, TrendingUp, Shield, Heart } from "lucide-react"
import { AdminSetupNotice } from "@/components/auth/admin-setup-notice"

export default function HomePage() {
  const { user, userRole, loading, signInWithGoogle } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
        <div className="flex items-center gap-3 animate-fade-in">
          <div className="relative">
            <Loader2 className="h-8 w-8 animate-spin text-transparent" />
            <div className="absolute inset-0 h-8 w-8 animate-spin gradient-bg-primary rounded-full opacity-20"></div>
            <Loader2 className="absolute inset-0 h-8 w-8 animate-spin gradient-text-primary" />
          </div>
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
          <div className="flex justify-between items-center">
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
              <div className="inline-flex items-center gap-2 gradient-bg-accent text-white px-6 py-3 rounded-full text-sm font-medium mb-8 shadow-lg">
                <Heart className="h-4 w-4" />
                نظام متكامل لإدارة جهودك الدعوية بكفاءة عالية
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
                <span className="gradient-text-primary">نظام إدارة</span>
                <br />
                <span className="text-foreground">الدعوة الذكي</span>
              </h1>
              
              <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
                حل شامل ومتطور للمنظمات الإسلامية لإدارة الدعاة، وتتبع تقدم المستفيدين، وتحليل فعالية الدعوة 
                بدقة واحترافية مع واجهة عصرية وسهلة الاستخدام.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
                <Button
                  onClick={signInWithGoogle}
                  size="lg"
                  className="gradient-bg-primary hover:opacity-90 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 px-8 py-4 text-lg font-medium"
                >
                  <LogIn className="ml-2 h-5 w-5" />
                  ابدأ رحلتك الآن
                </Button>
                
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-300 px-8 py-4 text-lg"
                >
                  <TrendingUp className="ml-2 h-5 w-5" />
                  استكشف المميزات
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
                {[
                  { number: "500+", label: "مستفيد نشط" },
                  { number: "50+", label: "داعية محترف" },
                  { number: "100+", label: "نشاط شهري" },
                  { number: "99%", label: "رضا المستخدمين" }
                ].map((stat, index) => (
                  <div key={index} className="text-center animate-scale-in" style={{ animationDelay: `${index * 0.1}s` }}>
                    <div className="text-2xl font-bold gradient-text-primary">{stat.number}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Features Grid */}
        <section className="bg-gradient-to-br from-white/80 to-purple-50/80 backdrop-blur-sm py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16 animate-fade-in">
              <h2 className="text-4xl font-bold mb-4">
                <span className="gradient-text-primary">مميزات قوية</span> لمساعدتك على النجاح
              </h2>
              <p className="text-xl text-muted-foreground">كل ما تحتاجه لإدارة دعوتك في مكان واحد بتقنية متطورة.</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  icon: Users,
                  title: "إدارة المستفيدين",
                  description: "تتبع وإدارة المستفيدين مع مراقبة تفصيلية لتقدمهم ومراحلهم الدعوية بطريقة ذكية ومنظمة.",
                  gradient: "from-blue-500 to-purple-600"
                },
                {
                  icon: BarChart3,
                  title: "لوحة تحليلات متقدمة",
                  description: "تحليلات وتقارير شاملة مع رسوم بيانية تفاعلية لقياس فعالية الدعوة وتحديد فرص النمو.",
                  gradient: "from-purple-500 to-pink-600"
                },
                {
                  icon: Calendar,
                  title: "تتبع الأنشطة الذكي",
                  description: "إدارة الفعاليات والدروس والمقارئ مع تتبع الحضور ومقاييس التفاعل بشكل تلقائي.",
                  gradient: "from-pink-500 to-orange-600"
                },
                {
                  icon: Shield,
                  title: "نظام صلاحيات آمن",
                  description: "نظام صلاحيات متطور للمديرين والدعاة مع مستويات وصول مناسبة وحماية عالية للبيانات.",
                  gradient: "from-orange-500 to-red-600"
                }
              ].map((feature, index) => (
                <Card 
                  key={index} 
                  className="group hover:shadow-2xl transition-all duration-500 border-0 bg-white/80 backdrop-blur-sm hover:bg-white/90 hover:scale-105 animate-scale-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardHeader className="items-center text-center pb-4">
                    <div className={`p-4 rounded-2xl bg-gradient-to-br ${feature.gradient} shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-600">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-3xl mx-auto animate-fade-in">
              <h2 className="text-4xl font-bold text-white mb-6">
                ابدأ رحلتك في إدارة الدعوة اليوم
              </h2>
              <p className="text-xl text-white/90 mb-8">
                انضم إلى آلاف الدعاة الذين يستخدمون نظامنا لتحقيق نتائج مذهلة في أعمالهم الدعوية
              </p>
              <Button
                onClick={signInWithGoogle}
                size="lg"
                className="bg-white text-purple-600 hover:bg-gray-50 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 px-10 py-4 text-lg font-bold"
              >
                <LogIn className="ml-2 h-5 w-5" />
                ابدأ مجاناً الآن
              </Button>
            </div>
          </div>
        </section>
        
        <footer className="container mx-auto px-4 py-8 text-center text-muted-foreground text-sm border-t border-purple-100">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Heart className="h-4 w-4 text-red-500" />
            <span>صُنع بحب لخدمة الدعوة الإسلامية</span>
          </div>
          <p>© {new Date().getFullYear()} نظام إدارة الدعوة. جميع الحقوق محفوظة.</p>
        </footer>
      </div>
    )
  }

  // Redirect authenticated users to their dashboard
  if (userRole === "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
        <div className="text-center max-w-md mx-auto px-4 animate-fade-in">
          <AdminSetupNotice userEmail={user.email} />
          <div className="gradient-bg-primary p-8 rounded-3xl shadow-2xl text-white mb-6">
            <Shield className="h-16 w-16 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">أهلاً بك أيها المدير!</h2>
            <p className="text-lg opacity-90 mb-6">يتم توجيهك إلى لوحة تحكم المدير المتطورة...</p>
          </div>
          <Button 
            onClick={() => (window.location.href = "/admin")}
            className="gradient-bg-secondary hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            size="lg"
          >
            <BarChart3 className="ml-2 h-5 w-5" />
            اذهب إلى لوحة التحكم الآن
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <div className="text-center animate-fade-in">
        <div className="gradient-bg-primary p-8 rounded-3xl shadow-2xl text-white mb-6">
          <Users className="h-16 w-16 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">أهلاً بك، {user.displayName}!</h2>
          <p className="text-lg opacity-90 mb-6">يتم توجيهك إلى لوحة التحكم الخاصة بك...</p>
        </div>
        <Button 
          onClick={() => (window.location.href = "/dashboard")}
          className="gradient-bg-accent hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          size="lg"
        >
          <Calendar className="ml-2 h-5 w-5" />
          اذهب إلى لوحة التحكم الآن
        </Button>
      </div>
    </div>
  )
}