    "use client"
    
    import { useAuth } from "@/hooks/use-auth"
    import { Button } from "@/components/ui/button"
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
    import { Loader2, Users, BarChart3, Calendar, BookOpen, LogIn } from "lucide-react"
    import { AdminSetupNotice } from "@/components/auth/admin-setup-notice"
    
    export default function HomePage() {
      const { user, userRole, loading, signInWithGoogle } = useAuth()
    
      if (loading) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-muted-foreground">جاري التحميل...</span>
            </div>
          </div>
        )
      }
    
      if (!user) {
        return (
          <div className="min-h-screen flex flex-col bg-background">
            {/* Header */}
            <header className="container mx-auto px-4 py-4">
              <div className="flex justify-between items-center">
                 <div className="flex items-center justify-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <BookOpen className="h-5 w-5" />
                    </div>
                     <span className="text-xl font-bold">نظام الدعوة</span>
                </div>
                <Button onClick={signInWithGoogle} variant="outline">
                  تسجيل الدخول
                  <LogIn className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </header>
    
            {/* Hero Section */}
            <main className="flex-1 flex items-center">
              <div className="container mx-auto px-4 py-16">
                <div className="max-w-4xl mx-auto text-center">
                   <div className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium mb-4">
                    نظام متكامل لإدارة جهودك الدعوية
                  </div>
                  <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
                    نظام إدارة الدعوة
                  </h1>
                  <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                    حل شامل للمنظمات الإسلامية لإدارة الدعاة، وتتبع تقدم المستفيدين، وتحليل فعالية الدعوة بدقة واحترافية.
                  </p>
    
                  <Button
                    onClick={signInWithGoogle}
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg"
                  >
                    ابدأ الآن بالتسجيل مع جوجل
                  </Button>
                </div>
              </div>
            </main>
    
             {/* Features Grid */}
            <section className="bg-muted py-20">
                <div className="container mx-auto px-4">
                     <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold">ميزات قوية لمساعدتك على النجاح</h2>
                        <p className="text-muted-foreground mt-2">كل ما تحتاجه لإدارة دعوتك في مكان واحد.</p>
                    </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <Card className="border-border bg-card hover:shadow-lg transition-shadow">
                      <CardHeader className="items-center text-center">
                        <div className="p-4 bg-primary/10 rounded-full mb-4">
                            <Users className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle>إدارة المستفيدين</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-center">
                          تتبع وإدارة المستفيدين مع مراقبة تفصيلية لتقدمهم ومراحلهم الدعوية.
                        </CardDescription>
                      </CardContent>
                    </Card>
    
                    <Card className="border-border bg-card hover:shadow-lg transition-shadow">
                      <CardHeader className="items-center text-center">
                        <div className="p-4 bg-primary/10 rounded-full mb-4">
                            <BarChart3 className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle>لوحة تحليلات</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-center">
                          تحليلات وتقارير شاملة لقياس فعالية الدعوة وتحديد فرص النمو.
                        </CardDescription>
                      </CardContent>
                    </Card>
    
                    <Card className="border-border bg-card hover:shadow-lg transition-shadow">
                      <CardHeader className="items-center text-center">
                        <div className="p-4 bg-primary/10 rounded-full mb-4">
                             <Calendar className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle>تتبع الأنشطة</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-center">
                          إدارة الفعاليات والدروس والمقارئ مع تتبع الحضور ومقاييس التفاعل.
                        </CardDescription>
                      </CardContent>
                    </Card>
    
                    <Card className="border-border bg-card hover:shadow-lg transition-shadow">
                      <CardHeader className="items-center text-center">
                        <div className="p-4 bg-primary/10 rounded-full mb-4">
                            <BookOpen className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle>صلاحيات وأدوار</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-center">
                          نظام صلاحيات آمن للمديرين والدعاة مع مستويات وصول مناسبة لكل دور.
                        </CardDescription>
                      </CardContent>
                    </Card>
                  </div>
                </div>
            </section>
            
            <footer className="container mx-auto px-4 py-6 text-center text-muted-foreground text-sm">
                © {new Date().getFullYear()} نظام إدارة الدعوة. جميع الحقوق محفوظة.
            </footer>
          </div>
        )
      }
    
      // Redirect authenticated users to their dashboard
      if (userRole === "admin") {
        // This part will redirect the user automatically, no need to show anything.
        // The redirect logic is handled in the AuthGuard component.
        // For a better UX, we can show a loading/redirecting message.
         return (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center max-w-md mx-auto px-4">
              <AdminSetupNotice userEmail={user.email} />
              <h2 className="text-2xl font-bold text-foreground mb-4">أهلاً بك أيها المدير!</h2>
              <p className="text-muted-foreground mb-6">يتم توجيهك إلى لوحة تحكم المدير...</p>
              <Button onClick={() => (window.location.href = "/admin")}>اذهب إلى لوحة التحكم الآن</Button>
            </div>
          </div>
        )
      }
    
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">أهلاً بك، {user.displayName}!</h2>
            <p className="text-muted-foreground mb-6">يتم توجيهك إلى لوحة التحكم...</p>
            <Button onClick={() => (window.location.href = "/dashboard")}>اذهب إلى لوحة التحكم الآن</Button>
          </div>
        </div>
      )
    }
    

