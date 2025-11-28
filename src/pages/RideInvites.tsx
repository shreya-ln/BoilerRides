import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navigation from '@/components/Navigation'
import { rideInviteService, RideInvite } from '@/lib/rideInviteService'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Clock, User } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { toast } from '@/hooks/use-toast'

type ViewMode = 'driver' | 'rider'

const RideInvites = () => {
  const navigate = useNavigate()
  const params = useParams()
  const rideIdParam = params.rideId ? Number(params.rideId) : null
  const [invites, setInvites] = useState<RideInvite[]>([])
  const [loading, setLoading] = useState(false)
  const [actionId, setActionId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>(rideIdParam ? 'driver' : 'rider')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      let data: RideInvite[] = []
      if (viewMode === 'driver') {
        data = rideIdParam ? await rideInviteService.listForRide(rideIdParam) : await rideInviteService.listForDriver()
      } else {
        data = await rideInviteService.listMine()
      }
      setInvites(data || [])
    } catch (e: any) {
      console.error('Failed to load invites', e)
      setErrorMsg(e?.message || 'Unable to load invites')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [rideIdParam, viewMode])

  const handleAccept = async (inviteId: number) => {
    setActionId(inviteId)
    try {
      await rideInviteService.accept(inviteId)
      toast({ title: 'Invite accepted', description: 'Your seat is reserved.' })
      load()
    } catch (err: any) {
      toast({ title: 'Unable to accept', description: err?.message || 'Please try again.', variant: 'destructive' })
    } finally {
      setActionId(null)
    }
  }

  const handleDecline = async (inviteId: number) => {
    setActionId(inviteId)
    try {
      await rideInviteService.decline(inviteId)
      toast({ title: 'Invite declined' })
      load()
    } catch (err: any) {
      toast({ title: 'Unable to decline', description: err?.message || 'Please try again.', variant: 'destructive' })
    } finally {
      setActionId(null)
    }
  }

  const title = 'Ride Invites'
  const subtitle = viewMode === 'driver'
    ? 'Riders you have invited to your rides.'
    : 'Invites you have received.'

  return (
    <div className="min-h-screen bg-background">
      <Navigation isLoggedIn={true} onSignOut={() => navigate('/')} />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-secondary">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
          {!rideIdParam && (
            <div className="mt-4 flex gap-3">
              <Button variant={viewMode === 'driver' ? 'default' : 'outline'} onClick={() => setViewMode('driver')}>
                My ride invitees statuses
              </Button>
              <Button variant={viewMode === 'rider' ? 'default' : 'outline'} onClick={() => setViewMode('rider')}>
                My ride request invites
              </Button>
            </div>
          )}
        </div>

        {loading && <p className="text-muted-foreground">Loading...</p>}
        {errorMsg && <p className="text-destructive">{errorMsg}</p>}
        <div className="space-y-4">
          {invites.map((invite) => {
            const ride = invite.rides || {}
            const driver = Array.isArray(ride.profiles) ? ride.profiles[0] : ride.profiles
            const riderProfile = Array.isArray(invite.profiles) ? invite.profiles[0] : invite.profiles
            return (
              <Card key={invite.id} className="hover:shadow-purdue transition">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <p className="font-semibold text-secondary">{ride.origin} → {ride.destination}</p>
                    </div>
                    <Badge variant={invite.status === 'pending' ? 'outline' : 'secondary'}>{invite.status}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>
                        {ride.ride_date ? format(parseISO(ride.ride_date), 'EEE, MMM d') : ''}{' '}
                        {ride.ride_time ? `at ${ride.ride_time}` : ''}
                      </span>
                    </div>
                    {viewMode === 'driver' ? (
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>
                          Rider:{' '}
                          <button
                            className="text-primary underline underline-offset-2"
                            onClick={() => riderProfile?.id && navigate(`/profiles/${riderProfile.id}`)}
                          >
                            {(riderProfile?.first_name || '')} {(riderProfile?.last_name || '')}
                          </button>
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>
                          Driver:{' '}
                          <button
                            className="text-primary underline underline-offset-2"
                            onClick={() => driver?.id && navigate(`/profiles/${driver.id}`)}
                          >
                            {(driver?.first_name || '')} {(driver?.last_name || '')}
                          </button>
                        </span>
                      </div>
                    )}
                  </div>
                  {viewMode === 'rider' && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAccept(invite.id)}
                        disabled={invite.status !== 'pending' || actionId === invite.id}
                        className="bg-gradient-primary"
                      >
                        Accept
                      </Button>
                      <Button
                        onClick={() => handleDecline(invite.id)}
                        disabled={invite.status !== 'pending' || actionId === invite.id}
                        variant="outline"
                      >
                        Decline
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
          {!loading && invites.length === 0 && <p className="text-muted-foreground">No invites found.</p>}
        </div>
      </div>
    </div>
  )
}

export default RideInvites
