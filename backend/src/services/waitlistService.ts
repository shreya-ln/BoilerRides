import { supabaseAdmin } from '../lib/supabaseClient'

const TABLE_NAME = 'ride_waitlist'

const friendlyError = (fallback: string, error?: any) => {
  const message = error?.message || fallback
  const err = new Error(message)
  err.name = error?.code || err.name
  return err
}

/**
 * Service for managing ride waitlists
 */
export const waitlistService = {
  /**
   * Adds a rider to the waitlist for a filled ride
   */
  async addToWaitlist(params: { riderId: string; rideId: number; seats?: number }) {
    const { riderId, rideId, seats = 1 } = params

    if (!Number.isInteger(rideId) || rideId <= 0) {
      throw new Error('Invalid ride id')
    }

    if (!Number.isInteger(seats) || seats <= 0) {
      throw new Error('Seats must be at least 1')
    }

    // Check if ride exists and is active
    const { data: ride, error: rideError } = await supabaseAdmin
      .from('rides')
      .select('id, driver_id, seats_available, origin')
      .eq('id', rideId)
      .maybeSingle()

    if (rideError) {
      throw friendlyError('Unable to load ride', rideError)
    }

    if (!ride) {
      throw new Error('Ride not found')
    }

    // Check if ride is active
    const origin = ride.origin || ''
    if (origin.startsWith('~')) {
      throw new Error('Ride is no longer available')
    }

    if (ride.driver_id === riderId) {
      throw new Error('Drivers cannot join the waitlist for their own ride')
    }

    // Check if ride is actually full
    const seatsAvailable = Number(ride.seats_available ?? 0)
    if (seatsAvailable > 0) {
      throw new Error('Ride still has available seats. Please request to join instead.')
    }

    // Check if rider is already on waitlist
    const { data: existing, error: existingError } = await supabaseAdmin
      .from(TABLE_NAME)
      .select('id')
      .eq('ride_id', rideId)
      .eq('rider_id', riderId)
      .maybeSingle()

    if (existingError) {
      throw friendlyError('Unable to check waitlist', existingError)
    }

    if (existing) {
      throw new Error('You are already on the waitlist for this ride')
    }

    // Add to waitlist
    const { data, error } = await supabaseAdmin
      .from(TABLE_NAME)
      .insert({
        ride_id: rideId,
        rider_id: riderId,
        seats
      })
      .select('*, profiles:rider_id(id, first_name, last_name, email, avatar_url)')
      .single()

    if (error || !data) {
      throw friendlyError('Unable to add to waitlist', error)
    }

    return data
  },

  /**
   * Removes a rider from the waitlist
   */
  async removeFromWaitlist(params: { riderId: string; rideId: number }) {
    const { riderId, rideId } = params

    if (!Number.isInteger(rideId) || rideId <= 0) {
      throw new Error('Invalid ride id')
    }

    const { error } = await supabaseAdmin
      .from(TABLE_NAME)
      .delete()
      .eq('ride_id', rideId)
      .eq('rider_id', riderId)

    if (error) {
      throw friendlyError('Unable to remove from waitlist', error)
    }

    return { success: true }
  },

  /**
   * Gets waitlist for a specific ride (driver only)
   */
  async getWaitlistForRide(params: { driverId: string; rideId: number }) {
    const { driverId, rideId } = params

    // Verify driver owns the ride
    const { data: ride, error: rideError } = await supabaseAdmin
      .from('rides')
      .select('id, driver_id')
      .eq('id', rideId)
      .maybeSingle()

    if (rideError) {
      throw friendlyError('Unable to load ride', rideError)
    }

    if (!ride) {
      throw new Error('Ride not found')
    }

    if (ride.driver_id !== driverId) {
      throw new Error('You are not authorized to view waitlist for this ride')
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE_NAME)
      .select('*, profiles:rider_id(id, first_name, last_name, email, avatar_url)')
      .eq('ride_id', rideId)
      .order('created_at', { ascending: true })

    if (error) {
      throw friendlyError('Unable to load waitlist', error)
    }

    return data || []
  },

  /**
   * Gets waitlist count for a ride
   */
  async getWaitlistCount(rideId: number): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from(TABLE_NAME)
      .select('*', { count: 'exact', head: true })
      .eq('ride_id', rideId)

    if (error) {
      console.error('Error getting waitlist count:', error)
      return 0
    }

    return count || 0
  },

  /**
   * Gets all waitlists for a rider
   */
  async getMyWaitlists(riderId: string) {
    const { data, error } = await supabaseAdmin
      .from(TABLE_NAME)
      .select('*, rides:ride_id(*, profiles:driver_id(id, first_name, last_name, avatar_url))')
      .eq('rider_id', riderId)
      .order('created_at', { ascending: false })

    if (error) {
      throw friendlyError('Unable to load waitlists', error)
    }

    return data || []
  }
}

