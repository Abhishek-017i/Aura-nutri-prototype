// import { useEffect, useState, type ReactNode } from 'react'
// import {
//   getRedirectResult,
//   onAuthStateChanged,
//   signOut as firebaseSignOut,
//   type User,
// } from 'firebase/auth'
// import { auth } from '../lib/firebase'
// import { AuthContext } from './authContextType'
//
// export function AuthProvider({ children }: { children: ReactNode }) {
//   const [user, setUser] = useState<User | null>(null)
//   const [loading, setLoading] = useState<boolean>(true)
//   const [error, setError] = useState<string | null>(null)
//
//   useEffect(() => {
//     const checkRedirectResult = async () => {
//       try {
//         const result = await getRedirectResult(auth)
//         if (result?.user) {
//           console.log('Logged in via redirect:', result.user.email)
//         }
//       } catch (err) {
//         console.error('Redirect result error:', err)
//       }
//     }
//     void checkRedirectResult()
//   }, [])
//
//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(
//       auth,
//       (currentUser) => {
//         setUser(currentUser)
//         setLoading(false)
//         setError(null)
//       },
//       (err) => {
//         setError(err.message)
//         setLoading(false)
//       },
//     )
//
//     return () => unsubscribe()
//   }, [])
//
//   const signOut = async () => {
//     try {
//       await firebaseSignOut(auth)
//       setUser(null)
//     } catch (err) {
//       setError(err instanceof Error ? err.message : 'Sign out failed')
//       throw err
//     }
//   }
//
//   return (
//     <AuthContext.Provider value={{ user, loading, error, signOut }}>
//       {children}
//     </AuthContext.Provider>
//   )
// }
import { useEffect, useState, type ReactNode } from 'react'
import {
  getRedirectResult,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import { AuthContext } from './authContextType'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        // 1. Catch the Google Redirect result FIRST
        const result = await getRedirectResult(auth)
        if (result?.user && mounted) {
          setUser(result.user)
        }
      } catch (err) {
        console.error('Redirect result error:', err)
        if (mounted) setError(err instanceof Error ? err.message : 'Auth error')
      }

      // 2. After redirect check, start listening to auth state
      if (mounted) {
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
        return unsubscribe
      }
    }

    const unsubscribePromise = initAuth()

    return () => {
      mounted = false
      // Cleanup listener if it was created
      void unsubscribePromise.then((unsub) => {
        if (typeof unsub === 'function') unsub()
      })
    }
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