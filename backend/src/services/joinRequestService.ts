import { PostgrestError } from '@supabase/supabase-js'
import { supabaseAdmin } from '../lib/supabaseClient'

export type JoinRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface JoinRequest {
  id: number
  ride_id: number
  rider_id: string
  seats: number
  status: JoinRequestStatus
  message: string | null
  created_at: string
  updated_at: string
}

const TABLE_NAME = 'join_requests'

const friendlyError = (fallback: string, error?: PostgrestError | null) => {
  const message = error?.message || fallback
  const err = new Error(message)
  err.name = error?.code || err.name
  return err
}

const ACTIVE_STATUSES: JoinRequestStatus[] = ['pending', 'approved']

const fetchRide = async (rideId: number) => {
  const { data, error } = await supabaseAdmin
    .from('rides')
    .select('id, driver_id, seats_available, total_seats')
    .eq('id', rideId)
    .maybeSingle()

  if (error) {
    throw friendlyError('Unable to load ride', error)
  }

  return data
}

const ensureDriverAccess = async (userId: string, rideId: number) => {
  const ride = await fetchRide(rideId)
  if (!ride) {
    throw new Error('Ride not found')
  }
  if (ride.driver_id !== userId) {
    throw new Error('You are not authorized to view join requests for this ride')
  }
}

