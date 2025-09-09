"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, BookOpen, Sparkles, Shield, Heart } from "lucide-react"

export function SignInForm() {
  const { signInWithGoogle, loading } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)

  const handleGoogleSignIn = async () => {
    try {
      setError(null)
      setIsSigningIn(true)
      await signInWithGoogle()
    } catch (error) {
      console.error("Sign-in error:", error)
      setError("فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.")
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-4 safe-area-top safe-area-bottom">
      <div className="w-full max-w-sm sm:max-w-md animate-scale-in">
        <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-sm card-responsive">
          <CardHeader className="text-center space-y-4 sm:space-y-6 pb-6 sm:pb-8">
            <div className="mx-auto relative">
              <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-xl sm:rounded-2xl gradient-bg-primary shadow-xl">
                <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 h-4 w-4 sm:h-6 sm:w-6 gradient-bg-secondary rounded-full flex items-center justify-center shadow-lg">
                <Sparkles className="h-2 w-2 sm:h-3 sm:w-3 text-white" />
              </div>
            </div>
            
            <div className="space-y-1 sm:space-y-2">
              <CardTitle className="text-2xl sm:text-3xl font-bold gradient-text-primary">مرحباً بعودتك</CardTitle>
              <CardDescription className="text-base sm:text-lg text-muted-foreground">
                سجل دخولك للوصول إلى نظام إدارة الأعمال المتطور
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4 sm:space-y-6">
            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleGoogleSignIn}
              disabled={loading || isSigningIn}
              className="w-full gradient-bg-primary hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 h-12 sm:h-14 text-base sm:text-lg"
            >
              {isSigningIn ? (
                <>
                  <div className="relative mr-3">
                    <Loader2 className="h-5 w-5 animate-spin text-transparent" />
                    <Loader2 className="absolute inset-0 h-5 w-5 animate-spin text-white" />
                  </div>
                  جاري التسجيل...
                </>
              ) : (
                <>
                  <svg className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
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
                  المتابعة باستخدام جوجل
                </>
              )}
            </Button>

            <div className="space-y-3 sm:space-y-4 pt-4 sm:pt-6 border-t border-purple-100">
              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500" />
                <span>فقط الموظفون المصرح لهم يمكنهم الوصول إلى هذا النظام</span>
              </div>
              
              <div className="text-center">
                <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                  تواصل مع المسؤول إذا كنت بحاجة إلى صلاحية الدخول
                </p>
                <div className="flex items-center justify-center gap-1 text-xs sm:text-sm text-purple-600">
                  <Heart className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  <span>صُنع بحب لخدمة الأعمال الإسلامية</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}