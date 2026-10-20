import { useEffect, useState } from 'react'

import { LanguageContext } from './languageContext.ts'
import { useLanguage } from './useLanguage.ts'
import type { Language } from './languageContext.ts'

export type { Language }

const STORAGE_KEY = 'aura_language'

function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'en'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'hi' ? 'hi' : 'en'
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getStoredLanguage)

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    window.localStorage.setItem(STORAGE_KEY, lang)
  }

  useEffect(() => {
    document.documentElement.lang = language === 'hi' ? 'hi' : 'en'
  }, [language])

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="inline-flex items-center p-0.5 bg-soft-pink/70 border border-border rounded-full shadow-sm">
      <button
        type="button"
        onClick={() => setLanguage('en')}
        aria-pressed={language === 'en'}
        className={[
          'px-2.5 py-1 text-xs font-sans font-semibold rounded-full transition-all duration-200',
          language === 'en'
            ? 'bg-primary text-white shadow-sm'
            : 'text-muted hover:text-dark-text',
        ].join(' ')}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('hi')}
        aria-pressed={language === 'hi'}
        className={[
          'px-2.5 py-1 text-xs font-sans font-semibold rounded-full transition-all duration-200',
          language === 'hi'
            ? 'bg-primary text-white shadow-sm'
            : 'text-muted hover:text-dark-text',
        ].join(' ')}
      >
        HI
      </button>
    </div>
  )
}
