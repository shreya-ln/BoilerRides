import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogDescription } from '@/components/ui/alert-dialog'
import { MapPin, Clock, Users, Car, DollarSign, Eye, AlertCircle, X } from 'lucide-react'
import { ridesService } from '@/lib/ridesService'
import { supabase } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/use-toast'

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

