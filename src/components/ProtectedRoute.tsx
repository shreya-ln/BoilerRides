import { ReactNode, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'

interface ProtectedRouteProps {
  children: ReactNode
  requireProfile?: boolean
}

export const ProtectedRoute = ({ children, requireProfile = false }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading, isComplete } = useProfile()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (authLoading || profileLoading) return

    // If not authenticated, redirect to sign in
    if (!user) {
      navigate('/signin', { 
        state: { from: location.pathname },
        replace: true 
      })
      return
    }

    // If profile is required but not complete, redirect to profile page
    if (requireProfile && !isComplete && location.pathname !== '/profile') {
      navigate('/profile', { 
        state: { message: 'Please complete your profile to continue' },
        replace: true 
      })
      return
    }
  }, [user, profile, isComplete, authLoading, profileLoading, navigate, location, requireProfile])

  // Show loading while checking auth/profile status
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render children if not authenticated
  if (!user) {
    return null
  }

  // Don't render children if profile is required but not complete (except on profile page)
  if (requireProfile && !isComplete && location.pathname !== '/profile') {
    return null
  }

  return <>{children}</>
}

export default ProtectedRoute