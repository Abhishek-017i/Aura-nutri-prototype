import { useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { AuthContext } from './authContextType'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser)
        setLoading(false)
        setError(null)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

  const signOut = async () => {
    try {
      await firebaseSignOut(auth)
      setUser(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign out failed')
      throw err
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
