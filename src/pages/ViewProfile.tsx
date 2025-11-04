import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { profileService, Profile } from '@/lib/profileService'
import { ArrowLeft, Mail, User } from 'lucide-react'

const getInitials = (first?: string | null, last?: string | null) => {
  const firstInitial = first?.charAt(0) ?? ''
  const lastInitial = last?.charAt(0) ?? ''
  const initials = `${firstInitial}${lastInitial}`.trim()
  return initials ? initials.toUpperCase() : 'U'
}

const buildDisplayName = (profile: Profile | null) => {
  if (!profile) return 'Unknown Rider'
  const parts = [profile.first_name, profile.last_name].filter(Boolean)
  if (parts.length === 0) {
    return profile.email ?? 'Unknown Rider'
  }
  return parts.join(' ')
}

export default function ViewProfile() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setError('Missing profile identifier.')
      setLoading(false)
      return
    }

    let active = true
    const fetchProfile = async () => {
      setLoading(true)
      setError(null)

      const { data, error } = await profileService.getProfile(id)
      if (!active) return

      if (error) {
        const message = error.message.includes('JWT')
          ? 'You must be signed in to view profiles.'
          : error.message || 'Unable to load profile.'
        setError(message)
        setProfile(null)
      } else if (!data) {
        setError('Profile not found.')
        setProfile(null)
      } else {
        setProfile(data)
      }
      setLoading(false)
    }

    fetchProfile()
    return () => {
      active = false
    }
  }, [id])

  const displayName = useMemo(() => buildDisplayName(profile), [profile])
  const initials = useMemo(() => getInitials(profile?.first_name, profile?.last_name), [profile])

  return (
    <div className="min-h-screen bg-muted/40 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="text-sm text-muted-foreground">
            Viewing rider profile
          </div>
        </div>

        <Card>
          <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
            {loading ? (
              <>
                <Skeleton className="h-24 w-24 rounded-full" />
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-56" />
              </>
            ) : (
              <>
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <h1 className="text-2xl font-semibold flex items-center justify-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    {displayName}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {profile?.email || 'No Purdue email on file'}
                  </p>
                </div>

                {(!profile?.first_name || !profile?.last_name || !profile?.email) && (
                  <Alert variant="default" className="max-w-md">
                    <AlertTitle>Incomplete profile</AlertTitle>
                    <AlertDescription>
                      Some details are missing. Encourage this rider to update their profile for more information.
                    </AlertDescription>
                  </Alert>
                )}

                {profile?.bio && (
                  <div className="max-w-2xl text-left">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      About
                    </h2>
                    <p className="mt-2 text-sm leading-6">
                      {profile.bio}
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <Button onClick={() => navigate(-1)} variant="secondary">
                    Go Back
                  </Button>
                  {profile?.email && (
                    <Button variant="outline" onClick={() => window.open(`mailto:${profile.email}`, '_blank')}>
                      <Mail className="mr-2 h-4 w-4" />
                      Email {profile.first_name || 'Rider'}
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Unable to load profile</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
