import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Navigation from '@/components/Navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogDescription } from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { format } from 'date-fns'
import { CalendarIcon, Car, MapPin, Users, DollarSign, Trash2 } from 'lucide-react'
import { ridesService, CreateRideInput } from '@/lib/ridesService'
import { useAuth } from '@/hooks/useAuth'
import { APIProvider } from '@vis.gl/react-google-maps'
import PlaceAutocomplete from '@/components/PlaceAutocomplete'
import { rideRequestService, RideRequest } from '@/lib/rideRequestService'
import { profileService } from '@/lib/profileService'

// Form default popular presets for dates (e.g., next weekend)
function getPopularDatePresets(): { label: string; value: Date }[] {
  const now = new Date()
  const presets: { label: string; value: Date }[] = []
  const nextFriday = new Date(now)
  nextFriday.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7))
  const nextSunday = new Date(nextFriday)
  nextSunday.setDate(nextFriday.getDate() + 2)
  presets.push({ label: 'Next Friday', value: nextFriday })
  presets.push({ label: 'Next Sunday', value: nextSunday })
  // Holiday/event examples for current year still in future
  const year = now.getFullYear()
  const mkDate = (m: number, d: number) => new Date(year, m - 1, d)
  const addIfFuture = (label: string, date: Date) => { if (date >= new Date(new Date().toDateString())) presets.push({ label, value: date }) }
  addIfFuture('Halloween', mkDate(10, 31))
  addIfFuture('Thanksgiving', mkDate(11, 28))
  addIfFuture('Christmas', mkDate(12, 25))
  addIfFuture('New Year’s Eve', mkDate(12, 31))
  return presets
}

