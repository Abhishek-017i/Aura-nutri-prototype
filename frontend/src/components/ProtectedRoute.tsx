import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../contexts/useAuth'
import { getUserDoc } from '../lib/firestore'

interface ProtectedRouteProps {
  children: ReactNode
  requirePhase?: boolean
}

export function ProtectedRoute({ children, requirePhase = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const [phaseLoading, setPhaseLoading] = useState<boolean>(() => requirePhase)
  const [hasPhase, setHasPhase] = useState<boolean>(true)

  useEffect(() => {
    let isMounted = true
    if (!requirePhase || !user) {
      return
    }

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
      .catch(() => {
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
      <div className="min-h-screen bg-[#FAF7F2] dark:bg-[#20212A] p-6 flex flex-col gap-4">
        <div className="h-8 w-48 bg-[#E2E8F0] dark:bg-[#936F79] rounded animate-pulse" />
        <div className="h-32 bg-[#E2E8F0] dark:bg-[#876671] rounded-lg animate-pulse" />
        <div className="h-64 bg-[#E2E8F0] dark:bg-[#876671] rounded-lg animate-pulse" />
      </div>
    )
  }

  if (!user || (requirePhase && !hasPhase)) {
    return null
  }

  return <>{children}</>
}
