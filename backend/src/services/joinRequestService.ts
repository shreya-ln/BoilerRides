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
      .from<JoinRequest>(TABLE_NAME)
      .select('id, status')
      .eq('ride_id', rideId)
      .eq('rider_id', riderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing && ACTIVE_STATUSES.includes(existing.status)) {
      throw new Error('You already have an active request for this ride')
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE_NAME)
      .insert({
        ride_id: rideId,
        rider_id: riderId,
        seats,
        message
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
      .order('created_at', { ascending: true })

    if (error) {
      throw friendlyError('Unable to fetch join requests for this ride', error)
    }

    return data ?? []
  }
}
