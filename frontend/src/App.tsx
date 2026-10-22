import { useCallback, useEffect, useState } from 'react'

import { Chat } from './pages/Chat.tsx'
import { Dashboard } from './pages/Dashboard.tsx'
import { History } from './pages/History.tsx'
import { Login } from './pages/Login.tsx'
import { Signup } from './pages/Signup.tsx'
//import { NutriCard } from './pages/NutriCard.tsx'
import { NutriCard } from './components/NutriCard';
import { Profile } from './pages/Profile.tsx'
import { Layout, type Tab } from './components/Layout.tsx'
import { LogMealModal } from './components/LogMealModal.tsx'
import { ProtectedRoute } from './components/ProtectedRoute.tsx'
import { useAuth } from './contexts/useAuth.ts'
import { getUserDoc } from './lib/firestore.ts'
import type { Dashboard as DashboardType, Phase, UserProfile } from './lib/types.ts'

export default function App() {
  const { user: authUser, loading: authLoading, signOut } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [logOpen, setLogOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [nutriCardOpen, setNutriCardOpen] = useState(false)
  const [nutriCardDashboard, setNutriCardDashboard] = useState<DashboardType | null>(null)

  // Client-side hash routing state: #/login, #/signup, or #/ (default)
  const [route, setRoute] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      if (!window.location.hash) {
        window.location.hash = '#/'
        return '/'
      }
      return window.location.hash.replace(/^#/, '') || '/'
    }
    return '/'
  })

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '')
      setRoute(hash || '/')
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Sync profile from Firestore whenever authenticated user changes
  const userId = authUser?.uid
  const userEmail = authUser?.email || ''
  const userDisplayName = authUser?.displayName || ''

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      return
    }
    try {
      const data = await getUserDoc(userId)
      if (data) {
        setProfile({
          id: userId,
          username: (data.username as string) || userEmail,
          name: (data.name as string) || userDisplayName || 'Friend',
          phase: (data.phase as Phase) || null,
          age: typeof data.age === 'number' ? data.age : null,
          gender: (data.gender as string) || 'female',
          dietary_preferences: null,
          target_iron_mg: (data.target_iron_mg as number) || 24,
          target_calcium_mg: (data.target_calcium_mg as number) || 1000,
          target_vit_d_iu: (data.target_vit_d_iu as number) || 600,
          target_b12_mcg: (data.target_b12_mcg as number) || 2.4,
          current_streak: (data.current_streak as number) || 0,
          longest_streak: (data.longest_streak as number) || 0,
          cheat_charms_available: (data.cheat_charms_available as number) || 1,
          cheat_charms_used_this_week: (data.cheat_charms_used_this_week as number) || 0,
          created_at: (data.created_at as string) || new Date().toISOString(),
          updated_at: (data.updated_at as string) || new Date().toISOString(),
        })
      } else {
        setProfile({
          id: userId,
          username: userEmail,
          name: userDisplayName || 'Friend',
          phase: null,
          age: null,
          gender: 'female',
          dietary_preferences: null,
          target_iron_mg: 24,
          target_calcium_mg: 1000,
          target_vit_d_iu: 600,
          target_b12_mcg: 2.4,
          current_streak: 0,
          longest_streak: 0,
          cheat_charms_available: 1,
          cheat_charms_used_this_week: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
    } catch (e) {
      console.error('Failed to load user profile in App:', e)
    }
  }, [userId, userEmail, userDisplayName])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProfile()
  }, [loadProfile, refreshTrigger])

  const handleLogout = async () => {
    try {
      await signOut()
      setNutriCardDashboard(null)
      setNutriCardOpen(false)
      if (typeof window !== 'undefined') {
        window.location.hash = '#/login'
      }
    } catch (err) {
      console.error('Sign out failed:', err)
    }
  }

  const handleLogged = () => {
    setRefreshTrigger((n) => n + 1)
  }

  const handlePhaseChange = (newPhase: Phase) => {
    setProfile((prev) => {
      if (!prev) return prev
      return { ...prev, phase: newPhase }
    })
    setRefreshTrigger((n) => n + 1)
  }

  const handleShowNutriCard = (dashboard: DashboardType) => {
    setNutriCardDashboard(dashboard)
    setNutriCardOpen(true)
  }

  const handleCloseNutriCard = () => {
    setNutriCardDashboard(null)
    setNutriCardOpen(false)
  }

  // Routing
  if (route === '/signup') {
    return (
      <Signup
        onSuccess={async () => {
          // Wait for Firestore & Backend to finish committing the profile
          await new Promise((resolve) => setTimeout(resolve, 1000))
          if (typeof window !== 'undefined') {
            window.location.hash = '#/'
          }
          setRefreshTrigger((n) => n + 1)
        }}
        onNavigateToLogin={() => {
          if (typeof window !== 'undefined') {
            window.location.hash = '#/login'
          }
        }}
      />
    )
  }

  // Force render Login when unauthenticated (per D203) or when on /login
  if (route === '/login' || (!authLoading && !authUser)) {
    return (
      <Login
        onSuccess={() => {
          if (typeof window !== 'undefined') {
            window.location.hash = '#/'
          }
          setRefreshTrigger((n) => n + 1)
        }}
        onNavigateToSignup={() => {
          if (typeof window !== 'undefined') {
            window.location.hash = '#/signup'
          }
        }}
      />
    )
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] p-6 flex flex-col gap-4">
        <div className="h-8 w-48 bg-[#E2E8F0] rounded animate-pulse" />
        <div className="h-32 bg-[#E2E8F0] rounded-lg animate-pulse" />
        <div className="h-64 bg-[#E2E8F0] rounded-lg animate-pulse" />
      </div>
    )
  }

  // Fallback profile object while loading from Firestore
  const fallbackProfile: UserProfile = profile || {
    id: authUser?.uid || '',
    username: authUser?.email || '',
    name: authUser?.displayName || 'Friend',
    phase: null,
    age: null,
    gender: 'female',
    dietary_preferences: null,
    target_iron_mg: 24,
    target_calcium_mg: 1000,
    target_vit_d_iu: 600,
    target_b12_mcg: 2.4,
    current_streak: 0,
    longest_streak: 0,
    cheat_charms_available: 1,
    cheat_charms_used_this_week: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return (
    <ProtectedRoute requirePhase={true}>
      <Layout
        user={fallbackProfile}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={() => void handleLogout()}
        onOpenLog={() => setLogOpen(true)}
        onOpenNutriCard={() => setNutriCardOpen(true)}
      >
        {activeTab === 'home' && (
          <Dashboard
            user={fallbackProfile}
            refreshTrigger={refreshTrigger}
            onOpenLog={() => setLogOpen(true)}
          />
        )}
        {activeTab === 'chat' && <Chat user={fallbackProfile} />}
        {activeTab === 'history' && (
          <History user={fallbackProfile} refreshTrigger={refreshTrigger} />
        )}
        {activeTab === 'profile' && (
          <Profile
            user={fallbackProfile}
            refreshTrigger={refreshTrigger}
            onPhaseChange={handlePhaseChange}
          />
        )}
      </Layout>

      <LogMealModal
        user={fallbackProfile}
        open={logOpen}
        onClose={() => setLogOpen(false)}
        onLogged={handleLogged}
        onShowNutriCard={handleShowNutriCard}
      />

      {nutriCardOpen && (
        <NutriCard
          user={fallbackProfile}
          dashboard={nutriCardDashboard || undefined}
          onClose={handleCloseNutriCard}
        />
      )}
    </ProtectedRoute>
  )
}
