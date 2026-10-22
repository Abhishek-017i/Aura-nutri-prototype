import { useState } from 'react'

import { LanguageToggle } from '../lib/language.tsx'
import { useLanguage } from '../lib/useLanguage.ts'
import { useTheme } from '../contexts/useTheme.ts'
import { bodyFontClass, copy, nav, t } from '../lib/copy.ts'
import type { User } from '../lib/types.ts'
import {
  IconChat,
  IconFire,
  IconHistory,
  IconHome,
  IconPlus,
  IconProfile,
  IconCheatDay,
  IconSun,
  IconMoon,
} from './icons.tsx'

export type Tab = 'home' | 'chat' | 'history' | 'profile'

interface LayoutProps {
  user: User
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  onLogout: () => void
  onOpenLog: () => void
  onOpenNutriCard: () => void
  children: React.ReactNode
}

const TABS: { id: Tab; labelKey: string; icon: typeof IconHome }[] = [
  { id: 'home', labelKey: 'home', icon: IconHome },
  { id: 'chat', labelKey: 'chat', icon: IconChat },
  { id: 'history', labelKey: 'history', icon: IconHistory },
  { id: 'profile', labelKey: 'profile', icon: IconProfile },
]

export function Layout({
  user,
  activeTab,
  onTabChange,
  onLogout,
  onOpenLog,
  onOpenNutriCard,
  children,
}: LayoutProps) {
  const { language } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)

  const initial = user.name.trim().charAt(0).toUpperCase() || 'U'

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Botanical Watermarks */}
      <div className="fixed top-0 left-0 w-64 h-64 -translate-x-1/4 -translate-y-1/4 pointer-events-none opacity-[0.15]">
        <svg viewBox="0 0 100 100" fill="currentColor" className="text-primary w-full h-full">
          <path d="M10,90 Q40,90 40,50 Q40,10 90,10 Q60,10 60,50 Q60,90 10,90 Z" />
          <path d="M20,70 Q50,60 70,30 Q40,40 20,70 Z" />
        </svg>
      </div>
      <div className="fixed bottom-0 right-0 w-80 h-80 translate-x-1/3 translate-y-1/3 pointer-events-none opacity-[0.15]">
        <svg viewBox="0 0 100 100" fill="currentColor" className="text-primary w-full h-full transform rotate-180">
          <path d="M10,90 Q40,90 40,50 Q40,10 90,10 Q60,10 60,50 Q60,90 10,90 Z" />
          <path d="M20,70 Q50,60 70,30 Q40,40 20,70 Z" />
        </svg>
      </div>
      <header className="fixed top-0 inset-x-0 z-40 bg-background border-b border-border">
        <div className="max-w-dashboard mx-auto px-4 h-14 flex items-center justify-between">
          <LanguageToggle />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center text-text-main hover:text-primary transition-colors"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <IconSun className="w-4 h-4" />
              ) : (
                <IconMoon className="w-4 h-4" />
              )}
            </button>
            <IconFire className="w-6 h-6 text-rose" />
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center text-sm font-sans font-semibold text-text-main"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                {initial}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-card border border-border rounded-card shadow-modal overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      onLogout()
                    }}
                    className={`${bodyFontClass(language)} w-full px-4 py-3 text-left text-sm text-text-main hover:bg-background`}
                  >
                    {t(copy.dashboard.logout, language)}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="pt-14 pb-24">{children}</main>

      <button
        type="button"
        onClick={onOpenNutriCard}
        className="fixed bottom-20 left-4 z-30 w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center text-text-muted hover:text-text-main"
        aria-label="NutriCard"
      >
        <IconCheatDay className="w-5 h-5" />
      </button>

      <button
        type="button"
        onClick={onOpenLog}
        className="fixed bottom-20 right-4 z-30 w-14 h-14 rounded-card bg-primary hover:bg-primary-hover border border-primary flex items-center justify-center text-white dark:text-background shadow-none transition-colors"
        aria-label={t(copy.dashboard.logMeal, language)}
      >
        <IconPlus className="w-7 h-7" />
      </button>

      <nav className="fixed bottom-0 inset-x-0 z-30 bg-card border-t border-border">
        <div className="max-w-dashboard mx-auto h-14 flex items-center justify-around">
          {TABS.map(({ id, labelKey, icon: Icon }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                className={[
                  'flex flex-col items-center justify-center gap-0.5 w-16 h-12 rounded-data transition-colors',
                  isActive
                    ? 'bg-soft-accent text-text-main'
                    : 'text-text-muted hover:text-text-main',
                ].join(' ')}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-5 h-5" />
                <span className={`${bodyFontClass(language)} text-[10px] font-medium`}>
                  {t(nav[labelKey], language)}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
