import { PostgrestError } from '@supabase/supabase-js'
import { supabaseAdmin } from '../lib/supabaseClient'

/**
 * Fetches a ride by ID with validation
 */
const fetchRide = async (rideId: number) => {
  const { data, error } = await supabaseAdmin
    .from('rides')
    .select('id, driver_id, seats_available, total_seats, origin, ride_date, ride_time, price')
    .eq('id', rideId)
    .maybeSingle()

  if (error) {
    throw new Error('Unable to load ride')
  }

  return data
}

/**
 * Checks if cancellation is within 24 hours of ride departure
 */
const isWithin24Hours = (rideDate: string, rideTime: string): boolean => {
  const now = new Date()
  const rideDateTime = new Date(`${rideDate}T${rideTime}`)
  const diffMs = rideDateTime.getTime() - now.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  return diffHours <= 24 && diffHours > 0
}

/**
 * Gets the first waitlist entry for a ride
 */
const getFirstWaitlistEntry = async (rideId: number) => {
  const { data, error } = await supabaseAdmin
    .from('ride_waitlist')
    .select('id, rider_id, seats')
    .eq('ride_id', rideId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error fetching waitlist:', error)
    return null
  }

  return data
}

/**
 * Removes a waitlist entry
 */
const removeWaitlistEntry = async (waitlistId: number) => {
  const { error } = await supabaseAdmin
    .from('ride_waitlist')
    .delete()
    .eq('id', waitlistId)

  if (error) {
    console.error('Error removing waitlist entry:', error)
  }
}

/**
 * Updates rider balance
 */
const updateRiderBalance = async (riderId: string, amount: number) => {
  // Get current balance
  const { data: profile, error: fetchError } = await supabaseAdmin
    .from('profiles')
    .select('balance')
    .eq('id', riderId)
    .maybeSingle()

  if (fetchError || !profile) {
    console.error('Error fetching rider balance:', fetchError)
    return
  }

  const currentBalance = Number(profile.balance || 0)
  const newBalance = currentBalance - amount

  // Update balance
  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ balance: newBalance })
    .eq('id', riderId)

  if (updateError) {
    console.error('Error updating rider balance:', updateError)
  }
}

/**
 * Fetches a booking by ID with validation
 */
const fetchBooking = async (bookingId: number) => {
  const { data, error } = await supabaseAdmin
    .from('ride_bookings')
    .select('id, rider_id, ride_id, seats')
    .eq('id', bookingId)
    .maybeSingle()

  if (error) {
    throw new Error('Unable to load booking')
  }

  return data
}

/**
 * Friendly error handler
 */
const friendlyError = (fallback: string, error?: PostgrestError | null) => {
  const message = error?.message || fallback
  const err = new Error(message)
  err.name = error?.code || err.name
  return err
}

