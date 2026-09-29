import { useState } from 'react'

import { login, HTTPError } from '../lib/api.ts'
import { bodyFontClass, copy, t } from '../lib/copy.ts'
import { LanguageToggle } from '../lib/language.tsx'
import { useLanguage } from '../lib/useLanguage.ts'
import type { UserProfile } from '../lib/types.ts'

interface LoginProps {
  onComplete: (user: UserProfile) => void
}

export function Login({ onComplete }: LoginProps) {
  const { language } = useLanguage()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!username.trim() || !password) return

    setLoading(true)
    setError(null)

    try {
      const user = await login({
        username: username.trim(),
        password,
      })
      onComplete(user)
    } catch (err) {
      if (err instanceof HTTPError && err.status === 401) {
        setError(t(copy.login.wrongPassword, language))
      } else if (err instanceof HTTPError) {
        setError(err.message)
      } else {
        // Non-HTTP errors (network, JSON parse, etc.) used to fall into this
        // branch and surface the generic "कुछ गलत हो गया" banner. We now route
        // them to a short inline message so only truly wrong credentials get
        // the prominent inline error.
        setError(t(copy.login.genericError, language))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen w-full max-w-chat mx-auto px-6 py-12 flex flex-col justify-center bg-background">
      <div className="bg-card border border-border rounded-card p-8">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="font-display text-3xl font-semibold text-dark-text">
            {t(copy.login.title, language)}
          </h1>
          <LanguageToggle />
        </div>
        <p className={`${bodyFontClass(language)} text-lg text-muted mb-8`}>
          {t(copy.login.subtitle, language)}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className={`${bodyFontClass(language)} block text-sm font-medium text-dark-text mb-2`}>
              {t(copy.login.usernameLabel, language)}
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t(copy.login.usernamePlaceholder, language)}
              className="w-full px-4 py-3 bg-background border border-border rounded-data font-sans text-dark-text placeholder:text-muted focus-visible:outline-dark-text"
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div>
            <label htmlFor="password" className={`${bodyFontClass(language)} block text-sm font-medium text-dark-text mb-2`}>
              {t(copy.login.passwordLabel, language)}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t(copy.login.passwordPlaceholder, language)}
              className="w-full px-4 py-3 bg-background border border-border rounded-data font-sans text-dark-text placeholder:text-muted focus-visible:outline-dark-text"
              disabled={loading}
              autoComplete="current-password"
            />
            {error && (
              <p className={`${bodyFontClass(language)} mt-2 text-sm text-rose`}>{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className={`${bodyFontClass(language)} w-full px-6 py-3 bg-primary text-white rounded-data font-medium disabled:opacity-50`}
          >
            {loading ? t(copy.login.saving, language) : t(copy.login.continue, language)}
          </button>
        </form>
      </div>

      <p className={`${bodyFontClass(language)} mt-6 text-xs text-muted text-center`}>
        AURA-Nutri provides food intelligence, not medical advice. Always consult a
        qualified physician or registered dietitian before changing your diet or taking
        supplements.
      </p>
    </main>
  )
}