const CreateRide = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const rideIdParam = searchParams.get('id')
  const rideRequestIdParam = searchParams.get('rideRequestId')
  const editingId = rideIdParam ? Number(rideIdParam) : null
  const fromRequestId = rideRequestIdParam ? Number(rideRequestIdParam) : null
  const [rideRequest, setRideRequest] = useState<RideRequest | null>(null)
  const [inviteRiderIds, setInviteRiderIds] = useState<string[]>([])
  const [inviteProfiles, setInviteProfiles] = useState<Record<string, any>>({})

  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [rideDate, setRideDate] = useState<Date | null>(null)
  const [rideTime, setRideTime] = useState('')
  const [price, setPrice] = useState('')
  const [totalSeats, setTotalSeats] = useState('')
  const [originLat, setOriginLat] = useState<number | null>(null)
  const [originLng, setOriginLng] = useState<number | null>(null)
  const [destinationLat, setDestinationLat] = useState<number | null>(null)
  const [destinationLng, setDestinationLng] = useState<number | null>(null)
  const [carType, setCarType] = useState('')
  const [carNotes, setCarNotes] = useState('')
  const [specialMoment, setSpecialMoment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loadingRide, setLoadingRide] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)

  useEffect(() => {
    const loadRide = async () => {
      if (!editingId) return
      setLoadingRide(true)
      const { data, error } = await ridesService.getRide(editingId)
      setLoadingRide(false)
      if (error || !data) {
        toast({ title: 'Unable to load ride', description: error?.message || 'Not found', variant: 'destructive' })
        return
      }
      setOrigin(data.origin || '')
      setDestination(data.destination || '')
      setRideDate(data.ride_date ? new Date(data.ride_date) : null)
      setRideTime(data.ride_time || '')
      setPrice(String(data.price ?? ''))
      setTotalSeats(String(data.total_seats ?? ''))
      setOriginLat((data as any).origin_lat ?? null)
      setOriginLng((data as any).origin_lng ?? null)
      setDestinationLat((data as any).destination_lat ?? null)
      setDestinationLng((data as any).destination_lng ?? null)
      setCarType(data.car_type || '')
      setCarNotes(data.car_notes || '')
      setSpecialMoment(data.special_moment || '')
    }
    loadRide()
  }, [editingId, toast])

  useEffect(() => {
    const loadRequest = async () => {
      if (!fromRequestId) return
      try {
        const req = await rideRequestService.getById(fromRequestId)
        if (!req) return
        setRideRequest(req)
        setOrigin(req.origin || '')
        setDestination(req.destination || '')
        setRideDate(req.ride_date ? new Date(req.ride_date) : null)
        setRideTime(req.ride_time || '')
        setTotalSeats(String(req.seats || ''))
        setOriginLat((req as any).origin_lat ?? null)
        setOriginLng((req as any).origin_lng ?? null)
        setDestinationLat((req as any).destination_lat ?? null)
        setDestinationLng((req as any).destination_lng ?? null)
        setInviteRiderIds(Array.from(new Set([req.rider_id, ...(req.interested_rider_ids || [])])))
      } catch (e) {
        console.error('Failed to load ride request', e)
      }
    }
    loadRequest()
  }, [fromRequestId])

  useEffect(() => {
    const loadProfiles = async () => {
      if (!inviteRiderIds.length) {
        setInviteProfiles({})
        return
      }
      const entries: Record<string, any> = {}
      await Promise.all(
        inviteRiderIds.map(async (id) => {
          try {
            const { data } = await profileService.getProfile(id)
            if (data) entries[id] = data
          } catch (e) {
            /* ignore missing profile */
          }
        })
      )
      setInviteProfiles(entries)
    }
    loadProfiles()
  }, [inviteRiderIds])

  // Handle place selection for origin
  const handleOriginSelect = (place: google.maps.places.PlaceResult | null) => {
    if (place?.formatted_address) {
      setOrigin(place.formatted_address)
    }
    const lat = place?.geometry?.location?.lat?.()
    const lng = place?.geometry?.location?.lng?.()
    setOriginLat(typeof lat === 'number' ? lat : null)
    setOriginLng(typeof lng === 'number' ? lng : null)
  }

  // Handle place selection for destination
  const handleDestinationSelect = (place: google.maps.places.PlaceResult | null) => {
    if (place?.formatted_address) {
      setDestination(place.formatted_address)
    }
    const lat = place?.geometry?.location?.lat?.()
    const lng = place?.geometry?.location?.lng?.()
    setDestinationLat(typeof lat === 'number' ? lat : null)
    setDestinationLng(typeof lng === 'number' ? lng : null)
  }

  // Validate form fields
  const validate = (): string[] => {
    const errors: Record<string, string> = {}
    if (!origin.trim()) errors.origin = 'Origin is required'
    if (!destination.trim()) errors.destination = 'Destination is required'
    if (!rideDate) errors.rideDate = 'Date is required'
    else {
      // Check if selected date is in the past
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Reset time to start of day for accurate comparison
      const selectedDate = new Date(rideDate)
      selectedDate.setHours(0, 0, 0, 0)
      if (selectedDate < today) {
        errors.rideDate = 'Cannot select a date in the past'
      }
    }
    if (!rideTime) errors.rideTime = 'Time is required'
    const priceNum = Number(price)
    if (!price || isNaN(priceNum) || priceNum <= 0) errors.price = 'Enter a valid price'
    const totalSeatsNum = Number(totalSeats)
    if (!totalSeats || isNaN(totalSeatsNum) || totalSeatsNum < 1) {
      errors.totalSeats = 'Enter total seats (must be 1 or greater)'
    }
    setFieldErrors(errors)
    return Object.values(errors)
  }

  // Submit handler: create ride and redirect
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) {
      toast({ title: 'Not signed in', description: 'Please sign in to post a ride', variant: 'destructive' })
      return
    }

    const errors = validate()
    if (errors.length) {
      toast({ title: 'Fix the highlighted fields', description: errors.join('\n'), variant: 'destructive' })
      return
    }

    setSubmitting(true)
    const input: CreateRideInput = {
      origin: origin.trim(),
      destination: destination.trim(),
      ride_date: format(rideDate as Date, 'yyyy-MM-dd'),
      ride_time: rideTime,
      price: Number(price),
      total_seats: Number(totalSeats),
      car_type: carType.trim() || null,
      car_notes: carNotes.trim() || null,
      special_moment: specialMoment.trim() || null,
      origin_lat: originLat,
      origin_lng: originLng,
      destination_lat: destinationLat,
      destination_lng: destinationLng
    }

    if (fromRequestId && !editingId) {
      try {
        const result = await rideRequestService.createRideFromRequest(fromRequestId, input, inviteRiderIds)
        toast({ title: 'Ride created', description: 'Invites sent to selected riders.' })
        navigate('/rides')
      } catch (err: any) {
        toast({ title: 'Failed to save ride', description: err?.message || 'Please try again.', variant: 'destructive' })
      } finally {
        setSubmitting(false)
      }
      return
    }

    const { data, error } = editingId
      ? await ridesService.updateRide(editingId, input)
      : await ridesService.createRide(user.id, input)
    setSubmitting(false)

    if (error) {
      toast({ title: 'Failed to save ride', description: error.message, variant: 'destructive' })
      return
    }

    toast({ title: editingId ? 'Ride updated' : 'Ride posted', description: editingId ? 'Changes saved.' : 'Your ride is now visible to students.' })
    navigate('/rides')
  }

  const popularDates = getPopularDatePresets()
  const timePresets = [
    { label: '8:00 AM', value: '08:00' },
    { label: '10:00 AM', value: '10:00' },
    { label: '12:00 PM', value: '12:00' },
    { label: '3:00 PM', value: '15:00' },
    { label: '6:00 PM', value: '18:00' },
  ]
  const locationQuickPicks = [
    { label: 'Purdue University', value: 'Purdue University, West Lafayette, IN' },
    { label: 'Chicago', value: 'Chicago, IL' },
    { label: 'Indianapolis', value: 'Indianapolis, IN' },
  ]

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

  return (
    <APIProvider apiKey={apiKey} solutionChannel='GMP_devsite_samples_v3_rgmautocomplete'>
      <div className="min-h-screen bg-background">
        <Navigation isLoggedIn={true} onSignOut={() => navigate('/')} />

        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-secondary mb-1">Post a Ride</h1>
            <p className="text-muted-foreground">Share your trip with fellow Boilermakers</p>
          </div>

          <Card className="shadow-purdue">
            <CardHeader>
              <CardTitle className="text-secondary">{editingId ? 'Edit Ride' : 'Ride Details'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="origin">From<span className="text-destructive"> *</span></Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                      <PlaceAutocomplete
                        onPlaceSelect={handleOriginSelect}
                        placeholder="e.g., West Lafayette"
                        value={origin}
                        onChange={(val) => { setOrigin(val); setOriginLat(null); setOriginLng(null); }}
                        className={`${fieldErrors.origin ? 'border-destructive' : ''}`}
                      />
                    </div>
                    {fieldErrors.origin && <p className="text-sm text-destructive">{fieldErrors.origin}</p>}
                    <div className="flex gap-2 flex-wrap">
                      {locationQuickPicks.map((p) => (
                        <Button key={`from-${p.label}`} type="button" variant="secondary" size="sm" onClick={() => setOrigin(p.value)}>
                          {p.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="destination">To<span className="text-destructive"> *</span></Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                      <PlaceAutocomplete
                        onPlaceSelect={handleDestinationSelect}
                        placeholder="e.g., Indianapolis"
                        value={destination}
                        onChange={(val) => { setDestination(val); setDestinationLat(null); setDestinationLng(null); }}
                        className={`${fieldErrors.destination ? 'border-destructive' : ''}`}
                      />
                    </div>
                    {fieldErrors.destination && <p className="text-sm text-destructive">{fieldErrors.destination}</p>}
                    <div className="flex gap-2 flex-wrap">
                      {locationQuickPicks.map((p) => (
                        <Button key={`to-${p.label}`} type="button" variant="secondary" size="sm" onClick={() => setDestination(p.value)}>
                          {p.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

              {/* Date section (standalone to prevent clipping into Time) */}
              <div className="space-y-2">
                <Label>Date<span className="text-destructive"> *</span></Label>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={`justify-start text-left font-normal w-full ${fieldErrors.rideDate ? 'border-destructive' : ''}`}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {rideDate ? format(rideDate, 'PPP') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start">
                    <Calendar 
                      mode="single" 
                      selected={rideDate} 
                      onSelect={(d) => { setRideDate(d || null); setDateOpen(false); if (fieldErrors.rideDate) setFieldErrors({ ...fieldErrors, rideDate: '' }) }} 
                      disabled={(date) => {
                        // Disable dates before today
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        return date < today
                      }}
                      modifiersClassNames={{
                        disabled: 'opacity-50 cursor-not-allowed'
                      }}
                      initialFocus 
                    />
                    </PopoverContent>
                  </Popover>
                <div className="flex gap-2 mt-2 flex-wrap w-full">
                    {popularDates.map((p) => {
                      const isPastDate = p.value < new Date(new Date().toDateString())
                      return (
                        <Button 
                          key={p.label} 
                          type="button" 
                          variant="secondary" 
                          size="sm" 
                          disabled={isPastDate}
                          onClick={() => !isPastDate && setRideDate(p.value)}
                        >
                          {p.label}
                        </Button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Legend: <span className="font-semibold text-black">Today</span> is black, <span className="text-primary font-semibold">Selected</span> is gold.</p>
                  {fieldErrors.rideDate && <p className="text-sm text-destructive">{fieldErrors.rideDate}</p>}
                </div>

              {/* Time section (standalone) */}
              <div className="space-y-2 mt-4">
                  <Label htmlFor="rideTime">Time<span className="text-destructive"> *</span></Label>
                  <Input id="rideTime" type="time" className={fieldErrors.rideTime ? 'border-destructive' : ''} value={rideTime} onChange={(e) => { setRideTime(e.target.value); if (fieldErrors.rideTime) setFieldErrors({ ...fieldErrors, rideTime: '' }) }} />
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {timePresets.map((t) => (
                      <Button key={t.value} type="button" variant="secondary" size="sm" onClick={() => setRideTime(t.value)}>
                        {t.label}
                      </Button>
                    ))}
                  </div>
                  {fieldErrors.rideTime && <p className="text-sm text-destructive">{fieldErrors.rideTime}</p>}
                </div>
              

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalSeats">Total seats<span className="text-destructive"> *</span></Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="totalSeats" inputMode="numeric" placeholder="e.g., 3" className={`pl-9 ${fieldErrors.totalSeats ? 'border-destructive' : ''}`} value={totalSeats} onChange={(e) => { setTotalSeats(e.target.value); if (fieldErrors.totalSeats) setFieldErrors({ ...fieldErrors, totalSeats: '' }) }} />
                  </div>
                  {fieldErrors.totalSeats && <p className="text-sm text-destructive">{fieldErrors.totalSeats}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="carType">Make/Model<span className="text-destructive"> *</span></Label>
                  <div className="relative">
                    <Car className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="carType" placeholder="e.g., Toyota Camry, Honda CR-V" className="pl-9" value={carType} onChange={(e) => setCarType(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price per seat ($)<span className="text-destructive"> *</span></Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="price" 
                      inputMode="numeric" 
                      placeholder="e.g., 20" 
                      className={`pl-9 ${fieldErrors.price ? 'border-destructive' : ''}`} 
                      value={price} 
                      onChange={(e) => {
                        // Only allow numeric values (digits and decimal point)
                        const value = e.target.value
                        // Allow empty string, digits, and a single decimal point
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setPrice(value)
                          if (fieldErrors.price) setFieldErrors({ ...fieldErrors, price: '' })
                        }
                      }} 
                    />
                  </div>
                  {fieldErrors.price && <p className="text-sm text-destructive">{fieldErrors.price}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialMoment">Special Occasion (optional)</Label>
                <Input id="specialMoment" placeholder="e.g., Artist Concert, Away Basketball Game" value={specialMoment} onChange={(e) => setSpecialMoment(e.target.value)} />
              </div>

              {fromRequestId && (
                <div className="space-y-2 border rounded-md p-4">
                  <p className="font-semibold text-secondary">Invite riders from this request</p>
                  <p className="text-sm text-muted-foreground">Select which riders to invite. They will need to accept their spot.</p>
                  <div className="flex flex-col gap-2">
                    {inviteRiderIds.map((id) => {
                      const isRequester = id === rideRequest?.rider_id
                      const profile = inviteProfiles[id]
                      const label = profile
                        ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Rider'
                        : isRequester
                          ? `${rideRequest?.profiles?.first_name ?? ''} ${rideRequest?.profiles?.last_name ?? ''}`.trim() || 'Requesting rider'
                          : 'Interested rider'
                      const checked = inviteRiderIds.includes(id)
                      return (
                        <label key={id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setInviteRiderIds((prev) => Array.from(new Set([...prev, id])))
                              } else {
                                setInviteRiderIds((prev) => prev.filter((r) => r !== id))
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="text-primary underline underline-offset-2"
                            onClick={() => navigate(`/profiles/${id}`)}
                          >
                            {label}{isRequester ? ' (requester)' : ''}
                          </button>
                        </label>
                      )
                    })}
                    {inviteRiderIds.length === 0 && (
                      <p className="text-sm text-muted-foreground">No riders selected.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="carNotes">Notes (luggage, rules, pickup details)</Label>
                <Textarea id="carNotes" rows={4} placeholder="e.g., One suitcase per rider, pickup at PMU" value={carNotes} onChange={(e) => setCarNotes(e.target.value)} />
              </div>

              <div className="flex gap-3 justify-between">
                {editingId && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="destructive" disabled={submitting || loadingRide}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Ride
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this ride?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. All riders who booked this ride will be notified and their bookings will be removed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={async () => {
                          const { error, affectedRiders } = await ridesService.deleteRideWithBookings(editingId)
                          if (error) {
                            console.error('Delete failed', error)
                            toast({
                              title: "Error",
                              description: "Failed to delete ride. Please try again.",
                              variant: "destructive"
                            })
                            return
                          }
                          toast({
                            title: "Ride deleted",
                            description: affectedRiders.length > 0 
                              ? `Ride deleted. ${affectedRiders.length} rider(s) were notified.`
                              : "Ride deleted successfully."
                          })
                          navigate('/rides')
                        }}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <div className="flex gap-3 ml-auto">
                  <Button type="button" variant="outline" onClick={() => navigate('/rides')}>Cancel</Button>
                  <Button type="submit" className="bg-gradient-primary hover:shadow-glow" disabled={submitting || loadingRide}>
                    {submitting ? (editingId ? 'Saving…' : 'Posting…') : (editingId ? 'Save Changes' : 'Create Ride')}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
    </APIProvider>
  )
}

export default CreateRide
