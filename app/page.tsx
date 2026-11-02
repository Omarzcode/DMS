"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Loader2, LogOut, Clock, Mail, Lock, AlertCircle, CheckCircle2 } from "lucide-react"
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

    // Small delay to ensure canvas is in the DOM after render
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
          : raw.replace(/(\S+)\s+(\S+)\s+(\S+)/, "\$1, \$2, \$3")
      }

      const init = () => {
        resize()
        const count = Math.min(
          Math.floor((canvas.width * canvas.height) / 20000),
          80
        )
        particles = Array.from({ length: count }, () => ({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          r: Math.random() * 1.5 + 0.5,
          o: Math.random() * 0.5 + 0.15,
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

      // Store cleanup
      canvas.dataset.cleanup = "true"
      const cleanup = () => {
        cancelAnimationFrame(animationId)
        window.removeEventListener("resize", init)
      }

        // Attach cleanup to ref for the return
        ; (canvas as any)._cleanup = cleanup
    }, 50)

    return () => {
      clearTimeout(timeout)
      const canvas = canvasRef.current
      if (canvas && (canvas as any)._cleanup) {
        ; (canvas as any)._cleanup()
      }
    }
  }, [canvasRef, enabled])  // ← re-runs when `enabled` changes
}

// ── Staggered reveal ──
function useStagger(count: number, delay = 120) {
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
  const [password, setPassword] = useState("123456")
  const [name, setName] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const show = useStagger(5, 150)

  // ✅ Only enable particles when loading is done
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
      setAuthError("يرجى إدخال اسم المستخدم أولاً")
      return
    }
    setIsSigningIn(true)
    setAuthError(null)
    setResetSuccess(null)
    try {
      await resetPassword(targetEmail)
      setResetSuccess(`تم إرسال رابط تعيين كلمة المرور إلى ${targetEmail}! افتح بريدك لتعيين كلمة السر ثم ادخل هنا مباشرة.`)
    } catch (err: any) {
      const code = err?.code || ""
      if (code === "auth/user-not-found") {
        setAuthError("هذا المستخدم غير مسجل في النظام")
      } else if (code === "auth/invalid-email") {
        setAuthError("صيغة اسم المستخدم غير صحيحة")
      } else {
        setAuthError(err?.message || "فشل إرسال الرابط. يرجى التأكد من اسم المستخدم والمحاولة مرة أخرى")
      }
    } finally {
      setIsSigningIn(false)
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetEmail = resolveEmail(username)
    const targetPassword = password.trim() || "123456"

    if (!targetEmail) {
      setAuthError("يرجى إدخال اسم المستخدم (الجزء قبل @ في الإيميل)")
      return
    }
    setIsSigningIn(true)
    setAuthError(null)
    setResetSuccess(null)
    try {
      if (isSignUp) {
        await signUpWithEmail(targetEmail, targetPassword, name)
      } else {
        await signInWithEmail(targetEmail, targetPassword)
      }
    } catch (err: any) {
      console.error("Auth error:", err)
      const code = err?.code || ""
      if (
        code === "auth/invalid-credential" ||
        code === "auth/user-not-found" ||
        code === "auth/wrong-password"
      ) {
        setAuthError("اسم المستخدم أو كلمة المرور غير صحيحة. كلمة المرور الافتراضية هي 123456. إذا كنت لم تضبط كلمة مرور بعد، اضغط 'تعيين كلمة المرور' بالأسفل.")
      } else if (code === "auth/email-already-in-use") {
        setAuthError("هذا المستخدم مسجل بالفعل. يرجى تسجيل الدخول مباشرة.")
      } else if (code === "auth/weak-password") {
        setAuthError("كلمة المرور يجب أن لا تقل عن 6 أحرف (مثل: 123456)")
      } else if (code === "auth/invalid-email") {
        setAuthError("صيغة اسم المستخدم غير صحيحة")
      } else {
        setAuthError(err?.message || "فشل تسجيل الدخول. يرجى المحاولة مرة أخرى")
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
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4 py-8">
        <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" />

        <div className="fixed top-4 end-4 z-50">
          <ThemeToggleButton />
        </div>

        <div className="relative z-10 w-full max-w-sm text-center">
          <div
            className="transition-all duration-700 ease-out"
            style={{
              opacity: show[0] ? 1 : 0,
              transform: show[0] ? "translateY(0)" : "translateY(20px)",
            }}
          >
            <Logo size={56} className="mx-auto mb-6" />
          </div>

          <div
            className="transition-all duration-700 ease-out"
            style={{
              opacity: show[1] ? 1 : 0,
              transform: show[1] ? "translateY(0)" : "translateY(20px)",
            }}
          >
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              EMS
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Engineering Management System
            </p>
          </div>

          <div
            className="transition-all duration-700 ease-out"
            style={{
              opacity: show[2] ? 1 : 0,
              transform: show[2] ? "scaleX(1)" : "scaleX(0)",
            }}
          >
            <div className="my-6 h-px w-full bg-border" />
          </div>

          <div
            className="transition-all duration-700 ease-out"
            style={{
              opacity: show[3] ? 1 : 0,
              transform: show[3] ? "translateY(0)" : "translateY(20px)",
            }}
          >
            {authError && (
              <Alert variant="destructive" className="mb-4 text-start py-2.5 px-3 rounded-xl">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <AlertDescription className="text-xs leading-relaxed">{authError}</AlertDescription>
              </Alert>
            )}

            {resetSuccess && (
              <Alert className="mb-4 text-start py-2.5 px-3 rounded-xl border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-xs leading-relaxed">{resetSuccess}</AlertDescription>
              </Alert>
            )}

            <div className="pt-1">
              {isForgotPassword ? (
                <form onSubmit={handleResetPassword} className="space-y-3.5 text-start">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    أدخل اسم المستخدم (الجزء قبل @ في الإيميل) وسنرسل لك رابطاً لتحديد كلمة المرور. ستظل جميع بياناتك وأنشطتك كما هي تماماً.
                  </p>
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1">
                      اسم المستخدم أو الإيميل
                    </label>
                    <Input
                      type="text"
                      placeholder="مثال: omar.mo3031"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-11 rounded-xl text-sm"
                      required
                      autoFocus
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isSigningIn}
                    className="w-full h-11 rounded-xl font-medium text-sm transition-all shadow-sm"
                  >
                    {isSigningIn ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "إرسال رابط تعيين كلمة المرور"
                    )}
                  </Button>
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(false)
                        setAuthError(null)
                      }}
                      className="text-xs text-primary hover:underline transition-colors"
                    >
                      العودة لتسجيل الدخول / Back to Sign In
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleEmailAuth} className="space-y-3.5 text-start">
                  {isSignUp && (
                    <div>
                      <label className="text-xs font-medium text-foreground block mb-1">
                        الاسم الكامل
                      </label>
                      <Input
                        type="text"
                        placeholder="الاسم الكامل"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-11 rounded-xl text-sm"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-foreground">
                        اسم المستخدم (Username)
                      </label>
                      <span className="text-[11px] text-muted-foreground">
                        الجزء قبل @
                      </span>
                    </div>
                    <Input
                      type="text"
                      placeholder="مثال: omar.mo3031"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-11 rounded-xl text-sm"
                      required
                      autoFocus
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-foreground">
                        كلمة المرور (Password)
                      </label>
                      <span className="text-[11px] text-muted-foreground">
                        الافتراضية: 123456
                      </span>
                    </div>
                    <Input
                      type="password"
                      placeholder="123456"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 rounded-xl text-sm"
                      required
                    />
                  </div>

                  {!isSignUp && (
                    <div className="text-end pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true)
                          setAuthError(null)
                          setResetSuccess(null)
                        }}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        نسيت أو تعيين كلمة المرور؟
                      </button>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isSigningIn}
                    className="w-full h-11 rounded-xl font-medium text-sm transition-all shadow-md shadow-primary/10"
                  >
                    {isSigningIn ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isSignUp ? (
                      "إنشاء حساب جديد"
                    ) : (
                      "تسجيل الدخول / Sign In"
                    )}
                  </Button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(!isSignUp)
                        setAuthError(null)
                      }}
                      className="text-xs text-primary hover:underline transition-colors"
                    >
                      {isSignUp
                        ? "لديك حساب بالفعل؟ تسجيل الدخول"
                        : "حساب داعية جديد؟ إنشاء حساب"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          <div
            className="transition-all duration-700 ease-out"
            style={{
              opacity: show[4] ? 1 : 0,
              transform: show[4] ? "translateY(0)" : "translateY(10px)",
            }}
          >
            <p className="mt-8 text-[11px] text-muted-foreground/60">
              Protected by enterprise-grade security
            </p>
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