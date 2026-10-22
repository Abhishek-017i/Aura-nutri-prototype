import { useState } from 'react'
import {
  signInWithEmailAndPassword,
  signInWithRedirect,
  GoogleAuthProvider,
} from 'firebase/auth'

import { auth } from '../lib/firebase.ts'
import { bodyFontClass, copy, t } from '../lib/copy.ts'
import { LanguageToggle } from '../lib/language.tsx'
import { useLanguage } from '../lib/useLanguage.ts'

interface LoginProps {
  onSuccess?: () => void
  onNavigateToSignup?: () => void
}

function getFriendlyAuthErrorMessage(errorCode: string, defaultMessage: string): string {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'Invalid email address format.'
    case 'auth/user-not-found':
      return 'No account found with this email. Please sign up.'
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please try again.'
    case 'auth/user-disabled':
      return 'This user account has been disabled.'
    case 'auth/too-many-requests':
      return 'Too many failed login attempts. Please try again later.'
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was closed before completing.'
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and retry.'
    default:
      return defaultMessage || 'Failed to log in. Please check your credentials.'
  }
}

export function Login({ onSuccess, onNavigateToSignup }: LoginProps) {
  const { language } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const navigateToSignup = () => {
    if (onNavigateToSignup) {
      onNavigateToSignup()
    } else if (typeof window !== 'undefined') {
      window.location.hash = '#/signup'
    }
  }

  const navigateToHome = () => {
    if (onSuccess) {
      onSuccess()
    } else if (typeof window !== 'undefined') {
      window.location.hash = '#/'
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) return

    setLoading(true)
    setError(null)

    try {
      await signInWithEmailAndPassword(auth, trimmedEmail, password)
      navigateToHome()
    } catch (err: unknown) {
      const authErr = err as { code?: string; message?: string }
      const friendlyMessage = getFriendlyAuthErrorMessage(
        authErr?.code ?? '',
        authErr?.message ?? 'Sign in failed',
      )
      setError(friendlyMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError(null)

    try {
      const provider = new GoogleAuthProvider()
      await signInWithRedirect(auth, provider)
    } catch (err: unknown) {
      const authErr = err as { code?: string; message?: string }
      const friendlyMessage = getFriendlyAuthErrorMessage(
        authErr?.code ?? '',
        authErr?.message ?? 'Google sign in failed',
      )
      setError(friendlyMessage)
      setGoogleLoading(false)
    }
  }

  return (
    <main className="min-h-screen w-full max-w-chat mx-auto px-6 py-12 flex flex-col justify-center bg-background transition-colors">
      <div className="bg-card border border-border rounded-card p-8 shadow-sm dark:bg-[#876671] dark:border-[#A77D87]/40 dark:rounded-2xl">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="font-display text-3xl font-semibold text-text-main dark:text-[#F7E4E1]">
            {t(copy.login.title, language)}
          </h1>
          <LanguageToggle />
        </div>
        <p className={`${bodyFontClass(language)} text-lg text-text-muted dark:text-[#EBD7D9] mb-8`}>
          {t(copy.login.subtitle, language)}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className={`${bodyFontClass(language)} block text-sm font-medium text-text-main dark:text-[#F7E4E1] mb-2`}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 bg-background border border-border rounded-data font-sans text-text-main placeholder:text-text-muted dark:bg-[#20212A] dark:border-[#A77D87] dark:text-[#F7E4E1] dark:placeholder-[#EBD7D9]/60 dark:rounded-xl focus-visible:outline-text-main"
              disabled={loading || googleLoading}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className={`${bodyFontClass(language)} block text-sm font-medium text-text-main dark:text-[#F7E4E1] mb-2`}
            >
              {t(copy.login.passwordLabel, language)}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t(copy.login.passwordPlaceholder, language)}
              className="w-full px-4 py-3 bg-background border border-border rounded-data font-sans text-text-main placeholder:text-text-muted dark:bg-[#20212A] dark:border-[#A77D87] dark:text-[#F7E4E1] dark:placeholder-[#EBD7D9]/60 dark:rounded-xl focus-visible:outline-text-main"
              disabled={loading || googleLoading}
              autoComplete="current-password"
              required
            />
            {error && (
              <p className={`${bodyFontClass(language)} mt-3 text-sm text-rose bg-rose/10 border border-rose/30 p-2.5 rounded-data dark:bg-[#936F79]/50 dark:border-[#E27B76]/50 dark:text-[#E27B76] dark:rounded-xl`}>
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading || !email.trim() || !password}
            className={`${bodyFontClass(language)} w-full px-6 py-3 bg-primary hover:bg-primary-hover text-white dark:text-[#20212A] dark:bg-[#EAC8C8] dark:hover:bg-[#F7E4E1] rounded-data dark:rounded-xl font-medium disabled:opacity-50 transition-colors`}
          >
            {loading ? t(copy.login.saving, language) : 'Log In'}
          </button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border dark:border-[#A77D87]/40" />
          </div>
          <span className="relative bg-card dark:bg-[#876671] px-3 text-xs uppercase tracking-wider text-text-muted dark:text-[#EBD7D9] font-sans">
            or
          </span>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading || googleLoading}
          className={`${bodyFontClass(language)} w-full px-6 py-3 bg-background border border-border text-text-main rounded-data font-medium flex items-center justify-center gap-2 hover:bg-soft-accent/40 dark:bg-[#936F79] dark:border-[#A77D87] dark:text-[#F7E4E1] dark:hover:bg-[#A77D87] dark:rounded-xl disabled:opacity-50 transition-colors`}
        >
          {googleLoading ? 'Signing in with Google...' : 'Continue with Google'}
        </button>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={navigateToSignup}
            className={`${bodyFontClass(language)} text-sm text-primary dark:text-[#EAC8C8] hover:underline font-medium`}
          >
            Don't have an account? Sign up
          </button>
        </div>
      </div>

      <p className={`${bodyFontClass(language)} mt-6 text-xs text-text-muted dark:text-[#EBD7D9]/70 text-center`}>
        AURA-Nutri provides food intelligence, not medical advice. Always consult a
        qualified physician or registered dietitian before changing your diet or taking
        supplements.
      </p>
    </main>
  )
}
