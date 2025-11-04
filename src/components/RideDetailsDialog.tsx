import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogDescription } from '@/components/ui/alert-dialog'
import { MapPin, Clock, Users, Car, DollarSign, Eye, AlertCircle, X, Loader2 } from 'lucide-react'
import { ridesService } from '@/lib/ridesService'
import { supabase } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/use-toast'
import { joinRequestService, JoinRequest } from '@/lib/joinRequestService'

interface RideDetailsDialogProps {
  ride: any
  trigger?: React.ReactNode
}

interface RiderInfo {
  id: string
  seats: number
  created_at: string
  rider_id: string
  // Supabase may return `profiles` as an object or as a single-element array depending on select
  profiles: {
    id?: string
    first_name?: string | null
    last_name?: string | null
    avatar_url?: string | null
    email?: string | null
  } | any
  paid?: boolean
  amount?: number | null
  paid_at?: string | null
}

/**
 * Dialog component that displays ride details and list of signed up riders
 * @param ride - The ride object containing ride information
 * @param trigger - Optional custom trigger element (defaults to "View" button)
 */
export default function RideDetailsDialog({ ride, trigger }: RideDetailsDialogProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [riders, setRiders] = useState<RiderInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [seatCount, setSeatCount] = useState(1)
  const [requestMessage, setRequestMessage] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null)
  const [existingRequest, setExistingRequest] = useState<JoinRequest | null>(null)
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const [joinRequestsLoading, setJoinRequestsLoading] = useState(false)
  const [joinRequestsError, setJoinRequestsError] = useState<string | null>(null)
  
  // Check if current user is the driver of this ride
  const isDriver = user?.id === ride.driver_id

  /**
   * Fetches the list of riders who signed up for this ride
   */
  const fetchRiders = async () => {
    if (!ride?.id) return
    
    setLoading(true)
    setError(null)
    
    try {
      const { data, error: fetchError } = await ridesService.getRideBookings(ride.id)
      
      if (fetchError) {
        console.error('Error fetching ride bookings:', fetchError)
        setError('Failed to load rider information. Please try again.')
        return
      }
      
      // Normalize profiles shape: if profiles is an array, take the first element
      const normalized = (data || []).map((d: any) => ({
        ...d,
        profiles: Array.isArray(d.profiles) ? d.profiles[0] : d.profiles,
      }))
      setRiders(normalized as RiderInfo[])
    } catch (err) {
      console.error('Unexpected error fetching riders:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Fetch riders when dialog opens
   */
  useEffect(() => {
    if (open) {
      fetchRiders()
    }
  }, [open, ride?.id])

  /**
   * Load current user's join request (if any) when dialog opens
   */
  useEffect(() => {
    if (!open || !user?.id || !ride?.id) {
      setExistingRequest(null)
      return
    }

    let active = true
    const loadJoinRequest = async () => {
      try {
        const requests = await joinRequestService.getMyRequests()
        if (!active) return
        const requestForRide = requests.find((request) => request.ride_id === ride.id)
        setExistingRequest(requestForRide ?? null)
      } catch (err) {
        console.error('Failed to load join requests', err)
      }
    }

    loadJoinRequest()
    return () => {
      active = false
    }
  }, [open, ride?.id, user?.id])

  /**
   * Reset form state when dialog closes
   */
  useEffect(() => {
    if (!open) {
      setSeatCount(1)
      setRequestMessage('')
      setJoinError(null)
      setJoinSuccess(null)
      setJoinLoading(false)
    }
  }, [open])

  /**
   * Drivers fetch join requests for this ride
   */
  useEffect(() => {
    if (!open || !isDriver || !ride?.id) {
      setJoinRequests([])
      setJoinRequestsError(null)
      return
    }

    let active = true
    const fetchRequests = async () => {
      setJoinRequestsLoading(true)
      setJoinRequestsError(null)
      try {
        const data = await joinRequestService.listForRide(Number(ride.id))
        if (!active) return
        setJoinRequests(data || [])
      } catch (err) {
        if (!active) return
        console.error('Failed to load join requests', err)
        setJoinRequestsError('Unable to load join requests right now.')
      } finally {
        if (active) {
          setJoinRequestsLoading(false)
        }
      }
    }

    fetchRequests()

    return () => {
      active = false
    }
  }, [open, isDriver, ride?.id])

  // Subscribe to realtime updates for ride_bookings so driver sees payment status changes
  useEffect(() => {
    if (!ride?.id || !open) return

    const channel = supabase
      .channel(`ride_bookings_${ride.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ride_bookings', filter: `ride_id=eq.${ride.id}` },
        (payload) => {
          // When booking is inserted/updated/deleted, refresh the riders
          fetchRiders()
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
  }, [ride?.id, open])

  /**
   * Get initials from a name for avatar fallback
   */
  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.charAt(0) || ''
    const last = lastName?.charAt(0) || ''
    return (first + last).toUpperCase() || '?'
  }

  // Cost split calculations
  const totalCost = (ride.price || 0) * (riders.reduce((acc, r) => acc + Number(r.seats || 0), 0) || 0)
  const activeRidersCount = Math.max(1, riders.reduce((acc, r) => acc + Number(r.seats || 0), 0))
  const perPersonRaw = totalCost / activeRidersCount
  const perPerson = Number(perPersonRaw.toFixed(2))
  const currentUserBooking = riders.find((r) => r.rider_id === user?.id)
  const yourShare = currentUserBooking ? Number(((perPersonRaw) * (currentUserBooking.seats || 1)).toFixed(2)) : perPerson

  /**
   * Format full name from first and last name
   */
  const getFullName = (firstName: string | null, lastName: string | null) => {
    const parts = [firstName, lastName].filter(Boolean)
    return parts.length > 0 ? parts.join(' ') : 'Unknown User'
  }

  const computedSeatsAvailable = (() => {
    if (ride.seats_available !== undefined && ride.seats_available !== null) {
      return Number(ride.seats_available)
    }
    if (ride.seatsAvailable !== undefined && ride.seatsAvailable !== null) {
      return Number(ride.seatsAvailable)
    }
    if (ride.totalSeats !== undefined && ride.passengers !== undefined) {
      return Number(ride.totalSeats) - Number(ride.passengers)
    }
    if (ride.total_seats !== undefined && ride.passengers !== undefined) {
      return Number(ride.total_seats) - Number(ride.passengers)
    }
    return ride.seats_available ?? 0
  })()

  const seatsAvailable = Math.max(0, Number(computedSeatsAvailable || 0))
  const rideIsFull = seatsAvailable <= 0
  const showJoinSection = !isDriver && !currentUserBooking

  const handleJoinRide = async () => {
    if (!user) {
      toast({
        title: 'Please sign in',
        description: 'You need to be signed in to request a seat.',
        variant: 'destructive'
      })
      return
    }
    if (!ride?.id) return

    if (seatCount < 1) {
      setJoinError('You must request at least one seat.')
      return
    }
    if (seatCount > seatsAvailable) {
      setJoinError(`Only ${seatsAvailable} seat${seatsAvailable === 1 ? '' : 's'} remaining.`)
      return
    }

    setJoinLoading(true)
    setJoinError(null)
    setJoinSuccess(null)

    try {
      const payload = {
        rideId: Number(ride.id),
        seats: seatCount,
        message: requestMessage.trim() || undefined
      }
      const request = await joinRequestService.create(payload)
      setExistingRequest(request)
      setJoinSuccess('Request submitted! The driver will review your request.')
      toast({
        title: 'Request sent',
        description: 'The driver has been notified about your request.'
      })
    } catch (err: any) {
      const message = err?.message || 'Failed to send join request. Please try again.'
      setJoinError(message)
      toast({
        title: 'Unable to send request',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setJoinLoading(false)
    }
  }

  const joinRequestStatusCopy: Record<string, string> = {
    pending: 'Pending driver review',
    approved: 'Approved by driver',
    rejected: 'Request rejected',
    cancelled: 'Request cancelled'
  }
  const pendingJoinRequests = joinRequests.filter((request) => request.status === 'pending')

  /**
   * Remove a rider from the ride (driver only)
   */
  const handleRemoveRider = async (bookingId: number, riderName: string, seats: number) => {
    const { error } = await ridesService.removeRiderFromRide(bookingId, ride.id, seats)
    if (error) {
      console.error('Failed to remove rider', error)
      toast({
        title: "Error",
        description: "Failed to remove rider. Please try again.",
        variant: "destructive"
      })
      return
    }
    
    toast({
      title: "Rider removed",
      description: `${riderName} has been removed from this ride.`
    })
    
    // Refresh riders list
    fetchRiders()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Ride Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Ride Information Card */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Route */}
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-primary mt-1" />
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground">Route</div>
                    <div className="font-semibold text-lg">
                      {ride.specialMoment || ride.special_moment ? (
                        <span className="text-primary">({ride.specialMoment || ride.special_moment}) </span>
                      ) : null}
                      {ride.from || ride.origin} → {ride.to || ride.destination}
                    </div>
                  </div>
                </div>

                {/* Date and Time */}
                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <div className="text-sm text-muted-foreground">Date & Time</div>
                    <div className="font-semibold">
                      {format(parseISO(ride.date || ride.ride_date), 'EEEE, MMMM d, yyyy')} at{' '}
                      {format(new Date(`1970-01-01T${ride.time || ride.ride_time}`), 'h:mm a')}
                    </div>
                  </div>
                </div>

                {/* Seats and Passengers */}
                <div className="flex items-start space-x-3">
                  <Users className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <div className="text-sm text-muted-foreground">Capacity</div>
                    <div className="font-semibold">
                      {ride.passengers !== undefined 
                        ? `${ride.passengers}/${ride.totalSeats || ride.total_seats} seats filled`
                        : `${ride.total_seats - ride.seats_available}/${ride.total_seats} seats filled`
                      }
                    </div>
                  </div>
                </div>

                {/* Car Type */}
                {(ride.car_type) && (
                  <div className="flex items-start space-x-3">
                    <Car className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <div className="text-sm text-muted-foreground">Vehicle</div>
                      <div className="font-semibold">{ride.car_type}</div>
                    </div>
                  </div>
                )}

                {/* Price */}
                <div className="flex items-start space-x-3">
                  <DollarSign className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <div className="text-sm text-muted-foreground">Price per seat</div>
                    <div className="font-semibold text-xl text-primary">${ride.price}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cost split summary */}
          <div>
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Total Cost</div>
                  <div className="text-xl font-bold text-primary">${totalCost.toFixed(2)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Your Share</div>
                  <div className="text-lg font-semibold">
                    ${yourShare.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">Split {activeRidersCount} ways</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Join Ride section (riders only) */}
          {showJoinSection && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Seats remaining</div>
                    <div className="text-2xl font-semibold">{seatsAvailable}</div>
                  </div>
                  {existingRequest && (
                    <Badge
                      variant={
                        existingRequest.status === 'rejected' || existingRequest.status === 'cancelled'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {joinRequestStatusCopy[existingRequest.status] || existingRequest.status}
                    </Badge>
                  )}
                </div>

                {joinSuccess && (
                  <Alert>
                    <AlertDescription>{joinSuccess}</AlertDescription>
                  </Alert>
                )}

                {joinError && (
                  <Alert variant="destructive">
                    <AlertDescription>{joinError}</AlertDescription>
                  </Alert>
                )}

                {!user && (
                  <Alert>
                    <AlertDescription>Sign in to request a seat.</AlertDescription>
                  </Alert>
                )}

                {user && existingRequest && (
                  <Alert variant={existingRequest.status === 'rejected' ? 'destructive' : 'default'}>
                    <AlertDescription>
                      {joinRequestStatusCopy[existingRequest.status] || 'Your request is recorded.'}
                    </AlertDescription>
                  </Alert>
                )}

                {user && !existingRequest && rideIsFull && (
                  <Alert variant="destructive">
                    <AlertDescription>This ride is currently full.</AlertDescription>
                  </Alert>
                )}

                {user && !existingRequest && !rideIsFull && (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor={`seat-count-${ride.id}`}>Seats needed</Label>
                        <Input
                          id={`seat-count-${ride.id}`}
                          type="number"
                          min={1}
                          max={Math.max(1, seatsAvailable)}
                          value={seatCount}
                          onChange={(event) =>
                            setSeatCount(
                              Math.max(
                                1,
                                Math.min(seatsAvailable, Number(event.target.value) || 1)
                              )
                            )
                          }
                          disabled={joinLoading}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {seatsAvailable} seat{seatsAvailable === 1 ? '' : 's'} left
                        </p>
                      </div>

                      <div>
                        <Label htmlFor={`join-message-${ride.id}`}>Message to driver (optional)</Label>
                        <Textarea
                          id={`join-message-${ride.id}`}
                          value={requestMessage}
                          onChange={(event) => setRequestMessage(event.target.value)}
                          rows={3}
                          placeholder="Add pickup notes or timing preferences"
                          disabled={joinLoading}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handleJoinRide} disabled={joinLoading}>
                        {joinLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Request to Join
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Driver join requests overview */}
          {isDriver && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Join Requests
                  </h3>
                  <Badge variant="outline">{pendingJoinRequests.length} pending</Badge>
                </div>

                {joinRequestsError && (
                  <Alert variant="destructive">
                    <AlertDescription>{joinRequestsError}</AlertDescription>
                  </Alert>
                )}

                {!joinRequestsError && joinRequestsLoading && (
                  <div className="text-sm text-muted-foreground">Loading requests…</div>
                )}

                {!joinRequestsLoading && joinRequests.length === 0 && (
                  <p className="text-sm text-muted-foreground">No join requests yet.</p>
                )}

                {!joinRequestsLoading && joinRequests.length > 0 && (
                  <div className="space-y-3">
                    {joinRequests.map((request) => {
                      const profile =
                        request.profiles ?? {
                          id: '',
                          first_name: null,
                          last_name: null,
                          email: null,
                          avatar_url: null
                        }
                      return (
                        <Card key={request.id} className="bg-muted/40">
                          <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center">
                            <div className="flex items-center gap-3 flex-1">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={profile.avatar_url || undefined} />
                                <AvatarFallback>
                                  {getInitials(profile.first_name ?? null, profile.last_name ?? null)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold">
                                  {getFullName(profile.first_name ?? null, profile.last_name ?? null)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {profile.email || request.rider_id}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant="secondary">
                                {request.seats} {request.seats === 1 ? 'seat' : 'seats'}
                              </Badge>
                              <Badge
                                variant={
                                  request.status === 'pending'
                                    ? 'default'
                                    : request.status === 'rejected'
                                      ? 'destructive'
                                      : 'secondary'
                                }
                              >
                                {joinRequestStatusCopy[request.status] || request.status}
                              </Badge>
                            </div>
                            {request.message && (
                              <div className="text-sm text-muted-foreground flex-1">
                                "{request.message}"
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Signed Up Riders Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Signed Up Riders ({riders.length})
            </h3>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Loading State */}
            {loading && (
              <div className="text-center py-8 text-muted-foreground">
                Loading riders...
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && riders.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No riders have signed up yet</p>
                </CardContent>
              </Card>
            )}

            {/* Riders List */}
            {!loading && !error && riders.length > 0 && (
              <div className="space-y-3">
                {riders.map((rider) => (
                  <Card key={rider.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        {/* Avatar */}
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={rider.profiles.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(rider.profiles.first_name, rider.profiles.last_name)}
                          </AvatarFallback>
                        </Avatar>

                        {/* Rider Info */}
                        <div className="flex-1">
                          <div className="font-semibold text-base">
                            {getFullName(rider.profiles.first_name, rider.profiles.last_name)}
                          </div>
                          {rider.profiles.email && (
                            <div className="text-sm text-muted-foreground">
                              {rider.profiles.email}
                            </div>
                          )}
                        </div>

                        {/* Seats Badge */}
                        <div className="flex flex-col items-end">
                          <Badge variant="secondary" className="mb-1">
                            {rider.seats} {rider.seats === 1 ? 'seat' : 'seats'}
                          </Badge>
                          {/* Paid / Pending */}
                          {rider.paid ? (
                            <Badge className="bg-emerald-600 text-white">Paid</Badge>
                          ) : (
                            <Badge className="bg-red-600 text-white">Pending</Badge>
                          )}
                        </div>

                        {/* Remove Button (Driver Only) */}
                        {isDriver && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                <X className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove rider?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove {getFullName(rider.profiles.first_name, rider.profiles.last_name)} from this ride? 
                                  This will free up {rider.seats} {rider.seats === 1 ? 'seat' : 'seats'} for other riders.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleRemoveRider(
                                    Number(rider.id), 
                                    getFullName(rider.profiles.first_name, rider.profiles.last_name), 
                                    rider.seats
                                  )}
                                >
                                  Remove Rider
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
