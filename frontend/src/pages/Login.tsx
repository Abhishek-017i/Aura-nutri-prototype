import { useState } from 'react'

import { login, HTTPError } from '../lib/api.ts'
import { bodyFontClass, copy, t } from '../lib/copy.ts'
import { LanguageToggle } from '../lib/language.tsx'
import { useLanguage } from '../lib/useLanguage.ts'
import { isEmail } from '../lib/userUtils.ts'
import type { UserProfile } from '../lib/types.ts'

interface LoginProps {
  onComplete: (user: UserProfile) => void
}

type AuthMode = 'signin' | 'register'

export function Login({ onComplete }: LoginProps) {
  const { language } = useLanguage()
  const [mode, setMode] = useState<AuthMode>('signin')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const cleanUsername = username.trim()

    if (!cleanUsername || !password) return

    if (mode === 'register') {
      const cleanName = fullName.trim()
      if (!cleanName) {
        setError(language === 'hi' ? 'कृपया अपना पूरा नाम दर्ज करें।' : 'Please enter your full name.')
        return
      }
      if (cleanName.length < 2) {
        setError(
          language === 'hi'
            ? 'नाम कम से कम 2 अक्षरों का होना चाहिए।'
            : 'Name must be at least 2 characters long.',
        )
        return
      }
      if (isEmail(cleanName)) {
        setError(
          language === 'hi'
            ? 'कृपया नाम के स्थान पर ईमेल दर्ज न करें।'
            : 'Please enter your real name, not an email address.',
        )
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      const user = await login({
        username: cleanUsername,
        password,
        name: mode === 'register' ? fullName.trim() : undefined,
      })
      onComplete(user)
    } catch (err) {
      if (err instanceof HTTPError && err.status === 401) {
        setError(t(copy.login.wrongPassword, language))
      } else if (err instanceof HTTPError) {
        setError(err.message)
      } else {
        setError(t(copy.login.genericError, language))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSelectDemoUser = (demoUsername: string) => {
    setUsername(demoUsername)
    setPassword('test123')
    setError(null)
  }

  return (
    <main className="min-h-screen w-full flex flex-col justify-center items-center px-4 sm:px-6 py-8 sm:py-12 relative overflow-hidden bg-background">
      {/* Background Ambient Tints */}
      <div className="fixed -top-16 -left-16 w-80 h-80 rounded-full bg-soft-pink/60 blur-3xl pointer-events-none" />
      <div className="fixed -bottom-16 -right-16 w-96 h-96 rounded-full bg-light-olive/70 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-white border border-border rounded-3xl shadow-card p-6 sm:p-9">
        {/* Header with floral petal icon and language toggle */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-soft-pink border border-border/80 flex items-center justify-center text-primary shadow-sm">
              <span className="text-xl">🌸</span>
            </div>
            <div>
              <span className="font-display font-extrabold text-xl tracking-tight text-plum">
                Women Nutri <span className="text-primary">Aura</span>
              </span>
              <p className="text-[10px] tracking-wider uppercase text-muted font-bold">
                Nutrition · Balance · Wellness
              </p>
            </div>
          </div>
          <LanguageToggle />
        </div>

        {/* Tab Toggle: Sign In vs Register */}
        <div className="flex p-1 bg-background rounded-2xl border border-border/80 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('signin')
              setError(null)
            }}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
              mode === 'signin'
                ? 'bg-white text-plum shadow-sm'
                : 'text-muted hover:text-plum'
            }`}
          >
            {language === 'hi' ? 'लॉग इन' : 'Sign In'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register')
              setError(null)
            }}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
              mode === 'register'
                ? 'bg-white text-plum shadow-sm'
                : 'text-muted hover:text-plum'
            }`}
          >
            {language === 'hi' ? 'नया खाता बनाएं' : 'Create Account'}
          </button>
        </div>

        <h1 className="font-display text-2xl font-bold text-plum mb-1">
          {mode === 'register'
            ? language === 'hi'
              ? 'अपनी यात्रा शुरू करें'
              : 'Join Women Nutri Aura'
            : t(copy.login.title, language)}
        </h1>
        <p className={`${bodyFontClass(language)} text-xs sm:text-sm text-muted mb-6`}>
          {mode === 'register'
            ? language === 'hi'
              ? 'अपना व्यक्तिगत पोषण और चक्र संतुलन खाता बनाएं।'
              : 'Create your personalized nutrition and cycle-aware health account.'
            : t(copy.login.subtitle, language)}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label
                htmlFor="register-fullname"
                className={`${bodyFontClass(language)} block text-xs font-bold uppercase tracking-wider text-muted mb-1.5`}
              >
                {language === 'hi' ? 'पूरा नाम' : 'Full Name'} <span className="text-primary">*</span>
              </label>
              <input
                id="register-fullname"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={language === 'hi' ? 'उदा. प्रिया शर्मा' : 'e.g. Priya Sharma'}
                className="w-full px-4 py-3 bg-background border border-border rounded-2xl font-sans text-sm text-plum placeholder:text-muted focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                disabled={loading}
                autoComplete="name"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="username"
              className={`${bodyFontClass(language)} block text-xs font-bold uppercase tracking-wider text-muted mb-1.5`}
            >
              {mode === 'register'
                ? language === 'hi'
                  ? 'ईमेल या उपयोगकर्ता नाम'
                  : 'Email or Username'
                : t(copy.login.usernameLabel, language)} <span className="text-primary">*</span>
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={
                mode === 'register'
                  ? 'priya@example.com'
                  : t(copy.login.usernamePlaceholder, language)
              }
              className="w-full px-4 py-3 bg-background border border-border rounded-2xl font-sans text-sm text-plum placeholder:text-muted focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className={`${bodyFontClass(language)} block text-xs font-bold uppercase tracking-wider text-muted mb-1.5`}
            >
              {t(copy.login.passwordLabel, language)} <span className="text-primary">*</span>
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t(copy.login.passwordPlaceholder, language)}
              className="w-full px-4 py-3 bg-background border border-border rounded-2xl font-sans text-sm text-plum placeholder:text-muted focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              disabled={loading}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
            {error && (
              <p className={`${bodyFontClass(language)} mt-2 text-xs text-primary font-bold bg-soft-pink p-3 rounded-2xl border border-primary/20`}>
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !username.trim() || !password || (mode === 'register' && !fullName.trim())}
            className={`${bodyFontClass(language)} w-full mt-2 px-6 py-3.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-full text-sm font-bold shadow-fab hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50`}
          >
            {loading
              ? t(copy.login.saving, language)
              : mode === 'register'
                ? language === 'hi'
                  ? 'खाता बनाएं'
                  : 'Create Account'
                : t(copy.login.continue, language)}
          </button>
        </form>

        {/* Quick Demo Users Switcher */}
        <div className="mt-6 pt-5 border-t border-border/80">
          <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-olive animate-pulse" />
            <span>{language === 'hi' ? 'त्वरित डेमो प्रोफ़ाइल:' : 'Quick Demo Profiles:'}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'priya', label: 'Priya (Luteal)' },
              { id: 'sneha', label: 'Sneha (Menstrual)' },
              { id: 'krisha', label: 'Krisha (Follicular)' },
            ].map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => handleSelectDemoUser(d.id)}
                className="px-2.5 py-1 text-xs font-semibold rounded-full bg-light-olive hover:bg-olive/20 text-olive-deep border border-olive/30 transition-all"
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className={`${bodyFontClass(language)} mt-6 text-xs text-muted text-center max-w-sm relative z-10 px-4`}>
        Women Nutri Aura provides nutritional intelligence, not medical diagnosis. Always consult a
        qualified physician or dietitian for personalized clinical care.
      </p>
    </main>
  )
}
