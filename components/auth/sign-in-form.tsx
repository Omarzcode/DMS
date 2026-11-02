"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { Logo } from "@/components/ui/logo"

export function SignInForm() {
  const { signInWithEmail, signUpWithEmail, resetPassword, loading } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("123456")
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
      setError("يرجى إدخال اسم المستخدم أولاً / Please enter your username.")
      return
    }
    setIsSigningIn(true)
    setError(null)
    setSuccess(null)
    try {
      await resetPassword(targetEmail)
      setSuccess(`تم إرسال رابط تعيين كلمة المرور إلى ${targetEmail}! / Password reset link sent!`)
    } catch (err: any) {
      setError(err?.message || "Failed to send reset link.")
    } finally {
      setIsSigningIn(false)
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetEmail = resolveEmail(username)
    const targetPassword = password.trim() || "123456"

    if (!targetEmail) {
      setError("Please enter your username (the part before @).")
      return
    }
    setIsSigningIn(true)
    setError(null)
    setSuccess(null)
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
        setError("Invalid username or password. Default is 123456. Click 'Forgot password?' if you need to set one.")
      } else if (code === "auth/email-already-in-use") {
        setError("This account already exists. Please sign in.")
      } else if (code === "auth/weak-password") {
        setError("Password should be at least 6 characters.")
      } else {
        setError(err?.message || "Sign in failed. Please try again.")
      }
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm text-center">

        {/* Logo */}
        <div className="mx-auto mb-8">
          <Logo size={56} />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="mt-1.5 text-sm text-muted-foreground mb-8">
          Sign in to continue
        </p>

        {/* Error */}
        {error && (
          <Alert variant="destructive" className="mb-4 text-start rounded-xl">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <AlertDescription className="text-xs leading-relaxed">{error}</AlertDescription>
          </Alert>
        )}

        {/* Success */}
        {success && (
          <Alert className="mb-4 text-start rounded-xl border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-xs leading-relaxed">{success}</AlertDescription>
          </Alert>
        )}

        {/* Native In-app Username & Password form */}
        <div className="pt-1">
          {isForgotPassword ? (
            <form onSubmit={handleResetPassword} className="space-y-3.5 text-start">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Enter your username (the part before @ in Gmail) to receive a password setup link.
              </p>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Username
                </label>
                <Input
                  type="text"
                  placeholder="e.g. omar.mo3031"
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
                className="w-full h-11 rounded-xl font-medium text-sm transition-all"
              >
                {isSigningIn ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Send Password Link"
                )}
              </Button>
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false)
                    setError(null)
                  }}
                  className="text-xs text-primary hover:underline transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-3.5 text-start">
              {isSignUp && (
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">
                    Full Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Full Name"
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
                    Username
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    part before @
                  </span>
                </div>
                <Input
                  type="text"
                  placeholder="e.g. omar.mo3031"
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
                    Password
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    Default: 123456
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
                      setError(null)
                      setSuccess(null)
                    }}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSigningIn}
                className="w-full h-11 rounded-xl font-medium text-sm transition-all"
              >
                {isSigningIn ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isSignUp ? (
                  "Create Account"
                ) : (
                  "Sign In"
                )}
              </Button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp)
                    setError(null)
                  }}
                  className="text-xs text-primary hover:underline transition-colors"
                >
                  {isSignUp
                    ? "Already have an account? Sign In"
                    : "Need an account? Sign Up"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="mt-8 text-[11px] text-muted-foreground/60">
          Only authorized employees can access this system
        </p>
      </div>
    </div>
  )
}