export const joinRequestService = {
  async create(params: { riderId: string; rideId: number; seats?: number; message?: string | null }) {
    const { riderId, rideId, seats = 1, message = null } = params

    if (!Number.isInteger(rideId) || rideId <= 0) {
      throw new Error('Invalid ride id')
    }

    if (!Number.isInteger(seats) || seats <= 0) {
      throw new Error('Seats must be at least 1')
    }

    const ride = await fetchRide(rideId)

    if (!ride) {
      throw new Error('Ride not found')
    }

    if (ride.driver_id === riderId) {
      throw new Error('Drivers cannot request to join their own ride')
    }

    const seatsAvailable = Number(ride.seats_available ?? 0)
    if (seatsAvailable <= 0) {
      throw new Error('Ride is full')
    }
    if (seats > seatsAvailable) {
      throw new Error(`Only ${seatsAvailable} seat${seatsAvailable === 1 ? '' : 's'} left`)
    }

    const { data: existing } = await supabaseAdmin
      .from(TABLE_NAME)
      .select('id, status')
      .eq('ride_id', rideId)
      .eq('rider_id', riderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) {
      if (ACTIVE_STATUSES.includes(existing.status)) {
        throw new Error('You already have an active request for this ride')
      }

      const { data, error } = await supabaseAdmin
        .from(TABLE_NAME)
        .update({
          seats,
          message: message ?? null,
          status: 'pending' as JoinRequestStatus
        })
        .eq('id', existing.id)
        .select('*, rides:ride_id(*), profiles:rider_id(id, first_name, last_name, email, avatar_url)')
        .single()

      if (error || !data) {
        throw friendlyError('Unable to create join request', error)
      }

      return data
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE_NAME)
      .insert({
        ride_id: rideId,
        rider_id: riderId,
        seats,
        message: message ?? null
      })
      .select('*, rides:ride_id(*), profiles:rider_id(id, first_name, last_name, email, avatar_url)')
      .single()

    if (error || !data) {
      throw friendlyError('Unable to create join request', error)
    }

    return data
  },

  async listForRider(riderId: string) {
    const { data, error } = await supabaseAdmin
      .from(TABLE_NAME)
      .select('*, rides:ride_id(id, origin, destination, ride_date, ride_time, driver_id, seats_available, total_seats)')
      .eq('rider_id', riderId)
      .order('created_at', { ascending: false })

    if (error) {
      throw friendlyError('Unable to fetch join requests', error)
    }

    return data ?? []
  },

  async listForRide(driverId: string, rideId: number) {
    await ensureDriverAccess(driverId, rideId)

    const { data, error } = await supabaseAdmin
      .from(TABLE_NAME)
      .select('*, profiles:rider_id(id, first_name, last_name, email, avatar_url)')
      .eq('ride_id', rideId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true })

    if (error) {
      throw friendlyError('Unable to fetch join requests for this ride', error)
    }

    return data ?? []
  },

  async cancel(params: { requestId: number; riderId: string }) {
    const { requestId, riderId } = params

    if (!Number.isInteger(requestId) || requestId <= 0) {
      throw new Error('Invalid join request id')
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from(TABLE_NAME)
      .select('id, rider_id, status, ride_id')
      .eq('id', requestId)
      .maybeSingle()

    if (existingError) {
      throw friendlyError('Unable to fetch join request', existingError)
    }

    if (!existing) {
      throw new Error('Join request not found')
    }

    if (existing.rider_id !== riderId) {
      throw new Error('You are not authorized to cancel this request')
    }

    if (!ACTIVE_STATUSES.includes(existing.status)) {
      throw new Error(`You cannot cancel a request that is ${existing.status}`)
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE_NAME)
      .update({ status: 'cancelled' as JoinRequestStatus })
      .eq('id', requestId)
      .select('*, rides:ride_id(id, origin, destination, ride_date, ride_time, driver_id, seats_available, total_seats)')
      .single()

    if (error || !data) {
      throw friendlyError('Unable to cancel join request', error)
    }

    return data
  }

  ,

  async approve(params: { requestId: number; driverId: string }) {
    const { requestId, driverId } = params

    if (!Number.isInteger(requestId) || requestId <= 0) {
      throw new Error('Invalid join request id')
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from(TABLE_NAME)
      .select('id, rider_id, status, ride_id, seats')
      .eq('id', requestId)
      .maybeSingle()

    if (existingError) {
      throw friendlyError('Unable to fetch join request', existingError)
    }

    if (!existing) {
      throw new Error('Join request not found')
    }

    // Ensure driver owns the ride
    const ride = await fetchRide(existing.ride_id)
    if (!ride) throw new Error('Ride not found')
    if (ride.driver_id !== driverId) throw new Error('You are not authorized to approve this request')

    if (existing.status !== 'pending') {
      throw new Error(`Cannot approve a request that is ${existing.status}`)
    }

    // Create booking and update seats atomically where possible
    // Insert booking
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('ride_bookings')
      .insert({ rider_id: existing.rider_id, ride_id: existing.ride_id, seats: existing.seats })
      .select()
      .single()

    if (bookingError || !booking) {
      throw friendlyError('Unable to create booking for request', bookingError)
    }

    // Update join_request status
    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from(TABLE_NAME)
      .update({ status: 'approved' as JoinRequestStatus })
      .eq('id', requestId)
      .select('*, profiles:rider_id(id, first_name, last_name, email, avatar_url)')
      .single()

    if (updateError || !updatedRequest) {
      throw friendlyError('Unable to mark join request approved', updateError)
    }

    // Decrement seats_available on ride (best-effort)
    try {
      const newSeats = Math.max(0, Number(ride.seats_available ?? 0) - Number(existing.seats))
      await supabaseAdmin.from('rides').update({ seats_available: newSeats }).eq('id', existing.ride_id)
    } catch (e) {
      // ignore: if seat bookkeeping is handled by triggers/policies
    }

    return updatedRequest
  },

  async reject(params: { requestId: number; driverId: string }) {
    const { requestId, driverId } = params

    if (!Number.isInteger(requestId) || requestId <= 0) {
      throw new Error('Invalid join request id')
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from(TABLE_NAME)
      .select('id, rider_id, status, ride_id')
      .eq('id', requestId)
      .maybeSingle()

    if (existingError) {
      throw friendlyError('Unable to fetch join request', existingError)
    }

    if (!existing) {
      throw new Error('Join request not found')
    }

    // Ensure driver owns the ride
    const ride = await fetchRide(existing.ride_id)
    if (!ride) throw new Error('Ride not found')
    if (ride.driver_id !== driverId) throw new Error('You are not authorized to reject this request')

    if (existing.status !== 'pending') {
      throw new Error(`Cannot reject a request that is ${existing.status}`)
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE_NAME)
      .update({ status: 'rejected' as JoinRequestStatus })
      .eq('id', requestId)
      .select('*, profiles:rider_id(id, first_name, last_name, email, avatar_url)')
      .single()
    console.log(data);

    if (error || !data) {
      throw friendlyError('Unable to reject join request', error)
    }

    return data
  }
}
