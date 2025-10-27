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
import { useToast } from '@/components/ui/use-toast'
import { format } from 'date-fns'
import { CalendarIcon, Car, MapPin, Users, DollarSign } from 'lucide-react'
import { loadGoogleMaps } from '@/lib/utils'
import { ridesService, CreateRideInput } from '@/lib/ridesService'
import { useAuth } from '@/hooks/useAuth'

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
  const editingId = rideIdParam ? Number(rideIdParam) : null

  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [rideDate, setRideDate] = useState<Date | null>(null)
  const [rideTime, setRideTime] = useState('')
  const [price, setPrice] = useState('')
  const [totalSeats, setTotalSeats] = useState('')
  const [carType, setCarType] = useState('')
  const [carNotes, setCarNotes] = useState('')
  const [specialMoment, setSpecialMoment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loadingRide, setLoadingRide] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const [autocompleteElements, setAutocompleteElements] = useState<{
    origin: any
    destination: any
  }>({ origin: null, destination: null })

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
      setCarType(data.car_type || '')
      setCarNotes(data.car_notes || '')
      setSpecialMoment(data.special_moment || '')
    }
    loadRide()
  }, [editingId, toast])

  // Initialize Google Places Autocomplete for origin/destination using PlaceAutocompleteElement
  useEffect(() => {
    const init = async () => {
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string
        if (!apiKey) return
        await loadGoogleMaps(apiKey)
        const g = (window as any).google
        if (!g?.maps?.places?.PlaceAutocompleteElement) return
        
        const originContainer = document.getElementById('origin-container')
        const destContainer = document.getElementById('destination-container')
        
        // Clean up existing elements
        if (autocompleteElements.origin) {
          autocompleteElements.origin.remove()
        }
        if (autocompleteElements.destination) {
          autocompleteElements.destination.remove()
        }
        
        if (originContainer) {
          const ac1 = new g.maps.places.PlaceAutocompleteElement({
            types: ['geocode'],
            componentRestrictions: { country: 'us' }
          })
          
          // Style the autocomplete element to match our design
          ac1.style.cssText = `
            width: 100%;
            height: 40px;
            padding: 8px 12px 8px 36px;
            border: 1px solid hsl(var(--border));
            border-radius: 6px;
            background-color: hsl(var(--background));
            color: hsl(var(--foreground));
            font-size: 14px;
            outline: none;
          `
          ac1.setAttribute('placeholder', 'e.g., West Lafayette')
          
          // Set up event listener for place selection
          ac1.addEventListener('gmp-placeselect', (event: any) => {
            const place = event.place
            if (place?.formattedAddress) setOrigin(place.formattedAddress)
          })
          
          originContainer.appendChild(ac1)
          setAutocompleteElements(prev => ({ ...prev, origin: ac1 }))
        }
        
        if (destContainer) {
          const ac2 = new g.maps.places.PlaceAutocompleteElement({
            types: ['geocode'],
            componentRestrictions: { country: 'us' }
          })
          
          // Style the autocomplete element to match our design
          ac2.style.cssText = `
            width: 100%;
            height: 40px;
            padding: 8px 12px 8px 36px;
            border: 1px solid hsl(var(--border));
            border-radius: 6px;
            background-color: hsl(var(--background));
            color: hsl(var(--foreground));
            font-size: 14px;
            outline: none;
          `
          ac2.setAttribute('placeholder', 'e.g., Indianapolis')
          
          // Set up event listener for place selection
          ac2.addEventListener('gmp-placeselect', (event: any) => {
            const place = event.place
            if (place?.formattedAddress) setDestination(place.formattedAddress)
          })
          
          destContainer.appendChild(ac2)
          setAutocompleteElements(prev => ({ ...prev, destination: ac2 }))
        }
      } catch (_e) {
        // fail silently if maps unavailable
      }
    }
    init()
    
    // Cleanup function
    return () => {
      if (autocompleteElements.origin) {
        autocompleteElements.origin.remove()
      }
      if (autocompleteElements.destination) {
        autocompleteElements.destination.remove()
      }
    }
  }, [])

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
    if (!totalSeats || isNaN(totalSeatsNum) || totalSeatsNum < 1) errors.totalSeats = 'Enter total seats (>=1)'
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

  return (
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
                    <div 
                      id="origin-container" 
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
                    <div 
                      id="destination-container" 
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
                    <Input id="price" inputMode="decimal" placeholder="e.g., 20" className={`pl-9 ${fieldErrors.price ? 'border-destructive' : ''}`} value={price} onChange={(e) => { setPrice(e.target.value); if (fieldErrors.price) setFieldErrors({ ...fieldErrors, price: '' }) }} />
                  </div>
                  {fieldErrors.price && <p className="text-sm text-destructive">{fieldErrors.price}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialMoment">Special Occasion (optional)</Label>
                <Input id="specialMoment" placeholder="e.g., Artist Concert, Away Basketball Game" value={specialMoment} onChange={(e) => setSpecialMoment(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="carNotes">Notes (luggage, rules, pickup details)</Label>
                <Textarea id="carNotes" rows={4} placeholder="e.g., One suitcase per rider, pickup at PMU" value={carNotes} onChange={(e) => setCarNotes(e.target.value)} />
              </div>

              <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => navigate('/rides')}>Cancel</Button>
                <Button type="submit" className="bg-gradient-primary hover:shadow-glow" disabled={submitting || loadingRide}>
                  {submitting ? (editingId ? 'Saving…' : 'Posting…') : (editingId ? 'Save Changes' : 'Create Ride')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CreateRide


