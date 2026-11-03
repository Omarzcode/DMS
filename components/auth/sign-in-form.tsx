"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
} from "lucide-react"
import { Logo } from "@/components/ui/logo"

export function SignInForm() {
  const { signInWithEmail, signUpWithEmail, resetPassword } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)

  const resolveEmail = (input: string) => {
    const clean = input.trim().toLowerCase()
    if (!clean) return ""
    return clean.includes("@") ? clean : `${clean}@gmail.com`
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetEmail = resolveEmail(username)
    if (!targetEmail) {
      setError("يرجى إدخال اسم المستخدم أو البريد الإلكتروني")
      return
    }
    setIsSigningIn(true)
    setError(null)
    setSuccess(null)
    try {
      await resetPassword(targetEmail)
      setSuccess("تم إرسال رابط تعيين كلمة المرور إلى البريد الإلكتروني بنجاح.")
    } catch (err: any) {
      const code = err?.code || ""
      if (code === "auth/user-not-found") {
        setError("المستخدم غير موجود بالنظام")
      } else {
        setError("تعذر إرسال الرابط. يرجى التأكد من اسم المستخدم والمحاولة مرة أخرى.")
      }
    } finally {
      setIsSigningIn(false)
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetEmail = resolveEmail(username)
    const targetPassword = password.trim()

    if (!targetEmail) {
      setError("يرجى إدخال اسم المستخدم أو البريد الإلكتروني")
      return
    }
    if (!targetPassword) {
      setError("يرجى إدخال كلمة المرور")
      return
    }

    setIsSigningIn(true)
    setError(null)
    setSuccess(null)
    try {
      if (isSignUp) {
        if (!name.trim()) {
          setError("يرجى إدخال الاسم كاملاً")
          setIsSigningIn(false)
          return
        }
        await signUpWithEmail(targetEmail, targetPassword, name.trim())
      } else {
        await signInWithEmail(targetEmail, targetPassword)
      }
    } catch (err: any) {
      const code = err?.code || ""
      console.warn("Auth attempt notice:", code || err?.message)
      if (
        code === "auth/invalid-credential" ||
        code === "auth/user-not-found" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-login-credentials"
      ) {
        setError("اسم المستخدم أو كلمة المرور غير صحيحة. إذا نسيت كلمة المرور، يمكنك استعادتها أدناه.")
      } else if (code === "auth/email-already-in-use") {
        setError("هذا الحساب مسجل بالفعل، يرجى تسجيل الدخول أو استعادة كلمة المرور.")
      } else if (code === "auth/weak-password") {
        setError("كلمة المرور يجب أن لا تقل عن 6 أحرف")
      } else {
        setError("تعذر إتمام العملية. يرجى التحقق من البيانات والمحاولة مرة أخرى.")
      }
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background via-background to-muted/20 px-4 py-8">
      <div className="w-full max-w-[420px]">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-inner mb-4">
            <Logo size={48} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            بوابة الدعوة الإلكترونية
          </h1>
          <p className="mt-1 text-xs text-muted-foreground font-medium">
            تسجيل الدخول إلى النظام
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/20 p-6 sm:p-7">
          {error && (
            <Alert variant="destructive" className="mb-5 text-start py-2.5 px-3 rounded-xl border-destructive/30">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <AlertDescription className="text-xs font-medium leading-relaxed">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-5 text-start py-2.5 px-3 rounded-xl border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <AlertDescription className="text-xs font-medium leading-relaxed">{success}</AlertDescription>
            </Alert>
          )}

          {isForgotPassword ? (
            <form onSubmit={handleResetPassword} className="space-y-4 text-start">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  استعادة كلمة المرور
                </h2>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  أدخل اسم المستخدم أو البريد الإلكتروني وسيصلك رابط لتعيين كلمة مرور جديدة.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  اسم المستخدم أو البريد
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-muted-foreground">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <Input
                    type="text"
                    placeholder="اسم المستخدم أو البريد"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-11 ps-9 pe-3 rounded-xl text-sm bg-background/50 border-input hover:border-primary/50 focus-visible:border-primary transition-colors"
                    required
                    autoFocus
                    autoComplete="username"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSigningIn}
                className="w-full h-11 rounded-xl font-semibold text-sm transition-all shadow-md shadow-primary/20"
              >
                {isSigningIn ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "إرسال رابط التعيين"
                )}
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false)
                    setError(null)
                    setSuccess(null)
                  }}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                >
                  <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                  <span>العودة لتسجيل الدخول</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-4 text-start">
              {isSignUp && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    الاسم الكامل
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-muted-foreground">
                      <UserIcon className="h-4 w-4" />
                    </div>
                    <Input
                      type="text"
                      placeholder="الاسم الكامل"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-11 ps-9 pe-3 rounded-xl text-sm bg-background/50"
                      required
                      autoComplete="name"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  اسم المستخدم
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-muted-foreground">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <Input
                    type="text"
                    placeholder="اسم المستخدم أو البريد"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-11 ps-9 pe-3 rounded-xl text-sm bg-background/50 border-input hover:border-primary/50 focus-visible:border-primary transition-colors"
                    required
                    autoFocus
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    كلمة المرور
                  </label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true)
                        setError(null)
                        setSuccess(null)
                      }}
                      className="text-xs text-primary hover:underline transition-colors"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </div>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 ps-9 pe-10 rounded-xl text-sm bg-background/50 border-input hover:border-primary/50 focus-visible:border-primary transition-colors"
                    required
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSigningIn}
                className="w-full h-11 rounded-xl font-semibold text-sm transition-all shadow-md shadow-primary/20 hover:shadow-primary/30 mt-2"
              >
                {isSigningIn ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isSignUp ? (
                  "إنشاء حساب داعية"
                ) : (
                  "تسجيل الدخول"
                )}
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp)
                    setError(null)
                    setSuccess(null)
                  }}
                  className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  {isSignUp
                    ? "لديك حساب بالفعل؟ تسجيل الدخول"
                    : "ليس لديك حساب؟ طلب تسجيل داعية"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/70 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-primary/70" />
            <span>نظام موحد ومحمي للدعاة والمشرفين</span>
          </div>
        </div>
      </div>
    </div>
  )
}