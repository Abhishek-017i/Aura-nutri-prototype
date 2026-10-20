import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../contexts/useAuth'
import { getUserDoc } from '../lib/firestore'

interface ProtectedRouteProps {
  children: ReactNode
  requirePhase?: boolean
}

export function ProtectedRoute({ children, requirePhase = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const [phaseLoading, setPhaseLoading] = useState<boolean>(false)
  const [hasPhase, setHasPhase] = useState<boolean>(true)

  useEffect(() => {
    let isMounted = true

    if (!user) {
      setPhaseLoading(false)
      return
    }

    if (!requirePhase) {
      setPhaseLoading(false)
      return
    }

    setPhaseLoading(true)
    getUserDoc(user.uid)
      .then((data) => {
        if (!isMounted) return
        if (!data || data.phase === null || data.phase === undefined) {
          setHasPhase(false)
        } else {
          setHasPhase(true)
        }
        setPhaseLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching user doc in ProtectedRoute:', err)
        if (!isMounted) return
        setHasPhase(false)
        setPhaseLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [user, requirePhase])

  useEffect(() => {
    if (!loading && !phaseLoading) {
      if (!user && typeof window !== 'undefined') {
        window.location.hash = '#/login'
      } else if (requirePhase && !hasPhase && typeof window !== 'undefined') {
        window.location.hash = '#/signup'
      }
    }
  }, [loading, phaseLoading, user, requirePhase, hasPhase])

  if (loading || phaseLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] p-6 flex flex-col justify-center items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted font-sans font-medium">Loading your nutrition space...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] p-6 flex flex-col justify-center items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted font-sans font-medium">Redirecting to login...</p>
      </div>
    )
  }

  if (requirePhase && !hasPhase) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] p-6 flex flex-col justify-center items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted font-sans font-medium">Completing your cycle setup...</p>
      </div>
    )
  }

  return <>{children}</>
}