export const ridesService = {
  /**
   * Cancels a rider's booking and updates ride availability
   * Applies 25% penalty if cancelled within 24 hours and no waitlist riders available
   * @param params - bookingId, riderId, rideId, seats
   */
  async cancelBooking(params: { bookingId: number; riderId: string; rideId: number; seats: number }) {
    const { bookingId, riderId, rideId, seats } = params

    // Validate inputs
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      throw new Error('Invalid booking id')
    }

    if (!Number.isInteger(rideId) || rideId <= 0) {
      throw new Error('Invalid ride id')
    }

    if (!Number.isInteger(seats) || seats <= 0) {
      throw new Error('Invalid seats count')
    }

    // Verify booking exists and belongs to the rider
    const booking = await fetchBooking(bookingId)
    if (!booking) {
      throw new Error('Booking not found')
    }

    if (booking.rider_id !== riderId) {
      throw new Error('You are not authorized to cancel this booking')
    }

    if (booking.ride_id !== rideId) {
      throw new Error('Booking does not match the specified ride')
    }

    // Fetch current ride state
    const ride = await fetchRide(rideId)
    if (!ride) {
      throw new Error('Ride not found')
    }

    // Validate that seats parameter matches booking seats
    if (booking.seats !== seats) {
      throw new Error('Seats count does not match booking')
    }

    // Check if cancellation is within 24 hours
    const within24Hours = isWithin24Hours(ride.ride_date, ride.ride_time)
    let penaltyApplied = false
    let penaltyAmount = 0
    let waitlistFilled = false

    if (within24Hours) {
      // Check for waitlist riders
      const waitlistEntry = await getFirstWaitlistEntry(rideId)
      
      if (!waitlistEntry) {
        // No waitlist riders - apply 25% penalty
        const totalCost = Number(ride.price || 0) * seats
        penaltyAmount = totalCost * 0.25
        penaltyApplied = true
        
        // Update rider balance (deduct penalty)
        await updateRiderBalance(riderId, penaltyAmount)
      } else {
        // Waitlist rider available - they will fill the spot, no penalty
        waitlistFilled = true
        
        // Remove waitlist entry
        await removeWaitlistEntry(waitlistEntry.id)
        
        // Create booking for waitlist rider (replaces the cancelled booking)
        const { error: bookingError } = await supabaseAdmin
          .from('ride_bookings')
          .insert({
            ride_id: rideId,
            rider_id: waitlistEntry.rider_id,
            seats: waitlistEntry.seats
          })

        if (bookingError) {
          console.error('Error creating booking for waitlist rider:', bookingError)
          // If waitlist booking fails, still proceed with cancellation but no penalty
          waitlistFilled = false
        }
      }
    }

    // Delete the booking
    const { error: deleteError } = await supabaseAdmin
      .from('ride_bookings')
      .delete()
      .eq('id', bookingId)

    if (deleteError) {
      throw friendlyError('Unable to cancel booking', deleteError)
    }

    // Update ride seats_available
    const seatsToFree = booking.seats
    let newSeatsAvailable: number

    if (waitlistFilled) {
      // Waitlist rider filled the spot - seats remain the same
      // But we need to account for potential seat difference
      const waitlistEntry = await getFirstWaitlistEntry(rideId) // This should be null now, but check
      // Actually, seats stay the same since waitlist rider took the spot
      newSeatsAvailable = Number(ride.seats_available)
    } else {
      // No waitlist rider - free up the seats
      newSeatsAvailable = Math.min(
        Number(ride.total_seats),
        Number(ride.seats_available) + seatsToFree
      )
    }

    // Update seats_available
    const { error: updateError } = await supabaseAdmin
      .from('rides')
      .update({ seats_available: newSeatsAvailable })
      .eq('id', rideId)

    if (updateError) {
      throw friendlyError('Unable to update ride availability', updateError)
    }

    // Cancel any pending join requests for this rider on this ride
    await supabaseAdmin
      .from('join_requests')
      .update({ status: 'cancelled' })
      .eq('ride_id', rideId)
      .eq('rider_id', riderId)
      .eq('status', 'pending')

    return { 
      success: true, 
      seatsFreed: seatsToFree,
      penaltyApplied,
      penaltyAmount: penaltyApplied ? penaltyAmount : 0,
      within24Hours
    }
  },

  /**
   * Marks a ride as inactive (hidden) instead of deleting it
   * Uses a special character prefix (~) in the origin field to mark inactive rides
   * @param params - rideId, driverId
   */
  async deleteRide(params: { rideId: number; driverId: string }) {
    const { rideId, driverId } = params

    // Validate inputs
    if (!Number.isInteger(rideId) || rideId <= 0) {
      throw new Error('Invalid ride id')
    }

    // Verify ride exists and belongs to the driver
    const { data: ride, error: fetchError } = await supabaseAdmin
      .from('rides')
      .select('id, driver_id, origin')
      .eq('id', rideId)
      .maybeSingle()

    if (fetchError) {
      throw friendlyError('Unable to load ride', fetchError)
    }

    if (!ride) {
      throw new Error('Ride not found')
    }

    if (ride.driver_id !== driverId) {
      throw new Error('You are not authorized to delete this ride')
    }

    // Fetch all bookings for this ride (for notification purposes)
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('ride_bookings')
      .select('id, seats, rider_id, profiles:rider_id(id, first_name, last_name, email)')
      .eq('ride_id', rideId)

    if (bookingsError) {
      throw friendlyError('Unable to fetch ride bookings', bookingsError)
    }

    // Fetch all join requests for this ride
    const { data: joinRequests, error: joinRequestsError } = await supabaseAdmin
      .from('join_requests')
      .select('id, rider_id, status')
      .eq('ride_id', rideId)

    if (joinRequestsError) {
      throw friendlyError('Unable to fetch join requests', joinRequestsError)
    }

    // Cancel all join requests for this ride
    const { error: cancelRequestsError } = await supabaseAdmin
      .from('join_requests')
      .update({ status: 'cancelled' })
      .eq('ride_id', rideId)
      .in('status', ['pending', 'approved'])

    if (cancelRequestsError) {
      // Log but don't fail - join requests cancellation is best effort
      console.error('Error cancelling join requests:', cancelRequestsError)
    }

    // Mark ride as inactive by prefixing origin with special character (~)
    // Only add prefix if not already present
    const inactivePrefix = '~'
    const newOrigin = ride.origin.startsWith(inactivePrefix) 
      ? ride.origin 
      : `${inactivePrefix}${ride.origin}`

    const { error: updateError } = await supabaseAdmin
      .from('rides')
      .update({ origin: newOrigin })
      .eq('id', rideId)

    if (updateError) {
      throw friendlyError('Unable to mark ride as inactive', updateError)
    }

    return {
      success: true,
      affectedRiders: bookings || [],
      affectedRequests: joinRequests || []
    }
  }
}

