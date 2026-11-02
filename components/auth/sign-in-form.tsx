"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { Logo } from "@/components/ui/logo"

export function SignInForm() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, loading } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [showEmailAuth, setShowEmailAuth] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)

  const handleGoogleSignIn = async () => {
    try {
      setError(null)
      setIsSigningIn(true)
      await signInWithGoogle()
    } catch (error: any) {
      if (
        error?.code !== "auth/popup-closed-by-user" &&
        error?.code !== "auth/cancelled-popup-request"
      ) {
        console.warn("Sign-in notice:", error?.message || error)
        setError("Sign in failed. You can use Email & Password below.")
      }
    } finally {
      setIsSigningIn(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setError("Please enter your email first.")
      return
    }
    setIsSigningIn(true)
    setError(null)
    setSuccess(null)
    try {
      await resetPassword(email)
      setSuccess("Password setup link sent to your email! Open the link to set your password, then return here to log in.")
    } catch (err: any) {
      setError(err?.message || "Failed to send reset link.")
    } finally {
      setIsSigningIn(false)
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError("Please enter both email and password")
      return
    }
    setIsSigningIn(true)
    setError(null)
    setSuccess(null)
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
        setError("Invalid email or password. If you used Google before, click 'Forgot password?' to set a password.")
      } else if (code === "auth/email-already-in-use") {
        setError("This email is already in use. Please sign in.")
      } else if (code === "auth/weak-password") {
        setError("Password should be at least 6 characters.")
      } else if (code === "auth/invalid-email") {
        setError("Invalid email format.")
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

        {/* Sign in with Google */}
        <Button
          onClick={handleGoogleSignIn}
          disabled={loading || isSigningIn}
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

        {/* Divider / Toggle */}
        <div className="relative my-5 flex items-center justify-center">
          <div className="border-t border-border w-full" />
          <button
            type="button"
            onClick={() => {
              setShowEmailAuth(!showEmailAuth)
              setError(null)
              setSuccess(null)
              setIsForgotPassword(false)
            }}
            className="absolute bg-background px-3 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            {showEmailAuth ? "Hide Email Login ▲" : "Or use Email & Password ▼"}
          </button>
        </div>

        {/* Email/Password form */}
        {showEmailAuth && (
          <div className="pt-1">
            {isForgotPassword ? (
              <form onSubmit={handleResetPassword} className="space-y-3 text-start">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Enter your registered email and we will send you a link to set/reset your password.
                </p>
                <div>
                  <Input
                    type="email"
                    placeholder="Email"
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
              <form onSubmit={handleEmailAuth} className="space-y-3 text-start">
                {isSignUp && (
                  <div>
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
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-xl text-sm"
                    required
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder="Password"
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
                  {isSigningIn && showEmailAuth ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isSignUp ? (
                    "Create Account"
                  ) : (
                    "Sign In with Email"
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
                      : "Need an account? Sign Up with Email"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="mt-8 text-[11px] text-muted-foreground/60">
          Only authorized employees can access this system
        </p>
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