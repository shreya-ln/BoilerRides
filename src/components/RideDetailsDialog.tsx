import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { MapPin, Clock, Users, Car, DollarSign, Eye, AlertCircle, X, Loader2, UserRound } from 'lucide-react'
import { ridesService } from '@/lib/ridesService'
import { supabase } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/use-toast'
import { joinRequestService, JoinRequest } from '@/lib/joinRequestService'
import { profileService as profileApi, Profile as RiderProfile } from '@/lib/profileService'
import { useMemo } from 'react'
import { normalizeRide } from '@/lib/normalizeRide'
import CancellationPolicyDialog from '@/components/CancellationPolicyDialog'
import { waitlistService, WaitlistEntry } from '@/lib/waitlistService'

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
  const navigate = useNavigate()
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
  const [approvingId, setApprovingId] = useState<number | null>(null)
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [driverProfile, setDriverProfile] = useState<RiderProfile | null>(null)
  const [driverProfileLoading, setDriverProfileLoading] = useState(false)
  const [driverProfileError, setDriverProfileError] = useState<string | null>(null)
  const [showCancellationPolicy, setShowCancellationPolicy] = useState(false)
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([])
  const [waitlistCount, setWaitlistCount] = useState(0)
  const [waitlistLoading, setWaitlistLoading] = useState(false)
  const [onWaitlist, setOnWaitlist] = useState(false)
  const normalizedRide = useMemo(() => normalizeRide(ride), [ride])
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
      const { data, error: fetchError } = await ridesService.getRideBookings(ride.id, user?.id)
      
      if (fetchError) {
        console.error('Error fetching ride bookings:', fetchError)
        setError('Failed to load rider information. Please try again.')
        return
      }
      
      // Normalize profiles shape: if profiles is an array, take the first element
      const normalized = (data || []).map((d: any) => ({
          ...d,
          profiles: Array.isArray(d.profiles) 
              ? (d.profiles[0] || {}) 
              : (d.profiles || {}),
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
      fetchWaitlistInfo()
    }
  }, [open, ride?.id])

  /**
   * Fetch waitlist information
   */
  const fetchWaitlistInfo = async () => {
    if (!ride?.id) return

    setWaitlistLoading(true)
    try {
      const count = await waitlistService.getWaitlistCount(ride.id)
      setWaitlistCount(count)

      if (isDriver) {
        const entries = await waitlistService.getWaitlistForRide(ride.id)
        setWaitlistEntries(entries)
      } else {
        // Check if current user is on waitlist
        const myWaitlists = await waitlistService.getMyWaitlists()
        const onThisWaitlist = myWaitlists.some(w => w.ride_id === ride.id)
        setOnWaitlist(onThisWaitlist)
      }
    } catch (err) {
      console.error('Failed to fetch waitlist info:', err)
    } finally {
      setWaitlistLoading(false)
    }
  }

  /**
   * Handle joining waitlist
   */
  const handleJoinWaitlist = async () => {
    if (!ride?.id || !user) return

    setJoinLoading(true)
    setJoinError(null)

    try {
      await waitlistService.addToWaitlist(ride.id, seatCount)
      setOnWaitlist(true)
      setWaitlistCount(prev => prev + 1)
      toast({
        title: 'Added to waitlist',
        description: 'You will be notified if a spot becomes available.'
      })
    } catch (err: any) {
      const message = err?.message || 'Failed to join waitlist'
      setJoinError(message)
      toast({
        title: 'Unable to join waitlist',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setJoinLoading(false)
    }
  }

  /**
   * Handle leaving waitlist
   */
  const handleLeaveWaitlist = async () => {
    if (!ride?.id) return

    setJoinLoading(true)
    setJoinError(null)

    try {
      await waitlistService.removeFromWaitlist(ride.id)
      setOnWaitlist(false)
      setWaitlistCount(prev => Math.max(0, prev - 1))
      toast({
        title: 'Removed from waitlist',
        description: 'You have been removed from the waitlist.'
      })
    } catch (err: any) {
      const message = err?.message || 'Failed to leave waitlist'
      setJoinError(message)
      toast({
        title: 'Unable to leave waitlist',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setJoinLoading(false)
    }
  }

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
        const requestForRide = requests.find(
          (request) =>
            request.ride_id === ride.id &&
            (request.status === 'pending' || request.status === 'approved' || request.status === 'rejected')
        )
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
      setCancelError(null)
      setCancelLoading(false)
      setDriverProfile(null)
      setDriverProfileError(null)
    }
  }, [open])

  /**
   * Fetch driver profile details when dialog opens
   */
  useEffect(() => {
    if (!open || !ride?.driver_id) {
      setDriverProfile(null)
      setDriverProfileError(null)
      setDriverProfileLoading(false)
      return
    }

    let active = true
    const loadDriverProfile = async () => {
      setDriverProfileLoading(true)
      setDriverProfileError(null)
      try {
        const { data, error } = await profileApi.getProfile(ride.driver_id)
        if (!active) return
        if (error) {
          const message = error.message || 'Unable to load driver information.'
          setDriverProfile(null)
          setDriverProfileError(message)
        } else {
          setDriverProfile(data)
        }
      } catch (err: any) {
        if (!active) return
        const message = err?.message || 'Unable to load driver information.'
        setDriverProfile(null)
        setDriverProfileError(message)
      } finally {
        if (active) {
          setDriverProfileLoading(false)
        }
      }
    }

    loadDriverProfile()

    return () => {
      active = false
    }
  }, [open, ride?.driver_id])

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

  const driverSupabaseProfile = (() => {
    if (!ride?.profiles) return null
    const driverData = ride.profiles
    if (Array.isArray(driverData)) {
      return driverData[0] ?? null
    }
    return driverData
  })()

  const driverFirstName = driverProfile?.first_name ?? driverSupabaseProfile?.first_name ?? null
  const driverLastName = driverProfile?.last_name ?? driverSupabaseProfile?.last_name ?? null
  const driverDisplayName = getFullName(driverFirstName, driverLastName)
  const driverEmail = driverProfile?.email ?? driverSupabaseProfile?.email ?? 'No Purdue email on file'
  const driverAvatarUrl = driverProfile?.avatar_url ?? driverSupabaseProfile?.avatar_url ?? undefined

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

    // Show cancellation policy dialog first
    setShowCancellationPolicy(true)
  }

  const handleConfirmCancellationPolicy = async () => {
    setShowCancellationPolicy(false)
    if (!ride?.id) return

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

  const handleCancelJoinRequest = async () => {
    if (!existingRequest) return

    setCancelLoading(true)
    setCancelError(null)

    try {
      await joinRequestService.cancel(existingRequest.id)
      setExistingRequest(null)
      setJoinSuccess(null)
      toast({
        title: 'Request cancelled',
        description: 'Your request to join this ride has been cancelled.'
      })
    } catch (err: any) {
      const message = err?.message || 'Failed to cancel request. Please try again.'
      setCancelError(message)
      toast({
        title: 'Unable to cancel request',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setCancelLoading(false)
    }
  }

  const handleNavigateToProfile = (profileId: string | null | undefined) => {
    if (!profileId) {
      toast({
        title: 'Profile unavailable',
        description: 'We could not find details for this rider.',
        variant: 'destructive'
      })
      return
    }
    setOpen(false)
    navigate(`/profiles/${profileId}`)
  }

  const joinRequestStatusCopy: Record<string, string> = {
    pending: 'Pending driver review',
    approved: 'Approved by driver',
    rejected: 'Request rejected',
    cancelled: 'Request cancelled'
  }
  const canCancelRequest =
    existingRequest ? existingRequest.status === 'pending' || existingRequest.status === 'approved' : false
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
                      {normalizedRide.specialMoment ? (
                        <span className="text-primary">({normalizedRide.specialMoment}) </span>
                      ) : null}
                      {normalizedRide.origin} → {normalizedRide.destination}
                    </div>
                  </div>
                </div>

                {/* Date and Time */}
                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <div className="text-sm text-muted-foreground">Date & Time</div>
                      <div className="font-semibold">
                      {format(parseISO(normalizedRide.rideDate), 'EEEE, MMMM d, yyyy')} at{' '}
                      {format(new Date(`1970-01-01T${normalizedRide.rideTime}`), 'h:mm a')}
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
                    <div className="font-semibold text-xl text-primary">${normalizedRide.price}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Driver Information */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <UserRound className="h-5 w-5 text-primary" />
                  Driver
                </h3>
                <Badge variant="outline">Driver</Badge>
              </div>

              {driverProfileError && (
                <Alert variant="destructive">
                  <AlertDescription>{driverProfileError}</AlertDescription>
                </Alert>
              )}

              {driverProfileLoading ? (
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
                    <div className="h-3 bg-muted rounded w-1/3 animate-pulse" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={driverAvatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(driverFirstName, driverLastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <div className="font-semibold text-base">{driverDisplayName}</div>
                      <div className="text-sm text-muted-foreground">{driverEmail}</div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleNavigateToProfile(ride?.driver_id)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Profile
                  </Button>
                </div>
              )}
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
                  <div className="space-y-3">
                    <Alert variant={existingRequest.status === 'rejected' ? 'destructive' : 'default'}>
                      <AlertDescription>
                        {joinRequestStatusCopy[existingRequest.status] || 'Your request is recorded.'}
                      </AlertDescription>
                    </Alert>

                    {canCancelRequest && (
                      <>
                        {cancelError && (
                          <Alert variant="destructive">
                            <AlertDescription>{cancelError}</AlertDescription>
                          </Alert>
                        )}
                        <div className="flex justify-end">
                          <AlertDialog>
                            {existingRequest.status != 'approved' && <AlertDialogTrigger asChild>
                              <Button variant="destructive" disabled={cancelLoading}>
                                {cancelLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Cancel Request
                              </Button>
                            </AlertDialogTrigger>}
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel join request?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will withdraw your request to join this ride.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={cancelLoading}>Keep Request</AlertDialogCancel>
                                <AlertDialogAction onClick={handleCancelJoinRequest} disabled={cancelLoading}>
                                  {cancelLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  Cancel Request
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {user && !existingRequest && rideIsFull && (
                  <div className="space-y-3">
                    <Alert>
                      <AlertDescription>
                        This ride is currently full. {waitlistCount > 0 && (
                          <span className="font-semibold">{waitlistCount} {waitlistCount === 1 ? 'person is' : 'people are'} on the waitlist.</span>
                        )}
                      </AlertDescription>
                    </Alert>
                    {!onWaitlist ? (
                      <div className="space-y-2">
                        <Label htmlFor={`waitlist-seats-${ride.id}`}>Seats needed</Label>
                        <Input
                          id={`waitlist-seats-${ride.id}`}
                          type="number"
                          min={1}
                          value={seatCount}
                          onChange={(event) =>
                            setSeatCount(Math.max(1, Number(event.target.value) || 1))
                          }
                          disabled={joinLoading}
                        />
                        <Button 
                          onClick={handleJoinWaitlist} 
                          disabled={joinLoading}
                          className="w-full bg-gradient-primary hover:shadow-glow"
                        >
                          {joinLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Join Waitlist
                        </Button>
                      </div>
                    ) : (
                      <Alert>
                        <AlertDescription>
                          You are on the waitlist for this ride. You will be automatically added if a spot becomes available.
                        </AlertDescription>
                        <Button 
                          onClick={handleLeaveWaitlist} 
                          disabled={joinLoading}
                          variant="outline"
                          className="mt-2"
                        >
                          {joinLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Leave Waitlist
                        </Button>
                      </Alert>
                    )}
                  </div>
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

          {/* Cancellation Policy Dialog */}
          <CancellationPolicyDialog
            open={showCancellationPolicy}
            onOpenChange={setShowCancellationPolicy}
            onConfirm={handleConfirmCancellationPolicy}
            onCancel={() => setShowCancellationPolicy(false)}
            rideDate={normalizedRide.rideDate}
            rideTime={normalizedRide.rideTime}
            price={normalizedRide.price}
            seats={seatCount}
          />

          {/* Driver waitlist overview */}
          {isDriver && rideIsFull && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Waitlist
                  </h3>
                  <Badge variant="outline">{waitlistCount} {waitlistCount === 1 ? 'person' : 'people'}</Badge>
                </div>

                {waitlistLoading && (
                  <div className="text-sm text-muted-foreground">Loading waitlist…</div>
                )}

                {!waitlistLoading && waitlistEntries.length === 0 && (
                  <p className="text-sm text-muted-foreground">No one on the waitlist yet.</p>
                )}

                {!waitlistLoading && waitlistEntries.length > 0 && (
                  <div className="space-y-3">
                    {waitlistEntries.map((entry, index) => {
                      const profile = entry.profiles ?? {
                        id: '',
                        first_name: null,
                        last_name: null,
                        email: null,
                        avatar_url: null
                      }
                      const fullName = getFullName(profile.first_name, profile.last_name)
                      const initials = getInitials(profile.first_name, profile.last_name)

                      return (
                        <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                              {index + 1}
                            </div>
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={profile.avatar_url || undefined} alt={fullName} />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{fullName}</div>
                              <div className="text-sm text-muted-foreground">
                                {entry.seats} {entry.seats === 1 ? 'seat' : 'seats'} requested
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(parseISO(entry.created_at), 'MMM d, h:mm a')}
                          </div>
                        </div>
                      )
                    })}
                  </div>
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
                          <CardContent className="p-4 space-y-3">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
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
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleNavigateToProfile(profile.id || request.rider_id)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Profile
                                </Button>

                                {request.status === 'pending' && (
                                  <div className="flex items-center gap-2">
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        disabled={approvingId === request.id}
                                      >
                                        {approvingId === request.id ? (
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : null}
                                        Accept
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Accept Request</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to approve this rider’s join request?
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={async () => {
                                            try {
                                              setApprovingId(request.id)
                                              await joinRequestService.approve(request.id)
                                              toast({
                                                title: 'Request approved',
                                                description: 'The rider has been added to the ride.',
                                              })
                                              // refresh lists
                                              const data = await joinRequestService.listForRide(Number(ride.id))
                                              setJoinRequests(data || [])
                                              fetchRiders()
                                              } catch (err: any) {
                                                toast({
                                                  title: 'Unable to approve',
                                                  description: err?.message || 'Try again',
                                                  variant: 'destructive',
                                                })
                                              } finally {
                                                setApprovingId(null)
                                              }
                                            }}
                                          >
                                            Yes, Approve
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-destructive"
                                          disabled={rejectingId === request.id}
                                        >
                                          {rejectingId === request.id ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          ) : null}
                                          Reject
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Reject Request</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to reject this rider’s join request?
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            className="bg-destructive text-white hover:bg-destructive/90"
                                            onClick={async () => {
                                              try {
                                                setRejectingId(request.id)
                                                await joinRequestService.reject(request.id)
                                                toast({
                                                  title: 'Request rejected',
                                                  description: 'The rider request was rejected.',
                                                })
                                                const data = await joinRequestService.listForRide(Number(ride.id))
                                                setJoinRequests(data || [])
                                              } catch (err: any) {
                                                toast({
                                                  title: 'Unable to reject',
                                                  description: err?.message || 'Try again',
                                                  variant: 'destructive',
                                                })
                                              } finally {
                                                setRejectingId(null)
                                              }
                                            }}
                                          >
                                            Yes, Reject
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                )}
                              </div>
                            </div>
                            {request.message && (
                              <div className="text-sm text-muted-foreground">
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
                {riders.map((rider) => {
                        const profile = rider.profiles || {};
                        const firstName = profile?.first_name || '';
                        const lastName = profile?.last_name || '';
                    return (
                      <Card key={rider.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-4">
                            {/* Avatar */}
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={profile.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {getInitials(profile.first_name || '', profile.last_name || '')}
                              </AvatarFallback>
                            </Avatar>

                          {/* Rider Info */}
                          <div className="flex-1">
                            <div className="font-semibold text-base">
                              {getFullName(profile.first_name || null, profile.last_name || null)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {profile.email || 'No Purdue email on file'}
                            </div>
                          </div>

                        {/* Seats Badge */}
                        <div className="flex flex-col items-end gap-2">
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
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleNavigateToProfile(rider.rider_id)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Profile
                            </Button>
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
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )})}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
