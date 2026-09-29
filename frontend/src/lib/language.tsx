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
    <div className="inline-flex bg-card border border-border rounded-data overflow-hidden">
      <button
        type="button"
        onClick={() => setLanguage('en')}
        aria-pressed={language === 'en'}
        className={[
          'px-3 py-1 text-sm font-sans font-medium transition-colors',
          language === 'en'
            ? 'bg-primary text-white'
            : 'text-dark-text hover:bg-background',
        ].join(' ')}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('hi')}
        aria-pressed={language === 'hi'}
        className={[
          'px-3 py-1 text-sm font-sans font-medium transition-colors',
          language === 'hi'
            ? 'bg-primary text-white'
            : 'text-dark-text hover:bg-background',
        ].join(' ')}
      >
        HI
      </button>
    </div>
  )
}
