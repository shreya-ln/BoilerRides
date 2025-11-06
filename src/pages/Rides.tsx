import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MapPin, Users, Clock, Search, Plus, Car, CalendarIcon, X } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format, parseISO } from 'date-fns'

import Navigation from '@/components/Navigation'
import RideDetailsDialog from '@/components/RideDetailsDialog'
import PaymentModal from '@/components/PaymentModal'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { ridesService } from '@/lib/ridesService'
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

  useEffect(() => {
    const fetchRides = async () => {
      try {
        const { data, error } = await ridesService.listRides()
        if (error) return console.error('Error fetching rides:', error)
        const filtered = (data || []).filter((r: any) => showOwnRides || r.driver_id !== user?.id)
        const sorted = filtered.sort((a: any, b: any) => {
          const aOwn = a.driver_id === user?.id ? 1 : 0
          const bOwn = b.driver_id === user?.id ? 1 : 0
          return bOwn - aOwn
        })
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
    }
    fetchMyBookings()
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchMyBookings()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [user?.id])

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
    let query: any = supabase.from('rides').select('*')
    if (searchQuery) query = query.ilike('destination', `%${searchQuery}%`)
    if (selectedDate) query = query.eq('ride_date', format(selectedDate, 'yyyy-MM-dd'))
    if (startTime && endTime) {
      query = query.gte('ride_time', startTime).lte('ride_time', endTime)
    } else if (startTime) {
      query = query.gte('ride_time', startTime)
    } else if (endTime) {
      query = query.lte('ride_time', endTime)
    }
    const { data, error } = await query
    if (error) return console.error('Error fetching rides:', error)
    const filtered = (data || []).filter((r: any) => showOwnRides || r.driver_id !== user?.id)
    setAvailableRides(filtered)
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
            <Card>
              <CardContent className="p-6">
                <form onSubmit={(e) => { e.preventDefault(); searchRides() }} className="flex flex-col md:flex-row gap-4">
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

                  <div className="flex items-center gap-2 md:w-[220px]">
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

                  <Button type="submit" className="bg-gradient-primary hover:shadow-glow"><Search className="h-4 w-4 mr-2" />Search Rides</Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {availableRides.length === 0 && <h1>No rides found</h1>}
              {availableRides.map((ride: any) => (
                <Card key={ride.id} className={`hover:shadow-purdue transition-shadow ${user?.id === ride.driver_id ? 'bg-black text-white' : ''}`}>
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
                          <span className={`text-sm ${user?.id === ride.driver_id ? 'text-white' : ''}`}>Driver: {ride.profiles ? (`${ride.profiles.first_name ?? ''} ${ride.profiles.last_name ?? ''}`).trim() || '—' : '—'}</span>
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
                            <span className="text-sm">Driver: {ride.profiles ? (`${ride.profiles.first_name ?? ''} ${ride.profiles.last_name ?? ''}`).trim() || '—' : '—'}</span>
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

                          <div className="flex gap-2 items-center">
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
                                    Are you sure you want to cancel your booking for this ride? The driver will be notified and your seat(s) will become available for others.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                                  <AlertDialogAction onClick={async () => {
                                    try {
                                      const { error } = await ridesService.cancelBooking(booking.id, ride.id, booking.seats)
                                      if (error) {
                                        console.error('Cancel failed', error)
                                        toast({
                                          title: 'Error',
                                          description: error.message || 'Failed to cancel booking. Please try again.',
                                          variant: 'destructive'
                                        })
                                        return
                                      }
                                      toast({ title: 'Booking cancelled', description: 'Your booking has been cancelled successfully. Your seat(s) are now available for others.' })
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
      </div>
    </div>
  )
}

export default Rides
