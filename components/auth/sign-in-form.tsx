    "use client"
    
    import { useState } from "react"
    import { useAuth } from "@/hooks/use-auth"
    import { Button } from "@/components/ui/button"
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
    import { Alert, AlertDescription } from "@/components/ui/alert"
    import { Loader2, AlertCircle, BookOpen } from "lucide-react"
    
    export function SignInForm() {
      const { signInWithGoogle, loading } = useAuth()
      const [error, setError] = useState<string | null>(null)
      const [isSigningIn, setIsSigningIn] = useState(false)
    
      const handleGoogleSignIn = async () => {
        try {
          setError(null)
          setIsSigningIn(true)
          await signInWithGoogle()
          // The redirect will be handled by the AuthGuard or the page logic
        } catch (error) {
          console.error("Sign-in error:", error)
          setError("فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.")
        } finally {
          setIsSigningIn(false)
        }
      }
    
      return (
        <div className="min-h-screen flex items-center justify-center bg-muted p-4">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="text-center space-y-4">
               <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <BookOpen className="h-6 w-6" />
               </div>
              <CardTitle className="text-2xl font-bold">مرحباً بعودتك</CardTitle>
              <CardDescription>سجل دخولك للوصول إلى نظام إدارة الدعوة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
    
              <Button
                onClick={handleGoogleSignIn}
                disabled={loading || isSigningIn}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                size="lg"
              >
                {isSigningIn ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    جاري التسجيل...
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
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
    
              <div className="text-center text-sm text-muted-foreground pt-4">
                <p>فقط الموظفون المصرح لهم يمكنهم الوصول إلى هذا النظام.</p>
                <p className="mt-1">تواصل مع المسؤول إذا كنت بحاجة إلى صلاحية الدخول.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }
    

