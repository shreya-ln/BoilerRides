import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { APIProvider } from '@vis.gl/react-google-maps'
import { format, parseISO } from 'date-fns'
import { AlertCircle, CalendarIcon, Car, CheckCircle2, Clock, MapPin, Send, Users } from 'lucide-react'

import Navigation from '@/components/Navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import PlaceAutocomplete from '@/components/PlaceAutocomplete'
import { rideRequestService } from '@/lib/rideRequestService'
import { joinRequestService } from '@/lib/joinRequestService'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'

interface SimilarRide {
  id: number
  origin: string
  destination: string
  ride_date: string
  ride_time: string
  seats_available: number
  total_seats: number
  driver_id: string
  price?: number
  car_type?: string | null
  special_moment?: string | null
  profiles?: {
    first_name?: string | null
    last_name?: string | null
  } | any
}

const RequestRide = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()

  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [rideDate, setRideDate] = useState<Date | null>(null)
  const [rideTime, setRideTime] = useState('')
  const [seats, setSeats] = useState('1')
  const [message, setMessage] = useState('')

  const [checkingSimilar, setCheckingSimilar] = useState(false)
  const [similarChecked, setSimilarChecked] = useState(false)
  const [similarRides, setSimilarRides] = useState<SimilarRide[]>([])
  const [similarRideRequests, setSimilarRideRequests] = useState<any[]>([])
  const [submittingRequest, setSubmittingRequest] = useState(false)
  const [joiningRideId, setJoiningRideId] = useState<number | null>(null)
  const [joiningRequestId, setJoiningRequestId] = useState<number | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

  const validate = () => {
    const errors: Record<string, string> = {}
    if (!origin.trim()) errors.origin = 'Origin is required'
    if (!destination.trim()) errors.destination = 'Destination is required'
    if (!rideDate) {
      errors.rideDate = 'Date is required'
    } else {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const candidate = new Date(rideDate)
      candidate.setHours(0, 0, 0, 0)
      if (candidate < today) {
        errors.rideDate = 'Date cannot be in the past'
      }
    }
    const seatsNum = Number(seats)
    if (!seats || Number.isNaN(seatsNum) || seatsNum < 1) {
      errors.seats = 'Seats must be at least 1'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const buildPayload = () => ({
    origin: origin.trim(),
    destination: destination.trim(),
    rideDate: rideDate ? format(rideDate, 'yyyy-MM-dd') : '',
    rideTime: rideTime || null,
    seats: Number(seats),
    message: message.trim() || null
  })

  const handleCheckSimilar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setCheckingSimilar(true)
    setSimilarChecked(false)
    try {
      const payload = buildPayload()
      const result = await rideRequestService.findSimilar({
        origin: payload.origin,
        destination: payload.destination,
        rideDate: payload.rideDate,
        rideTime: rideTime || undefined
      })
      setSimilarRides(result?.rides || [])
      setSimilarRideRequests(result?.rideRequests || [])
      setSimilarChecked(true)
    } catch (err: any) {
      toast({
        title: 'Could not search for rides',
        description: err?.message || 'Please try again.',
        variant: 'destructive'
      })
    } finally {
      setCheckingSimilar(false)
    }
  }

  const handleJoinRideRequest = async (request: any) => {
    setJoiningRequestId(request.id)
    try {
      await rideRequestService.joinRideRequest(request.id)
      toast({
        title: 'Joined ride request',
        description: 'You have been added to this ride request.'
      })
      navigate('/rides')
    } catch (err: any) {
      toast({
        title: 'Could not join ride request',
        description: err?.message || 'Please try again.',
        variant: 'destructive'
      })
    } finally {
      setJoiningRequestId(null)
    }
  }

  const handleCreateRequest = async () => {
    if (!validate()) return
    setSubmittingRequest(true)
    try {
      const payload = buildPayload()
      await rideRequestService.create(payload)
      toast({
        title: 'Ride request sent',
        description: 'We saved your request. You will be notified when a driver matches.',
        variant: 'default'
      })
      navigate('/rides')
    } catch (err: any) {
      toast({
        title: 'Could not create request',
        description: err?.message || 'Please try again.',
        variant: 'destructive'
      })
    } finally {
      setSubmittingRequest(false)
    }
  }

  const handleJoinRide = async (ride: SimilarRide) => {
    if (!user?.id) return
    const seatsNum = Number(seats) || 1
    if (seatsNum > Number(ride.seats_available || 0)) {
      toast({
        title: 'Not enough seats',
        description: `Only ${ride.seats_available} seat${ride.seats_available === 1 ? '' : 's'} left on this ride.`,
        variant: 'destructive'
      })
      return
    }

    setJoiningRideId(ride.id)
    try {
      await joinRequestService.create({
        rideId: ride.id,
        seats: seatsNum,
        message: message.trim() || undefined
      })
      toast({
        title: 'Request sent to driver',
        description: 'Your join request was sent. We will notify you when it is reviewed.',
      })
      navigate('/rides')
    } catch (err: any) {
      toast({
        title: 'Could not send join request',
        description: err?.message || 'Please try again.',
        variant: 'destructive'
      })
    } finally {
      setJoiningRideId(null)
    }
  }

  const renderSimilarRides = () => {
    if (!similarChecked) return null
    if (similarRides.length === 0) {
      return (
        <Alert className="bg-muted">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No similar rides found</AlertTitle>
          <AlertDescription>
            We couldn't find rides that match your route and date. You can still create your ride request and we'll alert drivers.
          </AlertDescription>
        </Alert>
      )
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-secondary">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <p className="font-semibold">
              {similarRides.length} similar ride{similarRides.length === 1 ? '' : 's'} found
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSimilarChecked(false)}>Change details</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {similarRides.map((ride) => (
            <Card key={ride.id} className="border-primary/30 hover:shadow-purdue transition">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <p className="font-semibold text-secondary">{ride.origin} → {ride.destination}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>
                      {format(parseISO(ride.ride_date), 'EEE, MMM d')} at{' '}
                      {ride.ride_time ? format(new Date(`1970-01-01T${ride.ride_time}`), 'h:mm a') : 'Time TBD'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{ride.seats_available}/{ride.total_seats} seats left</span>
                  </div>
                  {ride.car_type && (
                    <div className="flex items-center gap-1">
                      <Car className="h-4 w-4" />
                      <span>{ride.car_type}</span>
                    </div>
                  )}
                  {typeof ride.price !== 'undefined' && (
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="border-primary text-primary">
                        ${Number(ride.price).toFixed(2)} / seat
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-secondary flex flex-col">
                    <span className="font-semibold">
                      Driver:{' '}
                      <button
                        type="button"
                        className="text-primary underline underline-offset-2"
                        onClick={() => {
                          const driverId = Array.isArray(ride.profiles) ? ride.profiles[0]?.id : ride.profiles?.id
                          if (driverId) {
                            navigate(`/profiles/${driverId}`)
                          }
                        }}
                      >
                        {(ride.profiles?.first_name || '')} {(ride.profiles?.last_name || '')}
                      </button>
                    </span>
                    {ride.special_moment && (
                      <span className="text-xs text-muted-foreground">Note: {ride.special_moment}</span>
                    )}
                  </div>
                  <Button
                    onClick={() => handleJoinRide(ride)}
                    disabled={joiningRideId === ride.id || ride.driver_id === user?.id}
                    className="bg-gradient-primary"
                  >
                    {joiningRideId === ride.id ? 'Sending...' : 'Join this ride'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const renderSimilarRideRequests = () => {
    if (!similarChecked) return null
    if (similarRideRequests.length === 0) {
      return null
    }
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-secondary">
          <CheckCircle2 className="h-5 w-5 text-amber-500" />
          <p className="font-semibold">
            {similarRideRequests.length} similar ride request{similarRideRequests.length === 1 ? '' : 's'} found
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {similarRideRequests.map((req) => (
            <Card key={req.id} className="border-amber-300 hover:shadow-purdue transition">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <p className="font-semibold text-secondary">{req.origin} → {req.destination}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>
                      {format(parseISO(req.ride_date), 'EEE, MMM d')} at{' '}
                      {req.ride_time ? format(new Date(`1970-01-01T${req.ride_time}`), 'h:mm a') : 'Time TBD'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{req.seats} seats requested</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-secondary flex flex-col">
                    <span className="font-semibold">
                      Rider:{' '}
                      <button
                        type="button"
                        className="text-primary underline underline-offset-2"
                        onClick={() => {
                          const riderId = Array.isArray(req.profiles) ? req.profiles[0]?.id : req.profiles?.id
                          if (riderId) navigate(`/profiles/${riderId}`)
                        }}
                      >
                        {(req.profiles?.first_name || '')} {(req.profiles?.last_name || '')}
                      </button>
                    </span>
                    {req.message && (
                      <span className="text-xs text-muted-foreground line-clamp-2">Note: {req.message}</span>
                    )}
                  </div>
                  <Button
                    onClick={() => handleJoinRideRequest(req)}
                    disabled={joiningRequestId === req.id || req.rider_id === user?.id}
                    className="bg-gradient-primary"
                  >
                    {joiningRequestId === req.id ? 'Joining...' : 'Join this request'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <APIProvider apiKey={apiKey} solutionChannel='GMP_devsite_samples_v3_rgmautocomplete'>
      <div className="min-h-screen bg-background">
        <Navigation isLoggedIn={true} onSignOut={() => navigate('/')} />

        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <p className="text-sm uppercase tracking-widest text-primary font-semibold">Request a ride</p>
              <h1 className="text-3xl font-bold text-secondary mt-1">Tell us where you need to go</h1>
              <p className="text-muted-foreground mt-1">We'll check if a ride already exists before saving your request.</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/rides')}>Back to rides</Button>
          </div>

          <Card className="shadow-purdue">
            <CardHeader>
              <CardTitle className="text-secondary">Your trip details</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleCheckSimilar}>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From<span className="text-destructive"> *</span></Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                      <PlaceAutocomplete
                        placeholder="e.g., Purdue University"
                        onPlaceSelect={(place) => place?.formatted_address && setOrigin(place.formatted_address)}
                        value={origin}
                        onChange={setOrigin}
                        className={`${fieldErrors.origin ? 'border-destructive' : ''}`}
                      />
                    </div>
                    {fieldErrors.origin && <p className="text-sm text-destructive">{fieldErrors.origin}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>To<span className="text-destructive"> *</span></Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                      <PlaceAutocomplete
                        placeholder="e.g., Indianapolis"
                        onPlaceSelect={(place) => place?.formatted_address && setDestination(place.formatted_address)}
                        value={destination}
                        onChange={setDestination}
                        className={`${fieldErrors.destination ? 'border-destructive' : ''}`}
                      />
                    </div>
                    {fieldErrors.destination && <p className="text-sm text-destructive">{fieldErrors.destination}</p>}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Date<span className="text-destructive"> *</span></Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full justify-start text-left font-normal ${fieldErrors.rideDate ? 'border-destructive' : ''}`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {rideDate ? format(rideDate, 'PPP') : 'Select a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0" align="start">
                        <Calendar mode="single" selected={rideDate} onSelect={setRideDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                    {fieldErrors.rideDate && <p className="text-sm text-destructive">{fieldErrors.rideDate}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Time (optional)</Label>
                    <Input type="time" value={rideTime} onChange={(e) => setRideTime(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Seats needed<span className="text-destructive"> *</span></Label>
                    <Input
                      type="number"
                      min={1}
                      value={seats}
                      onChange={(e) => setSeats(e.target.value)}
                      className={fieldErrors.seats ? 'border-destructive' : ''}
                    />
                    {fieldErrors.seats && <p className="text-sm text-destructive">{fieldErrors.seats}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes for drivers (optional)</Label>
                  <Textarea
                    placeholder="e.g., I have two bags, flexible on timing."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Badge variant="secondary">Step 1</Badge>
                    <span>Check for existing rides before creating a new request.</span>
                  </div>
                  <Button type="submit" className="bg-gradient-primary" disabled={checkingSimilar}>
                    {checkingSimilar ? 'Searching...' : 'Find similar rides'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="mt-6 space-y-4">
            {renderSimilarRides()}
            {renderSimilarRideRequests()}
            {similarChecked && (
              <div className="flex items-center justify-between flex-col md:flex-row gap-3">
                <div className="text-sm text-muted-foreground">
                  Ready to proceed? We’ll save your ride request so drivers can match with you.
                </div>
                <Button
                  onClick={handleCreateRequest}
                  disabled={submittingRequest}
                  className="bg-gradient-primary"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {submittingRequest ? 'Submitting...' : 'Create my ride request'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </APIProvider>
  )
}

export default RequestRide
