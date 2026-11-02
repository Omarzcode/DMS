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
  const { user, userRole, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, logout } = useAuth()
  const router = useRouter()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState<string | null>(null)
  const [showEmailAuth, setShowEmailAuth] = useState(false)
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

  const handleSignIn = async () => {
    setIsSigningIn(true)
    setAuthError(null)
    setResetSuccess(null)
    try {
      await signInWithGoogle()
    } catch (e: any) {
      if (
        e?.code !== "auth/popup-closed-by-user" &&
        e?.code !== "auth/cancelled-popup-request"
      ) {
        console.warn("Sign-in notice:", e?.message || e)
        setAuthError("فشل الدخول عبر Google. يمكنك استخدام البريد وكلمة المرور أدناه.")
      }
    } finally {
      setIsSigningIn(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setAuthError("يرجى إدخال البريد الإلكتروني أولاً")
      return
    }
    setIsSigningIn(true)
    setAuthError(null)
    setResetSuccess(null)
    try {
      await resetPassword(email)
      setResetSuccess("تم إرسال رابط تعيين كلمة المرور إلى بريدك الإلكتروني! تفقّد بريدك (بما في ذلك مجلد الرسائل غير المرغوب فيها) لتعيين كلمة السر ثم ادخل هنا مباشرة وستبقى بياناتك كما هي.")
    } catch (err: any) {
      const code = err?.code || ""
      if (code === "auth/user-not-found") {
        setAuthError("هذا البريد الإلكتروني غير موجود في النظام")
      } else if (code === "auth/invalid-email") {
        setAuthError("صيغة البريد الإلكتروني غير صحيحة")
      } else {
        setAuthError(err?.message || "فشل إرسال الرابط. يرجى التأكد من البريد والمحاولة مرة أخرى")
      }
    } finally {
      setIsSigningIn(false)
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setAuthError("يرجى إدخال البريد الإلكتروني وكلمة المرور")
      return
    }
    setIsSigningIn(true)
    setAuthError(null)
    setResetSuccess(null)
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, name)
      } else {
        await signInWithEmail(email, password)
      }
    } catch (err: any) {
      console.error("Auth error:", err)
      const code = err?.code || ""
      if (
        code === "auth/invalid-credential" ||
        code === "auth/user-not-found" ||
        code === "auth/wrong-password"
      ) {
        setAuthError("البريد الإلكتروني أو كلمة المرور غير صحيحة. إذا كان حسابك مسجلاً عبر Google سابقاً، اضغط 'نسيت كلمة المرور' لإنشاء كلمة سر له.")
      } else if (code === "auth/email-already-in-use") {
        setAuthError("هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول أو استعادة كلمة المرور.")
      } else if (code === "auth/weak-password") {
        setAuthError("كلمة المرور يجب أن لا تقل عن 6 أحرف")
      } else if (code === "auth/invalid-email") {
        setAuthError("صيغة البريد الإلكتروني غير صحيحة")
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

            <Button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="w-full h-12 gap-2.5 text-sm font-medium rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
              size="lg"
            >
              {isSigningIn && !showEmailAuth ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              {isSigningIn && !showEmailAuth ? "Signing in…" : "Continue with Google"}
            </Button>

            {/* Email / Password divider & toggle */}
            <div className="relative my-5 flex items-center justify-center">
              <div className="border-t border-border w-full" />
              <button
                type="button"
                onClick={() => {
                  setShowEmailAuth(!showEmailAuth)
                  setAuthError(null)
                  setResetSuccess(null)
                  setIsForgotPassword(false)
                }}
                className="absolute bg-background px-3 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                {showEmailAuth ? "Hide Email Login ▲" : "Or use Email & Password ▼"}
              </button>
            </div>

            {/* In-app Email/Password form (Works 100% inside Android APK without browser redirects) */}
            {showEmailAuth && (
              <div className="pt-1">
                {isForgotPassword ? (
                  <form onSubmit={handleResetPassword} className="space-y-3 text-start">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      أدخل بريدك الإلكتروني المسجل وسنرسل لك رابطاً لتحديد كلمة المرور. ستظل جميع بياناتك وأنشطتك كما هي تماماً.
                    </p>
                    <div>
                      <Input
                        type="email"
                        placeholder="Email / البريد الإلكتروني"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11 rounded-xl text-sm"
                        required
                        autoFocus
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isSigningIn}
                      className="w-full h-11 rounded-xl font-medium text-sm transition-all"
                    >
                      {isSigningIn ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Send Reset Link / إرسال رابط التعيين"
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
                  <form onSubmit={handleEmailAuth} className="space-y-3 text-start">
                    {isSignUp && (
                      <div>
                        <Input
                          type="text"
                          placeholder="Full Name / الاسم الكامل"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="h-11 rounded-xl text-sm"
                          required
                        />
                      </div>
                    )}
                    <div>
                      <Input
                        type="email"
                        placeholder="Email / البريد الإلكتروني"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11 rounded-xl text-sm"
                        required
                      />
                    </div>
                    <div>
                      <Input
                        type="password"
                        placeholder="Password / كلمة المرور"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 rounded-xl text-sm"
                        required
                      />
                    </div>
                    {!isSignUp && (
                      <div className="text-end">
                        <button
                          type="button"
                          onClick={() => {
                            setIsForgotPassword(true)
                            setAuthError(null)
                            setResetSuccess(null)
                          }}
                          className="text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          نسيت كلمة المرور؟ / Forgot password?
                        </button>
                      </div>
                    )}
                    <Button
                      type="submit"
                      disabled={isSigningIn}
                      className="w-full h-11 rounded-xl font-medium text-sm transition-all"
                    >
                      {isSigningIn && showEmailAuth ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isSignUp ? (
                        "Create Account / إنشاء حساب"
                      ) : (
                        "Sign In with Email / دخول"
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
                          ? "Already have an account? Sign In"
                          : "Need an account? Sign Up with Email"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
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

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}