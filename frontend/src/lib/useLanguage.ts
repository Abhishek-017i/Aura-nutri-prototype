import { useContext } from 'react'

import { LanguageContext } from './languageContext.ts'

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === null) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
