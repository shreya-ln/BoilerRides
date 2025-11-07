import { PostgrestError } from '@supabase/supabase-js'
import { supabaseAdmin } from '../lib/supabaseClient'

/**
 * Fetches a ride by ID with validation
 */
const fetchRide = async (rideId: number) => {
  const { data, error } = await supabaseAdmin
    .from('rides')
    .select('id, driver_id, seats_available, total_seats')
    .eq('id', rideId)
    .maybeSingle()

  if (error) {
    throw new Error('Unable to load ride')
  }

  return data
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

    // Delete the booking
    const { error: deleteError } = await supabaseAdmin
      .from('ride_bookings')
      .delete()
      .eq('id', bookingId)

    if (deleteError) {
      throw friendlyError('Unable to cancel booking', deleteError)
    }

    // Update ride seats_available (increment by seats freed)
    // Use booking.seats to ensure accuracy
    const seatsToFree = booking.seats
    const newSeatsAvailable = Math.min(
      Number(ride.total_seats),
      Number(ride.seats_available) + seatsToFree
    )

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

    return { success: true, seatsFreed: seatsToFree }
  },

  /**
   * Deletes a ride and all associated bookings/join requests
   * First removes all riders, then deletes the ride
   * @param params - rideId, driverId
   */
  async deleteRide(params: { rideId: number; driverId: string }) {
    const { rideId, driverId } = params

    // Validate inputs
    if (!Number.isInteger(rideId) || rideId <= 0) {
      throw new Error('Invalid ride id')
    }

    // Verify ride exists and belongs to the driver
    const ride = await fetchRide(rideId)
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

    // Delete all bookings first (explicit deletion for clarity, though CASCADE will handle it)
    const { error: deleteBookingsError } = await supabaseAdmin
      .from('ride_bookings')
      .delete()
      .eq('ride_id', rideId)

    if (deleteBookingsError) {
      throw friendlyError('Unable to remove riders from ride', deleteBookingsError)
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

    // Finally, delete the ride itself
    const { error: deleteRideError } = await supabaseAdmin
      .from('rides')
      .delete()
      .eq('id', rideId)

    if (deleteRideError) {
      throw friendlyError('Unable to delete ride', deleteRideError)
    }

    return {
      success: true,
      affectedRiders: bookings || [],
      affectedRequests: joinRequests || []
    }
  }
}

