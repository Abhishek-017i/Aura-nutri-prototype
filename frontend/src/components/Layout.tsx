import { useState } from 'react'

import { LanguageToggle } from '../lib/language.tsx'
import { useLanguage } from '../lib/useLanguage.ts'
import { useTheme } from '../contexts/useTheme.ts'
import { bodyFontClass, copy, nav, t } from '../lib/copy.ts'
import type { User } from '../lib/types.ts'
import {
  IconCamera,
  IconChat,
  IconFire,
  IconHistory,
  IconHome,
  IconPlus,
  IconProfile,
  IconSun,
  IconMoon,
} from './icons.tsx'
import { ChatWindow } from './ChatWindow.tsx'

export type Tab = 'home' | 'snap' | 'history' | 'profile' | 'chat'

interface LayoutProps {
  user: User
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  onLogout: () => void
  onOpenLog: () => void
  onOpenNutriCard: () => void
  isChatOpen?: boolean
  onToggleChat?: () => void
  children: React.ReactNode
}

interface NavDestination {
  id: Tab
  labelKey: string
  icon: typeof IconHome
  tourKey: string
}

const LEFT_TABS: NavDestination[] = [
  { id: 'home', labelKey: 'home', icon: IconHome, tourKey: 'home' },
  { id: 'snap', labelKey: 'snapFeed', icon: IconCamera, tourKey: 'snap-feed' },
]

const RIGHT_TABS: NavDestination[] = [
  { id: 'history', labelKey: 'history', icon: IconHistory, tourKey: 'history' },
  { id: 'profile', labelKey: 'profile', icon: IconProfile, tourKey: 'profile' },
]

