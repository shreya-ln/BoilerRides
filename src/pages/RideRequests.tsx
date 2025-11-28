import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navigation from '@/components/Navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Clock, Users } from 'lucide-react'
import { rideRequestService, RideRequest } from '@/lib/rideRequestService'
import { format, parseISO } from 'date-fns'

const RideRequests = () => {
  const navigate = useNavigate()
  const [requests, setRequests] = useState<RideRequest[]>([])
  const [viewMode, setViewMode] = useState<'all' | 'mine'>('all')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = viewMode === 'all'
          ? await rideRequestService.listAll()
          : await rideRequestService.listMine()
        setRequests(data || [])
      } catch (e) {
        console.error('Failed to load ride requests', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [viewMode])

  const handleCancel = async (id: number) => {
    try {
      await rideRequestService.cancel(id)
      setRequests((prev) => prev.filter((r) => r.id !== id))
    } catch (e: any) {
      console.error('Failed to cancel', e)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation isLoggedIn={true} onSignOut={() => navigate('/')} />
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-secondary">Ride Requests</h1>
            <p className="text-muted-foreground">View rider requests and create rides from them.</p>
          </div>
          <div className="flex gap-2">
            <Button variant={viewMode === 'all' ? 'default' : 'outline'} onClick={() => setViewMode('all')}>
              All Requests
            </Button>
            <Button variant={viewMode === 'mine' ? 'default' : 'outline'} onClick={() => setViewMode('mine')}>
              My Requests
            </Button>
          </div>
        </div>

        {loading && <p className="text-muted-foreground">Loading...</p>}
        <div className="grid gap-4">
          {requests.map(req => {
            const disabled = req.status !== 'pending' || req.is_completed
            return (
            <Card key={req.id} className="hover:shadow-purdue transition">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <p className="font-semibold text-secondary">{req.origin} → {req.destination}</p>
                  </div>
                  <Badge variant="outline">
                    {req.status === 'cancelled'
                      ? 'cancelled'
                      : req.status === 'matched' || req.is_completed
                        ? 'accepted'
                        : 'pending'}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{format(parseISO(req.ride_date), 'EEE, MMM d')} {req.ride_time ? `at ${req.ride_time}` : ''}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{req.seats} seats needed</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-secondary">
                    Rider:{' '}
                    <button
                      className="text-primary underline underline-offset-2"
                      onClick={() => req.profiles?.id && navigate(`/profiles/${req.profiles.id}`)}
                    >
                      {(req.profiles?.first_name || '')} {(req.profiles?.last_name || '')}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    {!disabled && (
                      <Button onClick={() => navigate(`/rides/create?rideRequestId=${req.id}`)} className="bg-gradient-primary">
                        Create Ride
                      </Button>
                    )}
                    {viewMode === 'mine' && !disabled && (
                      <Button variant="outline" onClick={() => handleCancel(req.id)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )})}
          {!loading && requests.length === 0 && (
            <p className="text-muted-foreground">No ride requests found.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default RideRequests
