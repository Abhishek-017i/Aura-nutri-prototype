import { useState } from 'react'

import { LanguageToggle } from '../lib/language.tsx'
import { useLanguage } from '../lib/useLanguage.ts'
import { bodyFontClass, copy, nav, t } from '../lib/copy.ts'
import { getDisplayName } from '../lib/userUtils.ts'
import type { User } from '../lib/types.ts'
import {
  IconChat,
  IconHome,
  IconPlus,
  IconProfile,
  IconCheatDay,
  IconBell,
  IconLogoPetals,
  IconUtensils,
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
  { id: 'history', labelKey: 'history', icon: IconUtensils },
  { id: 'chat', labelKey: 'chat', icon: IconChat },
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const displayName = getDisplayName(user)
  const initial = displayName.charAt(0).toUpperCase() || 'W'

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden flex flex-col justify-between">
      {/* Soft Botanical & Petal Watermarks */}
      <div className="fixed top-0 left-0 w-80 h-80 -translate-x-1/3 -translate-y-1/3 pointer-events-none opacity-[0.35] z-0">
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full text-primary/20">
          <path
            d="M30 170 C20 120, 50 60, 110 40 C170 20, 190 70, 170 120 C150 170, 90 190, 30 170 Z"
            fill="currentColor"
          />
        </svg>
      </div>
      <div className="fixed -top-12 -right-12 w-80 h-80 pointer-events-none opacity-[0.25] z-0">
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full text-primary/20">
          <circle cx="120" cy="80" r="75" fill="currentColor" />
          <circle cx="80" cy="120" r="55" fill="currentColor" />
        </svg>
      </div>
      <div className="fixed bottom-12 right-0 w-96 h-96 translate-x-1/4 translate-y-1/4 pointer-events-none opacity-[0.25] z-0">
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full text-olive/20">
          <path
            d="M40 160 C30 100, 70 40, 140 30 C190 20, 200 80, 180 130 C160 180, 90 190, 40 160 Z"
            fill="currentColor"
          />
        </svg>
      </div>

      {/* Top Header */}
      <header className="fixed top-0 inset-x-0 z-40 bg-[#FFF5F7]/95 backdrop-blur-md border-b border-border transition-all">
        <div className="max-w-dashboard mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
              <IconLogoPetals className="w-8 h-8 text-primary drop-shadow-sm" />
            </div>
            <div>
              <div className="flex items-baseline">
                <span className="font-display font-bold text-lg sm:text-xl tracking-tight text-plum">
                  Women Nutri <span className="text-primary font-bold">Aura</span>
                </span>
              </div>
              <p className="text-[9px] tracking-[0.14em] uppercase text-muted font-medium hidden xs:block">
                Nutrition · Balance · Wellness
              </p>
            </div>
          </div>

          {/* Action items: Language, Notifications, Avatar */}
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageToggle />

            {/* Notification Bell with indicator */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((prev) => !prev)}
                className="w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center text-plum shadow-sm hover:bg-soft-pink hover:text-primary transition-all active:scale-95"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
              >
                <IconBell className="w-5 h-5 text-plum" hasAlert={true} />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white border border-border rounded-3xl shadow-modal overflow-hidden p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🔔</span>
                      <h3 className="font-display font-bold text-sm text-plum">Daily Reminders</h3>
                    </div>
                    <span className="text-[10px] font-semibold text-primary bg-soft-pink px-2 py-0.5 rounded-full">
                      New
                    </span>
                  </div>
                  <div className="py-2.5 space-y-2 text-xs">
                    <div className="p-2.5 rounded-2xl bg-soft-pink/50 border border-border">
                      <p className="font-semibold text-plum">Hydration & Nutrient Check 🌸</p>
                      <p className="text-muted text-[11px] mt-0.5">
                        Track your meals today to support your hormonal balance and streak!
                      </p>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-light-olive/70 border border-olive/20">
                      <p className="font-semibold text-olive-deep">Iron & Vitamin C 🌿</p>
                      <p className="text-muted text-[11px] mt-0.5">
                        Pair leafy greens or lentils with lemon for optimal iron absorption.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar with dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-primary-dark p-[2px] shadow-sm hover:scale-105 active:scale-95 transition-all"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="User menu"
              >
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center font-display font-bold text-sm text-primary">
                  {initial}
                </div>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-border rounded-3xl shadow-modal overflow-hidden p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3.5 py-2.5 border-b border-border">
                    <p className="text-xs font-bold text-plum truncate">{displayName}</p>
                    <p className="text-[10px] text-muted truncate">
                      {user.username.includes('@') ? 'Wellness Member' : `@${user.username}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      onTabChange('profile')
                    }}
                    className={`${bodyFontClass(language)} w-full px-3 py-2 text-left text-xs font-medium text-dark-text hover:bg-soft-pink rounded-2xl transition-colors flex items-center gap-2 mt-1`}
                  >
                    <IconProfile className="w-4 h-4 text-plum" />
                    {t(nav.profile, language)}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      onLogout()
                    }}
                    className={`${bodyFontClass(language)} w-full px-3 py-2 text-left text-xs font-medium text-primary hover:bg-soft-pink rounded-2xl transition-colors flex items-center gap-2`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                    </svg>
                    {t(copy.dashboard.logout, language)}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pt-20 pb-28 relative z-10 flex-1">{children}</main>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-20 left-4 sm:left-6 z-30">
        <button
          type="button"
          onClick={onOpenNutriCard}
          className="w-12 h-12 rounded-full bg-white/95 backdrop-blur-md border border-border flex items-center justify-center text-primary shadow-card hover:shadow-card-hover hover:scale-105 active:scale-95 transition-all duration-200"
          aria-label="NutriCard"
          title="Daily NutriCard"
        >
          <IconCheatDay className="w-5 h-5 text-primary" />
        </button>
      </div>

      <div className="fixed bottom-20 right-4 sm:right-6 z-30">
        <button
          type="button"
          onClick={onOpenLog}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-primary-dark border-2 border-white flex items-center justify-center text-white shadow-fab hover:scale-105 active:scale-95 transition-all duration-200"
          aria-label={t(copy.dashboard.logMeal, language)}
          title={t(copy.dashboard.logMeal, language)}
        >
          <IconPlus className="w-7 h-7" />
        </button>
      </div>

      {/* Bottom Navigation with Mobile Safe Area */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-border shadow-sm pb-[env(safe-area-inset-bottom,4px)]">
        <div className="max-w-dashboard mx-auto h-16 px-4 flex items-center justify-around">
          {TABS.map(({ id, labelKey, icon: Icon }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                className={[
                  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all duration-200',
                  isActive
                    ? 'bg-soft-pink text-primary-dark font-bold shadow-sm'
                    : 'text-muted hover:text-plum',
                ].join(' ')}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary-dark' : 'text-muted'}`} />
                <span className={`${bodyFontClass(language)} text-xs tracking-tight ${isActive ? 'inline' : 'hidden sm:inline'}`}>
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
