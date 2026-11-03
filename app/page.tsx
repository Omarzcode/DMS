"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  LogOut,
  Clock,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ThemeToggleButton } from "@/components/ui/theme-toggle"
import Image from "next/image"
import { Logo } from "@/components/ui/logo"

// ── Particles — now with `enabled` flag ──
function useParticles(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled) return

    const timeout = setTimeout(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      let animationId: number
      let particles: {
        x: number; y: number; vx: number; vy: number; r: number; o: number
      }[] = []

      const resize = () => {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
      }

      const getColor = () => {
        const raw = getComputedStyle(document.documentElement)
          .getPropertyValue("--primary")
          .trim()
        return raw.includes(",")
          ? raw
          : raw.replace(/(\S+)\s+(\S+)\s+(\S+)/, "$1, $2, $3")
      }

      const init = () => {
        resize()
        const count = Math.min(
          Math.floor((canvas.width * canvas.height) / 22000),
          70
        )
        particles = Array.from({ length: count }, () => ({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          r: Math.random() * 1.5 + 0.5,
          o: Math.random() * 0.45 + 0.15,
        }))
      }

      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const color = getColor()

        for (const p of particles) {
          p.x += p.vx
          p.y += p.vy
          if (p.x < 0 || p.x > canvas.width) p.vx *= -1
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1

          ctx.beginPath()
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${color}, ${p.o})`
          ctx.fill()
        }

        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x
            const dy = particles[i].y - particles[j].y
            const dist = dx * dx + dy * dy
            if (dist < 14400) {
              ctx.beginPath()
              ctx.moveTo(particles[i].x, particles[i].y)
              ctx.lineTo(particles[j].x, particles[j].y)
              ctx.strokeStyle = `hsla(${color}, ${0.08 * (1 - Math.sqrt(dist) / 120)})`
              ctx.lineWidth = 0.5
              ctx.stroke()
            }
          }
        }

        animationId = requestAnimationFrame(draw)
      }

      init()
      draw()
      window.addEventListener("resize", init)

      canvas.dataset.cleanup = "true"
      const cleanup = () => {
        cancelAnimationFrame(animationId)
        window.removeEventListener("resize", init)
      }

      ;(canvas as any)._cleanup = cleanup
    }, 50)

    return () => {
      clearTimeout(timeout)
      const canvas = canvasRef.current
      if (canvas && (canvas as any)._cleanup) {
        ;(canvas as any)._cleanup()
      }
    }
  }, [canvasRef, enabled])
}

// ── Staggered reveal ──
function useStagger(count: number, delay = 100) {
  const [visible, setVisible] = useState<boolean[]>(Array(count).fill(false))
  useEffect(() => {
    const timers = Array.from({ length: count }, (_, i) =>
      setTimeout(
        () => setVisible((v) => { const n = [...v]; n[i] = true; return n }),
        delay * (i + 1)
      )
    )
    return () => timers.forEach(clearTimeout)
  }, [count, delay])
  return visible
}

export default function HomePage() {
  const { user, userRole, loading, signInWithEmail, signUpWithEmail, resetPassword, logout } = useAuth()
  const router = useRouter()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const show = useStagger(4, 120)

  useParticles(canvasRef, !loading)

  useEffect(() => {
    if (!loading && user) {
      if (userRole === "admin") router.replace("/admin")
      else if (userRole === "da'i") router.replace("/dashboard")
    }
  }, [user, userRole, loading, router])

  const resolveEmail = (input: string) => {
    const clean = input.trim().toLowerCase()
    if (!clean) return ""
    return clean.includes("@") ? clean : `${clean}@gmail.com`
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetEmail = resolveEmail(username)
    if (!targetEmail) {
      setAuthError("يرجى إدخال اسم المستخدم أو البريد الإلكتروني")
      return
    }
    setIsSigningIn(true)
    setAuthError(null)
    setResetSuccess(null)
    try {
      await resetPassword(targetEmail)
      setResetSuccess(`تم إرسال رابط استعادة وتعيين كلمة المرور إلى البريد الإلكتروني بنجاح.`)
    } catch (err: any) {
      const code = err?.code || ""
      if (code === "auth/user-not-found") {
        setAuthError("المستخدم غير موجود بالنظام")
      } else if (code === "auth/invalid-email") {
        setAuthError("صيغة اسم المستخدم أو البريد غير صالحة")
      } else {
        setAuthError("تعذر إرسال الرابط. يرجى التحقق من اسم المستخدم والمحاولة مرة أخرى.")
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
      setAuthError("يرجى إدخال اسم المستخدم أو البريد الإلكتروني")
      return
    }
    if (!targetPassword) {
      setAuthError("يرجى إدخال كلمة المرور")
      return
    }

    setIsSigningIn(true)
    setAuthError(null)
    setResetSuccess(null)
    try {
      if (isSignUp) {
        if (!name.trim()) {
          setAuthError("يرجى إدخال الاسم كاملاً")
          setIsSigningIn(false)
          return
        }
        await signUpWithEmail(targetEmail, targetPassword, name.trim())
      } else {
        await signInWithEmail(targetEmail, targetPassword)
      }
    } catch (err: any) {
      console.error("Auth error:", err)
      const code = err?.code || ""
      if (
        code === "auth/invalid-credential" ||
        code === "auth/user-not-found" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-login-credentials"
      ) {
        setAuthError("اسم المستخدم أو كلمة المرور غير صحيحة")
      } else if (code === "auth/email-already-in-use") {
        setAuthError("الحساب مسجل بالفعل، يرجى تسجيل الدخول")
      } else if (code === "auth/weak-password") {
        setAuthError("يجب أن تتكون كلمة المرور من 6 أحرف على الأقل")
      } else if (code === "auth/invalid-email") {
        setAuthError("صيغة اسم المستخدم أو البريد غير صالحة")
      } else {
        setAuthError("حدث خطأ أثناء تسجيل الدخول. يرجى إعادة المحاولة.")
      }
    } finally {
      setIsSigningIn(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
        <div className="animate-breathe">
          <Logo size={64} />
        </div>
        <div className="h-1 w-24 rounded-full bg-muted overflow-hidden">
          <div className="h-full w-1/2 rounded-full bg-primary animate-slide" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background via-background to-muted/20 relative overflow-hidden px-4 py-10">
        <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none opacity-60" />

        <div className="fixed top-4 end-4 z-50">
          <ThemeToggleButton />
        </div>

        <div className="relative z-10 w-full max-w-[420px]">
          {/* Brand header */}
          <div
            className="text-center mb-6 transition-all duration-700 ease-out"
            style={{
              opacity: show[0] ? 1 : 0,
              transform: show[0] ? "translateY(0)" : "translateY(16px)",
            }}
          >
            <div className="inline-flex p-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-inner mb-4">
              <Logo size={48} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              بوابة الدعوة الإلكترونية
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground font-medium">
              نظام إدارة وحصر الأنشطة الدعوية
            </p>
          </div>

          {/* Login Card */}
          <div
            className="transition-all duration-700 ease-out"
            style={{
              opacity: show[1] ? 1 : 0,
              transform: show[1] ? "translateY(0)" : "translateY(16px)",
            }}
          >
            <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/20 p-6 sm:p-7">
              {authError && (
                <Alert variant="destructive" className="mb-5 text-start py-2.5 px-3 rounded-xl border-destructive/30">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <AlertDescription className="text-xs font-medium leading-relaxed">{authError}</AlertDescription>
                </Alert>
              )}

              {resetSuccess && (
                <Alert className="mb-5 text-start py-2.5 px-3 rounded-xl border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  <AlertDescription className="text-xs font-medium leading-relaxed">{resetSuccess}</AlertDescription>
                </Alert>
              )}

              {isForgotPassword ? (
                /* Forgot password mode */
                <form onSubmit={handleResetPassword} className="space-y-4 text-start">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">
                      استعادة كلمة المرور
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      أدخل اسم المستخدم أو البريد الإلكتروني وسيصلك رابط لتعيين كلمة مرور جديدة لحسابك.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground block">
                      اسم المستخدم أو البريد الإلكتروني
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-muted-foreground">
                        <UserIcon className="h-4 w-4" />
                      </div>
                      <Input
                        type="text"
                        placeholder="اسم المستخدم أو البريد الإلكتروني"
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
                        setAuthError(null)
                        setResetSuccess(null)
                      }}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                    >
                      <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                      <span>العودة لتسجيل الدخول</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Normal Login / Register form */
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
                            setAuthError(null)
                            setResetSuccess(null)
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
                        setAuthError(null)
                        setResetSuccess(null)
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
          </div>

          {/* Footer security badge */}
          <div
            className="text-center mt-6 transition-all duration-700 ease-out"
            style={{
              opacity: show[2] ? 1 : 0,
              transform: show[2] ? "translateY(0)" : "translateY(10px)",
            }}
          >
            <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/70 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-primary/70" />
              <span>نظام موحد ومحمي للدعاة والمشرفين</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (userRole === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4">
        <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" />

        <div className="fixed top-4 end-4 z-50">
          <ThemeToggleButton />
        </div>

        <div className="relative z-10 w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15">
            <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>

          <h1 className="text-2xl font-bold text-foreground">Pending Review</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Hi {user.displayName?.split(" ")[0]}, your account is awaiting approval.
          </p>

          <div className="my-8 h-px w-full bg-border" />

          <Button
            onClick={logout}
            variant="outline"
            className="w-full h-11 gap-2 rounded-xl"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    )
  }

  return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
        <div className="animate-breathe">
          <Logo size={64} />
           
        </div>
        <div className="h-1 w-24 rounded-full bg-muted overflow-hidden">
          <div className="h-full w-1/2 rounded-full bg-primary animate-slide" />
        </div>
      </div>
    )
}