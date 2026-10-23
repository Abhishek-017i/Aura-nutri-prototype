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

type AuthErrorKey = keyof typeof copy.authErrors

function mapAuthErrorCode(errorCode: string): AuthErrorKey {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'invalidEmail'
    case 'auth/user-not-found':
      return 'userNotFound'
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'wrongPassword'
    case 'auth/user-disabled':
      return 'userDisabled'
    case 'auth/too-many-requests':
      return 'tooManyRequests'
    case 'auth/popup-closed-by-user':
      return 'popupClosed'
    case 'auth/network-request-failed':
      return 'networkError'
    default:
      return 'genericLoginError'
  }
}

export function Login({ onSuccess, onNavigateToSignup }: LoginProps) {
  const { language } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null)
  const [rawError, setRawError] = useState<string | null>(null)

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
    setErrorKey(null)
    setRawError(null)

    try {
      await signInWithEmailAndPassword(auth, trimmedEmail, password)
      navigateToHome()
    } catch (err: unknown) {
      const authErr = err as { code?: string; message?: string }
      if (authErr?.code) {
        setErrorKey(mapAuthErrorCode(authErr.code))
        setRawError(null)
      } else {
        setErrorKey(null)
        setRawError(authErr?.message || null)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setErrorKey(null)
    setRawError(null)

    try {
      const provider = new GoogleAuthProvider()
      await signInWithRedirect(auth, provider)
    } catch (err: unknown) {
      const authErr = err as { code?: string; message?: string }
      if (authErr?.code) {
        setErrorKey(mapAuthErrorCode(authErr.code))
        setRawError(null)
      } else {
        setErrorKey(null)
        setRawError(authErr?.message || null)
      }
      setGoogleLoading(false)
    }
  }

  return (
    <main className="min-h-screen w-full max-w-chat mx-auto px-6 py-12 flex flex-col justify-center bg-background transition-colors">
      <div className="bg-card border border-border rounded-card p-8 shadow-sm dark:bg-[#202027] dark:border-[#34313D] dark:rounded-2xl">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="font-display text-3xl font-semibold text-text-main dark:text-[#F5F1F7]">
            {t(copy.login.title, language)}
          </h1>
          <LanguageToggle />
        </div>
        <p className={`${bodyFontClass(language)} text-lg text-text-muted dark:text-[#C5BECF] mb-8`}>
          {t(copy.login.subtitle, language)}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className={`${bodyFontClass(language)} block text-sm font-medium text-text-main dark:text-[#F5F1F7] mb-2`}
            >
              {t(copy.login.emailLabel, language)}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t(copy.login.emailPlaceholder, language)}
              className="w-full px-4 py-3 bg-background border border-border rounded-data font-sans text-text-main placeholder:text-text-muted dark:bg-[#18181F] dark:border-[#34313D] dark:text-[#F5F1F7] dark:placeholder-[#A39AAA] dark:rounded-xl focus-visible:outline-text-main dark:focus-visible:outline-[#E9A5D1]"
              disabled={loading || googleLoading}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className={`${bodyFontClass(language)} block text-sm font-medium text-text-main dark:text-[#F5F1F7] mb-2`}
            >
              {t(copy.login.passwordLabel, language)}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t(copy.login.passwordPlaceholder, language)}
              className="w-full px-4 py-3 bg-background border border-border rounded-data font-sans text-text-main placeholder:text-text-muted dark:bg-[#18181F] dark:border-[#34313D] dark:text-[#F5F1F7] dark:placeholder-[#A39AAA] dark:rounded-xl focus-visible:outline-text-main dark:focus-visible:outline-[#E9A5D1]"
              disabled={loading || googleLoading}
              autoComplete="current-password"
              required
            />
            {(errorKey || rawError) && (
              <p className={`${bodyFontClass(language)} mt-3 text-sm text-rose bg-rose/10 border border-rose/30 p-2.5 rounded-data dark:bg-[#593443]/40 dark:border-[#F08B9C]/50 dark:text-[#F08B9C] dark:rounded-xl`}>
                {errorKey ? t(copy.authErrors[errorKey], language) : rawError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading || !email.trim() || !password}
            className={`${bodyFontClass(language)} w-full px-6 py-3 bg-primary hover:bg-primary-hover text-white dark:text-[#121216] dark:bg-[#E9A5D1] dark:hover:bg-[#CE8BB8] rounded-data dark:rounded-xl font-medium disabled:opacity-50 transition-colors`}
          >
            {loading ? t(copy.login.saving, language) : t(copy.login.logInButton, language)}
          </button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border dark:border-[#34313D]" />
          </div>
          <span className="relative bg-card dark:bg-[#202027] px-3 text-xs uppercase tracking-wider text-text-muted dark:text-[#C5BECF] font-sans">
            {t(copy.login.orDivider, language)}
          </span>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading || googleLoading}
          className={`${bodyFontClass(language)} w-full px-6 py-3 bg-background border border-border text-text-main rounded-data font-medium flex items-center justify-center gap-2 hover:bg-soft-accent/40 dark:bg-[#272731] dark:border-[#34313D] dark:text-[#F5F1F7] dark:hover:bg-[#302D39] dark:rounded-xl disabled:opacity-50 transition-colors`}
        >
          {googleLoading ? t(copy.login.googleSigningIn, language) : t(copy.login.continueWithGoogle, language)}
        </button>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={navigateToSignup}
            className={`${bodyFontClass(language)} text-sm text-primary dark:text-[#E9A5D1] hover:underline font-medium`}
          >
            {t(copy.login.noAccount, language)}
          </button>
        </div>
      </div>

      <p className={`${bodyFontClass(language)} mt-6 text-xs text-text-muted dark:text-[#A39AAA] text-center`}>
        {t(copy.login.disclaimer, language)}
      </p>
    </main>
  )
}