export function Layout({
  user,
  activeTab,
  onTabChange,
  onLogout,
  onOpenLog,
  isChatOpen = false,
  onToggleChat,
  children,
}: LayoutProps) {
  const { language } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)

  const initial = user.name.trim().charAt(0).toUpperCase() || 'U'

  const renderTabButton = ({ id, labelKey, icon: Icon, tourKey }: NavDestination) => {
    const isActive = activeTab === id
    return (
      <button
        key={id}
        type="button"
        data-tour={tourKey}
        data-guide={`nav-${id}`}
        onClick={() => onTabChange(id)}
        className={[
          'flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-full transition-all duration-150',
          isActive
            ? 'bg-soft-accent text-primary font-semibold dark:bg-[#272731] dark:text-[#E9A5D1] dark:border dark:border-[#34313D] shadow-sm'
            : 'text-text-muted hover:text-text-main hover:bg-soft-accent/40 dark:text-[#A39AAA] dark:hover:text-[#F5F1F7] dark:hover:bg-[#272731]/40',
        ].join(' ')}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon className="w-5 h-5 transition-transform group-hover:scale-105" />
        <span className={`${bodyFontClass(language)} text-[10px] tracking-tight leading-none`}>
          {t(nav[labelKey], language)}
        </span>
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden transition-colors">
      {/* Botanical Watermarks */}
      <div className="fixed top-0 left-0 w-64 h-64 -translate-x-1/4 -translate-y-1/4 pointer-events-none opacity-[0.15] dark:opacity-[0.04]">
        <svg viewBox="0 0 100 100" fill="currentColor" className="text-primary w-full h-full">
          <path d="M10,90 Q40,90 40,50 Q40,10 90,10 Q60,10 60,50 Q60,90 10,90 Z" />
          <path d="M20,70 Q50,60 70,30 Q40,40 20,70 Z" />
        </svg>
      </div>
      <div className="fixed bottom-0 right-0 w-80 h-80 translate-x-1/3 translate-y-1/3 pointer-events-none opacity-[0.15] dark:opacity-[0.04]">
        <svg viewBox="0 0 100 100" fill="currentColor" className="text-primary w-full h-full transform rotate-180">
          <path d="M10,90 Q40,90 40,50 Q40,10 90,10 Q60,10 60,50 Q60,90 10,90 Z" />
          <path d="M20,70 Q50,60 70,30 Q40,40 20,70 Z" />
        </svg>
      </div>

      {/* Top Header */}
      <header className="fixed top-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-b border-border dark:bg-[#15151B]/95 dark:border-[#34313D] transition-colors">
        <div data-guide="header-controls" className="max-w-dashboard mx-auto px-4 h-14 flex items-center justify-between">
          <LanguageToggle />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center text-text-main hover:text-primary dark:bg-[#272731] dark:border-[#34313D] dark:text-[#F5F1F7] dark:hover:bg-[#302D39] dark:hover:text-[#E9A5D1] transition-colors"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <IconSun className="w-4 h-4" />
              ) : (
                <IconMoon className="w-4 h-4" />
              )}
            </button>
            <IconFire className="w-6 h-6 text-rose dark:text-[#E9A5D1]" />
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center text-sm font-sans font-semibold text-text-main dark:bg-[#272731] dark:border-[#34313D] dark:text-[#F5F1F7] dark:hover:bg-[#302D39] transition-colors"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                {initial}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-card border border-border rounded-card shadow-modal overflow-hidden dark:bg-[#272731] dark:border-[#34313D] dark:shadow-xl dark:rounded-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      onLogout()
                    }}
                    className={`${bodyFontClass(language)} w-full px-4 py-3 text-left text-sm text-text-main hover:bg-background dark:text-[#F5F1F7] dark:hover:bg-[#302D39] transition-colors`}
                  >
                    {t(copy.dashboard.logout, language)}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Page Content with ample bottom padding to clear the floating bar */}
      <main className="pt-14 pb-32">{children}</main>

      {/* Floating Ask Aura AI Chatbot Button (Right side above bottom nav) */}
      <button
        data-tour="ai-assistant"
        data-guide="ai-assistant-button"
        type="button"
        onClick={() => {
          if (onToggleChat) {
            onToggleChat()
          } else {
            onTabChange('chat')
          }
        }}
        className="fixed bottom-24 right-4 z-30 sm:right-6 md:right-8 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-card border border-border shadow-lg text-text-main hover:bg-soft-accent dark:bg-[#202027] dark:border-[#34313D] dark:text-[#F5F1F7] dark:hover:bg-[#272731] transition-all duration-200 active:scale-95 group"
        aria-label={t(nav.askAura, language)}
        title={t(nav.askAura, language)}
      >
        <IconChat className="w-5 h-5 text-primary dark:text-[#E9A5D1] group-hover:scale-110 transition-transform" />
        <span className={`${bodyFontClass(language)} text-xs font-semibold tracking-tight`}>
          {t(nav.askAura, language)}
        </span>
      </button>

      {/* Full-screen mobile experience & spacious desktop conversational modal */}
      {isChatOpen && (
        <div
          className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-6 bg-black/50 backdrop-blur-sm dark:bg-black/75 transition-opacity animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-[28px] overflow-hidden shadow-2xl flex flex-col">
            <ChatWindow user={user} onClose={onToggleChat} fullHeight />
          </div>
        </div>
      )}

      {/* Modern Rounded Mobile-App-Style Bottom Navigation Bar */}
      <nav
        aria-label="Primary bottom navigation"
        className="fixed bottom-3 inset-x-3 sm:inset-x-4 max-w-lg mx-auto z-40 bg-card/95 backdrop-blur-md border border-border rounded-full shadow-xl dark:bg-[#15151B]/95 dark:border-[#34313D] dark:shadow-2xl px-2 sm:px-3 py-1.5 transition-colors"
      >
        <div className="flex items-center justify-between relative">
          {/* Left Side Destinations: Home & Snap Feed */}
          <div className="flex items-center justify-around flex-1 pr-3">
            {LEFT_TABS.map(renderTabButton)}
          </div>

          {/* Central Elevated + Food-Add Action Button */}
          <div className="relative -top-4 sm:-top-5 flex-shrink-0 z-50">
            <button
              data-tour="add-food"
              data-guide="add-food-button"
              type="button"
              onClick={onOpenLog}
              className="w-14 h-14 rounded-full bg-primary hover:bg-primary-hover text-white dark:bg-[#E9A5D1] dark:hover:bg-[#CE8BB8] dark:text-[#121216] shadow-lg flex items-center justify-center ring-4 ring-background dark:ring-[#121216] hover:scale-105 active:scale-95 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              aria-label={t(nav.addFood, language)}
              title={t(nav.addFood, language)}
            >
              <IconPlus className="w-7 h-7 stroke-[2.5]" />
            </button>
          </div>

          {/* Right Side Destinations: History & Profile */}
          <div className="flex items-center justify-around flex-1 pl-3">
            {RIGHT_TABS.map(renderTabButton)}
          </div>
        </div>
      </nav>
    </div>
  )
}
