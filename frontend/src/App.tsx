import { useState } from 'react'

import { Chat } from './pages/Chat.tsx'
import { Dashboard } from './pages/Dashboard.tsx'
import { History } from './pages/History.tsx'
import { Login } from './pages/Login.tsx'
import { NutriCard } from './pages/NutriCard.tsx'
import { Profile } from './pages/Profile.tsx'
import { Layout, type Tab } from './components/Layout.tsx'
import { LogMealModal } from './components/LogMealModal.tsx'
import { NameCompletionModal } from './components/NameCompletionModal.tsx'
import { hasValidName } from './lib/userUtils.ts'
import type { Dashboard as DashboardType, Phase, UserProfile } from './lib/types.ts'

const STORAGE_KEY = 'aura_user'

function loadStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as UserProfile
    // Treat users without a phase as needing to finish setup in Profile.
    if (!parsed.phase) {
      parsed.phase = null
    }
    return parsed
  } catch {
    return null
  }
}

function initialTab(user: UserProfile | null): Tab {
  return user && user.phase ? 'home' : 'profile'
}

function saveUser(user: UserProfile | null) {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(() => loadStoredUser())
  const [activeTab, setActiveTab] = useState<Tab>(() => initialTab(loadStoredUser()))
  const [logOpen, setLogOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [nutriCardOpen, setNutriCardOpen] = useState(false)
  const [nutriCardDashboard, setNutriCardDashboard] = useState<DashboardType | null>(null)

  const handleComplete = (newUser: UserProfile) => {
    saveUser(newUser)
    setUser(newUser)
    setActiveTab(newUser.phase ? 'home' : 'profile')
  }

  const handleLogout = () => {
    saveUser(null)
    setUser(null)
    setActiveTab('home')
    setNutriCardDashboard(null)
    setNutriCardOpen(false)
  }

  const handleLogged = () => {
    setRefreshTrigger((n) => n + 1)
  }

  const handlePhaseChange = (phase: Phase) => {
    setUser((prev) => {
      if (!prev) return prev
      const updated = { ...prev, phase }
      saveUser(updated)
      return updated
    })
  }

  const handleSetupComplete = (updated: UserProfile) => {
    saveUser(updated)
    setUser(updated)
    setActiveTab('home')
  }

  const handleShowNutriCard = (dashboard: DashboardType) => {
    setNutriCardDashboard(dashboard)
    setNutriCardOpen(true)
  }

  const handleCloseNutriCard = () => {
    setNutriCardDashboard(null)
    setNutriCardOpen(false)
  }

  const handleNameComplete = (updatedUser: UserProfile) => {
    saveUser(updatedUser)
    setUser(updatedUser)
  }

  if (!user) {
    return <Login onComplete={handleComplete} />
  }

  return (
    <>
      <Layout
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        onOpenLog={() => setLogOpen(true)}
        onOpenNutriCard={() => setNutriCardOpen(true)}
      >
        {activeTab === 'home' && (
          <Dashboard
            user={user}
            refreshTrigger={refreshTrigger}
            onOpenLog={() => setLogOpen(true)}
          />
        )}
        {activeTab === 'chat' && <Chat user={user} />}
        {activeTab === 'history' && <History user={user} refreshTrigger={refreshTrigger} />}
        {activeTab === 'profile' && (
          <Profile
            user={user}
            refreshTrigger={refreshTrigger}
            onPhaseChange={handlePhaseChange}
            onSetupComplete={handleSetupComplete}
          />
        )}
      </Layout>

      <LogMealModal
        user={user}
        open={logOpen}
        onClose={() => setLogOpen(false)}
        onLogged={handleLogged}
        onShowNutriCard={handleShowNutriCard}
      />

      {nutriCardOpen && user && (
        <NutriCard
          user={user}
          dashboard={nutriCardDashboard || undefined}
          onClose={handleCloseNutriCard}
        />
      )}

      {user && !hasValidName(user) && (
        <NameCompletionModal
          user={user}
          onComplete={handleNameComplete}
        />
      )}
    </>
  )
}
