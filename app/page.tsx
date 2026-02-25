"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Loader2, LogOut, Clock } from "lucide-react"
import { ThemeToggleButton } from "@/components/ui/theme-toggle"
import Image from "next/image"

// Replace the entire useParticles function with this:

function useParticles(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
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
      // Convert "67 32% 19%" → proper hsl
      return raw.includes(",") ? raw : raw.replace(/(\S+)\s+(\S+)\s+(\S+)/, "\$1, \$2, \$3")
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

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener("resize", init)
    }
  }, [canvasRef])
}

// ── Staggered reveal hook ──
function useStagger(count: number, delay = 120) {
  const [visible, setVisible] = useState<boolean[]>(Array(count).fill(false))
  useEffect(() => {
    const timers = Array.from({ length: count }, (_, i) =>
      setTimeout(() => setVisible((v) => { const n = [...v]; n[i] = true; return n }), delay * (i + 1))
    )
    return () => timers.forEach(clearTimeout)
  }, [count, delay])
  return visible
}

export default function HomePage() {
  const { user, userRole, loading, signInWithGoogle, logout } = useAuth()
  const router = useRouter()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const show = useStagger(5, 150)

  useParticles(canvasRef)

  useEffect(() => {
    if (!loading && user) {
      if (userRole === "admin") router.replace("/admin")
      else if (userRole === "da'i") router.replace("/dashboard")
    }
  }, [user, userRole, loading, router])

  const handleSignIn = async () => {
    setIsSigningIn(true)
    try { await signInWithGoogle() }
    catch (e) { console.error(e) }
    finally { setIsSigningIn(false) }
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  // ── Unauthenticated ──
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4">
        <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" />

        <div className="fixed top-4 end-4 z-50">
          <ThemeToggleButton />
        </div>

        <div className="relative z-10 w-full max-w-sm text-center">
          {/* Logo */}
          <div
            className="transition-all duration-700 ease-out"
            style={{
              opacity: show[0] ? 1 : 0,
              transform: show[0] ? "translateY(0)" : "translateY(20px)",
            }}
          >
            <Image
              src="/zeta.png"
              alt="Logo"
              width={56}
              height={56}
              className="mx-auto mb-6 rounded-2xl object-contain"
              priority
            />
          </div>

          {/* Title */}
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

          {/* Divider */}
          <div
            className="transition-all duration-700 ease-out"
            style={{
              opacity: show[2] ? 1 : 0,
              transform: show[2] ? "scaleX(1)" : "scaleX(0)",
            }}
          >
            <div className="my-8 h-px w-full bg-border" />
          </div>

          {/* Sign in */}
          <div
            className="transition-all duration-700 ease-out"
            style={{
              opacity: show[3] ? 1 : 0,
              transform: show[3] ? "translateY(0)" : "translateY(20px)",
            }}
          >
            <p className="mb-5 text-sm text-muted-foreground">
              Sign in to continue
            </p>
            <Button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="w-full h-12 gap-2.5 text-sm font-medium rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
              size="lg"
            >
              {isSigningIn ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              {isSigningIn ? "Signing in…" : "Continue with Google"}
            </Button>
          </div>

          {/* Footer */}
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

  // ── Pending ──
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

  // ── Redirecting ──
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
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