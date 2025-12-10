import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MapPin, Users, Clock, Search, Plus, Car, CalendarIcon, X, Star } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format, parseISO } from 'date-fns'

import Navigation from '@/components/Navigation'
import RideDetailsDialog from '@/components/RideDetailsDialog'
import RatingModal from '@/components/RatingModal'
import DriverRatingModal from '@/components/DriverRatingModal'
import PaymentModal from '@/components/PaymentModal'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { ridesService } from '@/lib/ridesService'
import { ratingService } from '@/lib/ratingService'
import { riderRatingService } from '@/lib/riderRatingService'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogDescription } from '@/components/ui/alert-dialog'
import { toast } from '@/hooks/use-toast'

const Rides = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState<any>(null)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [showOwnRides, setShowOwnRides] = useState(false)

  const [availableRides, setAvailableRides] = useState<any[]>([])
  const [myRidesState, setMyRidesState] = useState<any[]>([])
  const [myBookings, setMyBookings] = useState<any[]>([])
  const [myTrustedRides, setMyTrustedRides] = useState<Set<Number>>(new Set());

  // Rating modal state
  const [ratingModalOpen, setRatingModalOpen] = useState(false)
  const [selectedBookingForRating, setSelectedBookingForRating] = useState<any>(null)
  const [existingRatings, setExistingRatings] = useState<Map<number, any>>(new Map())

  // Driver rating modal state
  const [driverRatingModalOpen, setDriverRatingModalOpen] = useState(false)
  const [selectedRiderForRating, setSelectedRiderForRating] = useState<any>(null)
  const [existingDriverRatings, setExistingDriverRatings] = useState<Map<number, any>>(new Map())

  // Riders list for driver rating
  const [rideForRating, setRideForRating] = useState<any>(null)
  const [ridersToRate, setRidersToRate] = useState<any[]>([])
  const [loadingRiders, setLoadingRiders] = useState(false)
  const [showRidersDialog, setShowRidersDialog] = useState(false)


  useEffect(() => {
    const fetchRides = async () => {
      try {
        const { data, error } = await ridesService.listRides(undefined, user?.id)
        if (error) return console.error('Error fetching rides:', error)
        const filtered = (data || []).filter((r: any) => showOwnRides || r.driver_id !== user?.id)
        const sorted = filtered.sort((a: any, b: any) => {
          const aOwn = a.driver_id === user?.id ? 1 : 0
          const bOwn = b.driver_id === user?.id ? 1 : 0
          return bOwn - aOwn
        })
        setAvailableRides(sorted)
        
        setAvailableRides(sorted)
      } catch (err) {
        console.error(err)
      }
    }

    fetchRides()
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchRides()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [showOwnRides, user?.id])

  useEffect(() => {
    const fetchMyRides = async () => {
      if (!user?.id) return;

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().split(' ')[0];

      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('driver_id', user.id)
        .not('origin', 'like', '~%')
        .or(`ride_date.gt.${today},and(ride_date.eq.${today},ride_time.gt.${currentTime})`)
        .order('ride_date', { ascending: true })
        .order('ride_time', { ascending: true })

      if (error) return console.error('Error fetching my rides:', error)

      const mapped = (data || []).map((r: any) => ({
        id: r.id,
        from: r.origin,
        to: r.destination,
        date: r.ride_date,
        time: r.ride_time,
        driver_id: r.driver_id,
        passengers: Math.max(0, (Number(r.total_seats) - Number(r.seats_available))),
        totalSeats: r.total_seats,
        seats_available: r.seats_available,
        price: Number(r.price || 0),
        specialMoment: r.special_moment || null,
      }))
      setMyRidesState(mapped)
    }

    fetchMyRides()
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchMyRides()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [user?.id])

  useEffect(() => {
    const fetchMyBookings = async () => {
      if (!user?.id) return
      const { data, error } = await ridesService.getMyBookings(user.id)
      if (error) return console.error('Error fetching my bookings:', error)
      setMyBookings(data || [])

      // Load existing ratings for all bookings
      if (data && data.length > 0) {
        const ratingsMap = new Map()
        for (const booking of data) {
          try {
            const existingRating = await ratingService.getRideRating(booking.ride_id)
            if (existingRating) {
              ratingsMap.set(booking.ride_id, existingRating)
            }
          } catch (err) {
            console.error(`Failed to load rating for ride ${booking.ride_id}:`, err)
          }
        }
        setExistingRatings(ratingsMap)
      }
    }
    fetchMyBookings()
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchMyBookings()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [user?.id])

  useEffect(() => {
    const fetchMyTrustedRides = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('trusted_rides_list')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error("Failed to load trusted rides:", error);
        return;
      }
      const list = data?.trusted_rides_list || [];
      const trustedSet = new Set(list);
      setMyTrustedRides(trustedSet);
    }
    fetchMyTrustedRides();
  }, [user?.id]);

  // Realtime: refresh my bookings when a join_request for this user is updated (e.g., approved)
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`join_requests_user_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'join_requests', filter: `rider_id=eq.${user.id}` },
        async (payload: any) => {
          try {
            const newStatus = payload?.new?.status || payload?.record?.status
            if (newStatus === 'approved') {
              const { data } = await ridesService.getMyBookings(user.id)
              setMyBookings(data || [])
            }
          } catch (err) {
            console.error('Failed to refresh bookings on realtime update', err)
          }
        }
      )
      .subscribe()

    return () => {
      try {
        channel.unsubscribe()
      } catch (e) {
        /* ignore */
      }
    }
  }, [user?.id])

  const searchRides = async () => {
    try {
      const { data, error } = await ridesService.listRides(undefined, user?.id)
      if (error) return console.error('Error fetching rides:', error)

      let filtered = data || []

      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        filtered = filtered.filter((r: any) => r.destination?.toLowerCase().includes(q))
      }

      if (selectedDate) {
        const formattedDate = format(selectedDate, 'yyyy-MM-dd')
        filtered = filtered.filter((r: any) => r.ride_date === formattedDate)
      }

      if (startTime && endTime) {
        filtered = filtered.filter(
          (r: any) => r.ride_time >= startTime && r.ride_time <= endTime
        )
      } else if (startTime) {
        filtered = filtered.filter((r: any) => r.ride_time >= startTime)
      } else if (endTime) {
        filtered = filtered.filter((r: any) => r.ride_time <= endTime)
      }

      if (!showOwnRides) {
        filtered = filtered.filter((r: any) => r.driver_id !== user?.id)
      }

      setAvailableRides(filtered)
    } catch (err) {
      console.error('Unexpected error:', err)
    }
  }

  /**
   * Check if a ride is completed (date/time has passed)
   */
  const isRideCompleted = (rideDate: string, rideTime: string): boolean => {
    const now = new Date()
    const rideDateTime = new Date(`${rideDate}T${rideTime}`)
    // Consider ride completed 10 minutes after scheduled time
    rideDateTime.setMinutes(rideDateTime.getSeconds() + 5)
    return now > rideDateTime
  }

  /**
   * Handle rating submission
   */
  const handleRatingSubmit = async (rating: number, comment?: string) => {
    if (!selectedBookingForRating) return

    try {
      const booking = selectedBookingForRating
      const ride = booking.rides
      
      // Submit rating
      await ratingService.submitRating(ride.id, ride.driver_id, rating, comment)

      // Update existing ratings map
      const updatedRatings = new Map(existingRatings)
      updatedRatings.set(ride.id, { rating, comment })
      setExistingRatings(updatedRatings)

      // Close modal and reset
      setRatingModalOpen(false)
      setSelectedBookingForRating(null)

      toast({
        title: 'Rating submitted',
        description: `You rated ${ride.profiles?.first_name || 'the driver'} ${rating} star${rating !== 1 ? 's' : ''}`
      })
    } catch (error: any) {
      console.error('Error submitting rating:', error)
      throw error
    }
  }

  const handleDriverRatingSubmit = async (rating: number, comment?: string) => {
    if (!selectedRiderForRating) return

    try {
      const rider = selectedRiderForRating
      const ride = rider.ride
      
      // Submit driver rating for rider
      await riderRatingService.submitRating(ride.id, rider.rider_id, rating, comment)

      // Update existing ratings map
      const updatedRatings = new Map(existingDriverRatings)
      updatedRatings.set(ride.id, { rating, comment })
      setExistingDriverRatings(updatedRatings)

      // Close modal and reset
      setDriverRatingModalOpen(false)
      setSelectedRiderForRating(null)

      toast({
        title: 'Rating submitted',
        description: `You rated ${rider.first_name || 'the rider'} ${rating} star${rating !== 1 ? 's' : ''}`
      })
    } catch (error: any) {
      console.error('Error submitting driver rating:', error)
      throw error
    }
  }

  const openRidersToRateDialog = async (ride: any) => {
    setRideForRating(ride)
    setLoadingRiders(true)
    setShowRidersDialog(true)

    try {
      // Fetch riders for this ride
      const { data, error } = await ridesService.getRideBookings(ride.id, user?.id)

      if (error) {
        console.error('Error fetching riders:', error)
        toast({
          title: 'Error',
          description: 'Failed to load riders for this ride',
          variant: 'destructive'
        })
        setLoadingRiders(false)
        return
      }

      // Normalize the data and enrich with ride info
      const normalizedRiders = (data || [])
        .filter((booking: any) => booking.profiles) // Filter out bookings without profile info
        .map((booking: any) => ({
          ...booking,
          rider_id: booking.profiles?.id || booking.rider_id,
          first_name: booking.profiles?.first_name,
          last_name: booking.profiles?.last_name,
          avatar_url: booking.profiles?.avatar_url,
          email: booking.profiles?.email,
          ride: ride
        }))

      setRidersToRate(normalizedRiders)
    } catch (err) {
      console.error('Error fetching riders:', err)
      toast({
        title: 'Error',
        description: 'Failed to load riders',
        variant: 'destructive'
      })
    } finally {
      setLoadingRiders(false)
    }
  }

  const handleRiderSelection = (rider: any) => {
    setSelectedRiderForRating(rider)
    setShowRidersDialog(false)
    setDriverRatingModalOpen(true)
  }

  const toggleTrustedRide = async (rideId: any) => {
    if (!user?.id) return;

    try {
      const updatedSet = new Set(myTrustedRides)
      if (updatedSet.has(rideId)) {
        updatedSet.delete(rideId)
      } else {
        updatedSet.add(rideId)
      }

      const updatedArray = Array.from(updatedSet)
      const { error } = await supabase
        .from('profiles')
        .update({ trusted_rides_list: updatedArray })
        .eq('id', user.id)

      if (error) {
        console.error("Failed to update trusted rides:", error)
        return;
      }
      setMyTrustedRides(updatedSet)
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation isLoggedIn={true} onSignOut={() => { window.location.href = '/' }} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary mb-2">Rides</h1>
          <p className="text-muted-foreground">Find rides or offer your own to fellow Boilermakers</p>
        </div>

        <Tabs defaultValue="find" className="space-y-8">
          <TabsList className="grid w-full grid-cols-3 max-w-3xl">
            <TabsTrigger value="find">Find Rides</TabsTrigger>
            <TabsTrigger value="bookings">My Bookings</TabsTrigger>
            <TabsTrigger value="offer">My Rides</TabsTrigger>
          </TabsList>

          <TabsContent value="find" className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-secondary">Find rides</h3>
                <p className="text-sm text-muted-foreground">Search rides or request a new one if you don’t see your route.</p>
              </div>
              <Button className="bg-gradient-primary hover:shadow-glow" onClick={() => navigate('/ride-requests/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Request a Ride
              </Button>
            </div>

            <Card>
              <CardContent className="p-6">
                <form onSubmit={(e) => { e.preventDefault(); searchRides() }} className="flex flex-col md:flex-row md:flex-wrap gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Where do you want to go?" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                  </div>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start text-left font-normal w-full md:w-[200px]">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, 'PPP') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start">
                      <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
                    </PopoverContent>
                  </Popover>

                  <div className="flex items-center gap-2 w-full md:w-auto md:flex-1">
                    <div className="relative flex-1">
                      <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="pl-10"
                      />
                      {startTime && (
                        <button
                          type="button"
                          onClick={() => setStartTime('')}
                          className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <span className="text-muted-foreground">–</span>
                    <div className="relative flex-1">
                      <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="pl-10"
                      />
                      {endTime && (
                        <button
                          type="button"
                          onClick={() => setEndTime('')}
                          className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <Button type="submit" className="w-full md:w-auto bg-gradient-primary hover:shadow-glow"><Search className="h-4 w-4 mr-2" />Search Rides</Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {availableRides.length === 0 && <h1>No rides found</h1>}
              {availableRides.map((ride: any) => (
                <Card key={ride.id} className={`hover:shadow-purdue transition-shadow ${user?.id === ride.driver_id ? 'bg-black text-white' : ''}${myTrustedRides.has(ride.id) ? "bg-yellow-50" : ""}`}>
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <MapPin className={`h-4 w-4 ${user?.id === ride.driver_id ? 'text-white' : 'text-primary'}`} />
                          <span className={`font-semibold ${user?.id === ride.driver_id ? 'text-white' : 'text-secondary'}`}>
                            {ride.special_moment ? <span className="text-primary">({ride.special_moment})</span> : ''} {ride.origin} → {ride.destination}
                          </span>
                        </div>

                        <div className={`flex items-center space-x-4 text-sm mb-3 ${user?.id === ride.driver_id ? 'text-white/80' : 'text-muted-foreground'}`}>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{format(parseISO(ride.ride_date), 'EEE, MMM d')} at {format(new Date(`1970-01-01T${ride.ride_time}`), 'h:mm a')}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Car className="h-4 w-4" />
                            <span>{ride.car_type || ride.duration || '—'}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/profiles/${ride.driver_id}`)}
                            className={`p-0 h-auto text-sm hover:underline ${user?.id === ride.driver_id ? 'text-white hover:text-white/80' : 'hover:text-primary'}`}
                          >
                            Driver: {ride.profiles ? (`${ride.profiles.first_name ?? ''} ${ride.profiles.last_name ?? ''}`).trim() || '—' : '—'}
                          </Button>
                          {ride.rating && <Badge variant="secondary">★ {ride.rating}</Badge>}
                          <div className="flex items-center space-x-1 text-sm">
                            <Users className="h-4 w-4" />
                            <span>{ride.seats_available}/{ride.total_seats} seats available</span>
                          </div>
                          {user?.id === ride.driver_id && (
                            <Badge
                              variant={user?.id === ride.driver_id ? 'secondary' : 'outline'}
                              className={`ml-2 ${user?.id === ride.driver_id ? 'bg-white text-black border-white' : ''}`}
                            >
                              You're driving
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">${ride.price}</div>
                          <div className="text-xs text-muted-foreground">per person</div>
                        </div>
                        <div className="flex gap-2">
                          <RideDetailsDialog
                            ride={ride}
                            trigger={
                              <Button
                                variant={user?.id === ride.driver_id ? 'secondary' : 'outline'}
                                className={user?.id === ride.driver_id ? 'bg-white text-black hover:bg-white/90' : ''}
                              >
                                {user?.id === ride.driver_id ? 'View' : 'Details'}
                              </Button>
                            }
                          />
                          {user?.id === ride.driver_id && (
                            <Button
                              variant="secondary"
                              className="bg-white text-black hover:bg-white/90"
                              onClick={() => navigate(`/rides/create?id=${ride.id}`)}
                            >
                              Edit
                            </Button>
                          )}
                          {user?.id != ride.driver_id && (
                            <div className="pt-4">
                              <Button
                                variant="secondary"
                                className="bg-white text-black text-xl border hover:bg-white/90"
                                onClick={() => toggleTrustedRide(ride.id)}
                              >
                                {myTrustedRides.has(ride.id) ? "★" : "☆"}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-secondary">Your Booked Rides</h3>
              {myBookings.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">You haven't booked any rides yet</p>
                  </CardContent>
                </Card>
              )}

              {myBookings.map((booking: any) => {
                const ride = booking.rides
                if (!ride) return null
                const total = Number(booking.seats) * Number(ride.price || 0)
                return (
                  <Card key={booking.id} className="hover:shadow-purdue transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-secondary">
                              {ride.special_moment ? <span className="text-primary">({ride.special_moment}) </span> : ''}{ride.origin} → {ride.destination}
                            </span>
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{format(parseISO(ride.ride_date), 'EEE, MMM d')} at {format(new Date(`1970-01-01T${ride.ride_time}`), 'h:mm a')}</span>
                            </div>
                            {ride.car_type && (
                              <div className="flex items-center space-x-1">
                                <Car className="h-4 w-4" />
                                <span>{ride.car_type}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/profiles/${ride.driver_id}`)}
                              className="p-0 h-auto text-sm hover:text-primary hover:underline"
                            >
                              Driver: {ride.profiles ? (`${ride.profiles.first_name ?? ''} ${ride.profiles.last_name ?? ''}`).trim() || '—' : '—'}
                            </Button>
                            <div className="flex items-center space-x-1 text-sm">
                              <Users className="h-4 w-4" />
                              <span>{booking.seats} {booking.seats === 1 ? 'seat' : 'seats'} booked</span>
                            </div>
                            <Badge variant="outline">You're riding</Badge>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">${total.toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">total cost</div>
                          </div>

                          <div className="flex gap-2 items-center flex-wrap">
                            {!booking.paid ? (
                              <PaymentModal
                                bookingId={booking.id}
                                defaultAmount={total}
                                onSuccess={async ({ bookingId, amount }) => {
                                  const { error } = await ridesService.markBookingPaid(Number(bookingId), amount)
                                  if (error) {
                                    toast({ title: 'Error', description: 'Failed to record payment', variant: 'destructive' })
                                    return
                                  }
                                  toast({ title: 'Payment recorded' })
                                  const { data } = await ridesService.getMyBookings(user?.id || '')
                                  setMyBookings(data || [])
                                }}
                                trigger={<Button className="bg-gradient-primary">Pay</Button>}
                              />
                            ) : (
                              <Badge className="bg-emerald-600 text-white">Paid</Badge>
                            )}

                            {!isRideCompleted(ride.ride_date, ride.ride_time) && !existingRatings.has(ride.id) && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                                title="Wait until the ride is complete to rate the driver"
                              >
                                <Star className="h-4 w-4 mr-2" />
                                Rate Driver
                              </Button>
                            )}

                            {isRideCompleted(ride.ride_date, ride.ride_time) && !existingRatings.has(ride.id) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedBookingForRating(booking)
                                  setRatingModalOpen(true)
                                }}
                              >
                                <Star className="h-4 w-4 mr-2" />
                                Rate Driver
                              </Button>
                            )}

                            {existingRatings.has(ride.id) && (
                              <Badge variant="secondary" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                                <Star className="h-3 w-3 mr-1 fill-yellow-400" />
                                {existingRatings.get(ride.id)?.rating} star{existingRatings.get(ride.id)?.rating !== 1 ? 's' : ''}
                              </Badge>
                            )}

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <X className="h-4 w-4 mr-2" />
                                  Cancel Booking
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {(() => {
                                      const rideDateTime = new Date(`${ride.ride_date}T${ride.ride_time}`)
                                      const now = new Date()
                                      const diffMs = rideDateTime.getTime() - now.getTime()
                                      const diffHours = diffMs / (1000 * 60 * 60)
                                      const within24Hours = diffHours <= 24 && diffHours > 0
                                      const totalCost = Number(ride.price || 0) * booking.seats
                                      const penaltyAmount = totalCost * 0.25

                                      if (within24Hours) {
                                        return (
                                          <div className="space-y-2">
                                            <p>Are you sure you want to cancel your booking for this ride? The driver will be notified and your seat(s) will become available for others.</p>
                                            <p className="font-semibold text-destructive">
                                              ⚠️ Late Cancellation Warning: You are cancelling within 24 hours of departure.
                                            </p>
                                            <p>
                                              You will be charged a <strong>25% penalty fee</strong> of <strong>${penaltyAmount.toFixed(2)}</strong>.
                                            </p>
                                          </div>
                                        )
                                      }
                                      return 'Are you sure you want to cancel your booking for this ride? The driver will be notified and your seat(s) will become available for others.'
                                    })()}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                                  <AlertDialogAction onClick={async () => {
                                    try {
                                      const result = await ridesService.cancelBooking(booking.id, ride.id, booking.seats)
                                      if (result.error) {
                                        console.error('Cancel failed', result.error)
                                        toast({
                                          title: 'Error',
                                          description: result.error.message || 'Failed to cancel booking. Please try again.',
                                          variant: 'destructive'
                                        })
                                        return
                                      }
                                      
                                      let description = 'Your booking has been cancelled successfully. Your seat(s) are now available for others.'
                                      if (result.data?.penaltyApplied) {
                                        description = `Your booking has been cancelled. A penalty fee of $${result.data.penaltyAmount.toFixed(2)} has been charged to your account.`
                                      } else if (result.data?.within24Hours && !result.data?.penaltyApplied) {
                                        description = 'Your booking has been cancelled. A waitlist rider filled your spot, so no penalty was charged.'
                                      }
                                      
                                      toast({ 
                                        title: 'Booking cancelled', 
                                        description 
                                      })
                                      const { data } = await ridesService.getMyBookings(user?.id || '')
                                      setMyBookings(data || [])
                                    } catch (err: any) {
                                      toast({
                                        title: 'Error',
                                        description: err.message || 'Failed to cancel booking. Please try again.',
                                        variant: 'destructive'
                                      })
                                    }
                                  }}>
                                    Cancel Booking
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="offer" className="space-y-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="bg-primary/10 p-4 rounded-full w-fit mx-auto mb-4">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-secondary mb-1">Offer a New Ride</h3>
                <p className="text-sm text-muted-foreground mb-3">Share your trip and make money!</p>
                <Button size="sm" className="bg-gradient-primary hover:shadow-glow" onClick={() => navigate('/rides/create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Ride Offer
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-secondary">Your Offered Rides</h3>
              {myRidesState.map((ride) => (
                <Card key={ride.id} className="hover:shadow-purdue transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span className="font-semibold text-secondary">
                            {ride.specialMoment ? <span className="text-primary">({ride.specialMoment})</span> : ''} {ride.from} → {ride.to}
                          </span>
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{format(parseISO(ride.date), 'EEE, MMM d')} at {format(new Date(`1970-01-01T${ride.time}`), 'h:mm a')}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1 text-sm">
                            <Users className="h-4 w-4" />
                            <span>{ride.passengers}/{ride.totalSeats} passengers signed up</span>
                          </div>
                          <Badge variant="outline">You're driving</Badge>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">${(ride.passengers * ride.price).toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground">estimated total</div>
                        </div>
                        <div className="flex flex-col space-y-2">
                          <RideDetailsDialog ride={ride} />
                          {ride.passengers > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openRidersToRateDialog(ride)}
                              className="bg-gradient-primary hover:shadow-glow text-white"
                            >
                              <Star className="h-4 w-4 mr-2" />
                              Rate Riders
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <X className="h-4 w-4 mr-2" />
                                Delete Ride
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this ride?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this ride? This will cancel all bookings and remove all riders from this trip. This action cannot be undone.
                                  {ride.passengers > 0 && (
                                    <span className="block mt-2 font-semibold text-destructive">
                                      {ride.passengers} {ride.passengers === 1 ? 'rider' : 'riders'} will be affected.
                                    </span>
                                  )}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Keep Ride</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={async () => {
                                    try {
                                      const { error, affectedRiders } = await ridesService.deleteRideWithBookings(ride.id)
                                      if (error) {
                                        console.error('Delete failed', error)
                                        toast({
                                          title: 'Error',
                                          description: error.message || 'Failed to delete ride. Please try again.',
                                          variant: 'destructive'
                                        })
                                        return
                                      }
                                      toast({ 
                                        title: 'Ride deleted', 
                                        description: `Your ride has been deleted${affectedRiders && affectedRiders.length > 0 ? ` and ${affectedRiders.length} ${affectedRiders.length === 1 ? 'rider has' : 'riders have'} been notified.` : '.'}`
                                      })
                                      // Refresh the rides list
                                      const now = new Date()
                                      const today = now.toISOString().split('T')[0]
                                      const currentTime = now.toTimeString().split(' ')[0]
                                      const { data, error: fetchError } = await supabase
                                        .from('rides')
                                        .select('*')
                                        .eq('driver_id', user?.id)
                                        .not('origin', 'like', '~%')
                                        .or(`ride_date.gt.${today},and(ride_date.eq.${today},ride_time.gt.${currentTime})`)
                                        .order('ride_date', { ascending: true })
                                        .order('ride_time', { ascending: true })
                                      if (!fetchError && data) {
                                        const mapped = data.map((r: any) => ({
                                          id: r.id,
                                          from: r.origin,
                                          to: r.destination,
                                          date: r.ride_date,
                                          time: r.ride_time,
                                          driver_id: r.driver_id,
                                          passengers: Math.max(0, (Number(r.total_seats) - Number(r.seats_available))),
                                          totalSeats: r.total_seats,
                                          seats_available: r.seats_available,
                                          price: Number(r.price || 0),
                                          specialMoment: r.special_moment || null,
                                        }))
                                        setMyRidesState(mapped)
                                      }
                                    } catch (err: any) {
                                      toast({
                                        title: 'Error',
                                        description: err.message || 'Failed to delete ride. Please try again.',
                                        variant: 'destructive'
                                      })
                                    }
                                  }}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete Ride
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Riders to Rate Dialog */}
        <Dialog open={showRidersDialog} onOpenChange={setShowRidersDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Rate Your Riders</DialogTitle>
              <DialogDescription>
                Select a rider to rate for {rideForRating?.from} → {rideForRating?.to}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {loadingRiders ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">Loading riders...</p>
                </div>
              ) : ridersToRate.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">No riders to rate</p>
                </div>
              ) : (
                ridersToRate.map((rider) => (
                  <Button
                    key={rider.rider_id}
                    variant="outline"
                    className="w-full justify-start h-auto py-3"
                    onClick={() => handleRiderSelection(rider)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      {rider.avatar_url ? (
                        <img
                          src={rider.avatar_url}
                          alt={rider.first_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold">
                          {(rider.first_name?.[0] || '?').toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-sm">
                          {rider.first_name} {rider.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{rider.seats} seat{rider.seats !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </Button>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Rating Modal */}
        {selectedBookingForRating && (
          <RatingModal
            open={ratingModalOpen}
            onOpenChange={setRatingModalOpen}
            driverName={
              selectedBookingForRating.rides?.profiles
                ? `${selectedBookingForRating.rides.profiles.first_name || ''} ${selectedBookingForRating.rides.profiles.last_name || ''}`.trim()
                : 'Your Driver'
            }
            driverAvatar={selectedBookingForRating.rides?.profiles?.avatar_url}
            onSubmit={handleRatingSubmit}
          />
        )}

        {/* Driver Rating Modal */}
        {selectedRiderForRating && (
          <DriverRatingModal
            open={driverRatingModalOpen}
            onOpenChange={setDriverRatingModalOpen}
            riderName={
              selectedRiderForRating
                ? `${selectedRiderForRating.first_name || ''} ${selectedRiderForRating.last_name || ''}`.trim()
                : 'Rider'
            }
            riderAvatar={selectedRiderForRating?.avatar_url}
            onSubmit={handleDriverRatingSubmit}
          />
        )}
      </div>
    </div>
  )
}

export default Rides
