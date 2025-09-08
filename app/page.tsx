"use client"

import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Users, BarChart3, Calendar, BookOpen, LogIn, Sparkles, TrendingUp, Shield, Heart } from "lucide-react"
import { AdminSetupNotice } from "@/components/auth/admin-setup-notice"

export default function HomePage() {
  const { user, userRole, loading, signInWithGoogle } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 px-4">
        <div className="flex items-center gap-3 animate-fade-in">
          <div className="relative">
            <Loader2 className="h-8 w-8 animate-spin text-transparent" />
            <div className="absolute inset-0 h-8 w-8 animate-spin gradient-bg-primary rounded-full opacity-20"></div>
            <Loader2 className="absolute inset-0 h-8 w-8 animate-spin gradient-text-primary" />
          </div>
          <span className="text-base sm:text-lg font-medium text-muted-foreground">جاري التحميل...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 safe-area-top safe-area-bottom">
        {/* Header */}
        <header className="container-responsive py-4 sm:py-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <div className="relative">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl gradient-bg-primary shadow-lg">
                  <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 h-3 w-3 sm:h-4 sm:w-4 gradient-bg-secondary rounded-full flex items-center justify-center">
                  <Sparkles className="h-1.5 w-1.5 sm:h-2 sm:w-2 text-white" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-lg sm:text-xl lg:text-2xl font-bold gradient-text-primary">نظام إدارة الدعوة</span>
                <span className="text-xs sm:text-sm text-muted-foreground hidden sm:block">منصة متطورة لإدارة الأنشطة الدعوية</span>
              </div>
            </div>
            <Button 
              onClick={signInWithGoogle} 
              className="gradient-bg-primary hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 w-full sm:w-auto"
              size="default"
            >
              <LogIn className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              تسجيل الدخول
            </Button>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex items-center">
          <div className="container-responsive py-10 sm:py-16 lg:py-20">
            <div className="max-w-4xl lg:max-w-5xl mx-auto text-center animate-slide-up">
              <div className="inline-flex items-center gap-2 gradient-bg-accent text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full text-xs sm:text-sm font-medium mb-6 sm:mb-8 shadow-lg">
                <Heart className="h-3 w-3 sm:h-4 sm:w-4" />
                نظام متكامل لإدارة جهودك الدعوية بكفاءة عالية
              </div>
              
              <h1 className="heading-responsive-1 font-bold mb-6 sm:mb-8 leading-tight">
                <span className="gradient-text-primary">نظام إدارة</span>
                <br />
                <span className="text-foreground">الدعوة الذكي</span>
              </h1>
              
              <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-8 sm:mb-12 max-w-2xl lg:max-w-3xl mx-auto leading-relaxed px-4">
                حل شامل ومتطور للمنظمات الإسلامية لإدارة الدعاة، وتتبع تقدم المستفيدين، وتحليل فعالية الدعوة 
                بدقة واحترافية مع واجهة عصرية وسهلة الاستخدام.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-10 sm:mb-16 px-4">
                <Button
                  onClick={signInWithGoogle}
                  className="gradient-bg-primary hover:opacity-90 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-medium w-full sm:w-auto"
                >
                  <LogIn className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                  ابدأ رحلتك الآن
                </Button>
                
                <Button
                  variant="outline"
                  className="border-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-300 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg w-full sm:w-auto"
                >
                  <TrendingUp className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                  استكشف المميزات
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-xl sm:max-w-2xl mx-auto px-4">
                {[
                  { number: "500+", label: "مستفيد نشط" },
                  { number: "50+", label: "داعية محترف" },
                  { number: "100+", label: "نشاط شهري" },
                  { number: "99%", label: "رضا المستخدمين" }
                ].map((stat, index) => (
                  <div key={index} className="text-center animate-scale-in" style={{ animationDelay: `${index * 0.1}s` }}>
                    <div className="text-lg sm:text-xl lg:text-2xl font-bold gradient-text-primary">{stat.number}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Features Grid */}
        <section className="bg-gradient-to-br from-white/80 to-purple-50/80 backdrop-blur-sm py-12 sm:py-16 lg:py-24">
          <div className="container-responsive">
            <div className="text-center mb-10 sm:mb-16 animate-fade-in">
              <h2 className="heading-responsive-2 font-bold mb-3 sm:mb-4">
                <span className="gradient-text-primary">مميزات قوية</span> لمساعدتك على النجاح
              </h2>
              <p className="text-base sm:text-lg lg:text-xl text-muted-foreground px-4">كل ما تحتاجه لإدارة دعوتك في مكان واحد بتقنية متطورة.</p>
            </div>
            
            <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
                  className="group hover:shadow-2xl transition-all duration-500 border-0 bg-white/80 backdrop-blur-sm hover:bg-white/90 hover:scale-105 animate-scale-in card-responsive"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardHeader className="items-center text-center pb-3 sm:pb-4">
                    <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br ${feature.gradient} shadow-lg mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                    </div>
                    <CardTitle className="text-lg sm:text-xl font-bold">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center text-sm sm:text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-600">
          <div className="container-responsive text-center">
            <div className="max-w-2xl lg:max-w-3xl mx-auto animate-fade-in px-4">
              <h2 className="heading-responsive-2 font-bold text-white mb-4 sm:mb-6">
                ابدأ رحلتك في إدارة الدعوة اليوم
              </h2>
              <p className="text-base sm:text-lg lg:text-xl text-white/90 mb-6 sm:mb-8">
                انضم إلى آلاف الدعاة الذين يستخدمون نظامنا لتحقيق نتائج مذهلة في أعمالهم الدعوية
              </p>
              <Button
                onClick={signInWithGoogle}
                className="bg-white text-purple-600 hover:bg-gray-50 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 px-8 sm:px-10 py-3 sm:py-4 text-base sm:text-lg font-bold w-full sm:w-auto"
              >
                <LogIn className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                ابدأ مجاناً الآن
              </Button>
            </div>
          </div>
        </section>
        
        <footer className="container-responsive py-6 sm:py-8 text-center text-muted-foreground text-xs sm:text-sm border-t border-purple-100">
          <div className="flex items-center justify-center gap-2 mb-1 sm:mb-2">
            <Heart className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 px-4">
        <div className="text-center max-w-sm sm:max-w-md mx-auto animate-fade-in">
          <AdminSetupNotice userEmail={user.email} />
          <div className="gradient-bg-primary p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl text-white mb-4 sm:mb-6">
            <Shield className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4" />
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4">أهلاً بك أيها المدير!</h2>
            <p className="text-sm sm:text-base lg:text-lg opacity-90 mb-4 sm:mb-6">يتم توجيهك إلى لوحة تحكم المدير المتطورة...</p>
          </div>
          <Button 
            onClick={() => (window.location.href = "/admin")}
            className="gradient-bg-secondary hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 w-full sm:w-auto"
          >
            <BarChart3 className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            اذهب إلى لوحة التحكم الآن
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 px-4">
      <div className="text-center animate-fade-in max-w-sm sm:max-w-md mx-auto">
        <div className="gradient-bg-primary p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl text-white mb-4 sm:mb-6">
          <Users className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4" />
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4">أهلاً بك، {user.displayName}!</h2>
          <p className="text-sm sm:text-base lg:text-lg opacity-90 mb-4 sm:mb-6">يتم توجيهك إلى لوحة التحكم الخاصة بك...</p>
        </div>
        <Button 
          onClick={() => (window.location.href = "/dashboard")}
          className="gradient-bg-accent hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 w-full sm:w-auto"
        >
          <Calendar className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
          اذهب إلى لوحة التحكم الآن
        </Button>
      </div>
    </div>
  )
}