import { useState } from 'react'
import { Dashboard } from './pages/Dashboard.tsx'
import { Onboarding } from './pages/Onboarding.tsx'
import type { User } from './lib/types.ts'

const STORAGE_KEY = 'aura_user'

function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

function saveUser(user: User | null) {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => loadStoredUser())

  const handleComplete = (newUser: User) => {
    saveUser(newUser)
    setUser(newUser)
  }

  if (user) {
    return <Dashboard user={user} />
  }

  return <Onboarding onComplete={handleComplete} />
}
