import { PostgrestError } from '@supabase/supabase-js'
import { supabaseAdmin } from '../lib/supabaseClient'
import { blockService } from './blockService'

export type RideRequestStatus = 'pending' | 'matched' | 'cancelled'

const friendlyError = (fallback: string, error?: PostgrestError | null) => {
  const message = error?.message || fallback
  const err = new Error(message)
  err.name = error?.code || err.name
  return err
}

const normalizeText = (value?: string | null) => (value || '').trim()

const buildTokens = (value: string) => {
  const term = normalizeText(value)
  if (!term) return [] as string[]
  const lower = term.toLowerCase()
  const parts = lower.split(',').map(p => p.trim()).filter(Boolean)
  const base = parts[0] || lower

  const tokens = new Set<string>()
  tokens.add(lower)
  tokens.add(base)

  return Array.from(tokens)
}

const includesAny = (value: string | null | undefined, tokens: string[]) => {
  if (!value) return false
  const lower = value.toLowerCase()
  return tokens.some(t => lower.includes(t))
}

const toRad = (v: number) => (v * Math.PI) / 180
const haversineMeters = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const R = 6371000 // meters
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const sa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa))
  return R * c
}

const buildRidePayloadFromRequest = (req: any, driverId: string, overrides: any) => {
  const rideDate = overrides.ride_date || req.ride_date
  const rideTime = overrides.ride_time || req.ride_time || '12:00'
  return {
    origin: overrides.origin || req.origin,
    destination: overrides.destination || req.destination,
    origin_lat: overrides.origin_lat ?? req.origin_lat ?? null,
    origin_lng: overrides.origin_lng ?? req.origin_lng ?? null,
    destination_lat: overrides.destination_lat ?? req.destination_lat ?? null,
    destination_lng: overrides.destination_lng ?? req.destination_lng ?? null,
    ride_date: rideDate,
    ride_time: rideTime,
    price: overrides.price || 0,
    total_seats: overrides.total_seats || req.seats || 1,
    seats_available: overrides.total_seats || req.seats || 1,
    driver_id: driverId,
    car_type: overrides.car_type ?? null,
    car_notes: overrides.car_notes ?? null,
    special_moment: overrides.special_moment ?? null
  }
}

const validateDate = (rideDate: string) => {
  if (!rideDate) throw new Error('rideDate is required')
  const parsed = new Date(rideDate)
  if (Number.isNaN(parsed.getTime())) throw new Error('Invalid ride date')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const candidate = new Date(parsed)
  candidate.setHours(0, 0, 0, 0)

  if (candidate < today) {
    throw new Error('Ride date cannot be in the past')
  }
}

export const rideRequestService = {
  async findSimilar(params: {
    origin: string
    destination: string
    rideDate: string
    rideTime?: string | null
    originLat?: number | null
    originLng?: number | null
    destinationLat?: number | null
    destinationLng?: number | null
    viewerId?: string
  }) {
    const origin = normalizeText(params.origin)
    const destination = normalizeText(params.destination)
    const rideDate = normalizeText(params.rideDate)
    const rideTime = normalizeText(params.rideTime || '') || null
    const originLat = params.originLat
    const originLng = params.originLng
    const destinationLat = params.destinationLat
    const destinationLng = params.destinationLng

    if (!origin || !destination || !rideDate) {
      throw new Error('origin, destination, and rideDate are required')
    }

    const haveOriginCoords = typeof originLat === 'number' && typeof originLng === 'number'
    const haveDestinationCoords = typeof destinationLat === 'number' && typeof destinationLng === 'number'
    if (!haveOriginCoords || !haveDestinationCoords) {
      throw new Error('Geo coordinates are required for origin and destination to find similar rides')
    }

    validateDate(rideDate)

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const currentTime = now.toTimeString().split(' ')[0]

    // Build lenient tokens so "Purdue University" matches "Purdue University, West Lafayette"
    // and "Chicago, IL" matches "Chicago, IL, USA".
    const originTokens = buildTokens(origin)
    const destinationTokens = buildTokens(destination)

    let query = supabaseAdmin
      .from('rides')
      .select('*, profiles:driver_id(id, first_name, last_name, avatar_url)')
      .eq('ride_date', rideDate)
      .gt('seats_available', 0)
      .not('origin', 'like', '~%') // Filter out inactive rides

    if (rideDate === today) {
      query = query.gte('ride_time', currentTime)
    }

    const { data, error } = await query
      .order('ride_date', { ascending: true })
      .order('ride_time', { ascending: true })

    if (error) {
      throw friendlyError('Unable to search for similar rides', error)
    }

    const rides = data || []
    const distanceThresholdMeters = 3218.69 // 2 miles
    let filtered = rides.filter(ride => {
      const haveRideOrigin =
        typeof ride.origin_lat === 'number' && typeof ride.origin_lng === 'number'
      const haveRideDestination =
        typeof ride.destination_lat === 'number' && typeof ride.destination_lng === 'number'
      if (!haveRideOrigin || !haveRideDestination) return false

      const originDist = haversineMeters(originLat!, originLng!, ride.origin_lat, ride.origin_lng)
      const destDist = haversineMeters(destinationLat!, destinationLng!, ride.destination_lat, ride.destination_lng)
      return originDist <= distanceThresholdMeters && destDist <= distanceThresholdMeters
    })

    // Fetch similar ride requests within a 2-hour window of the desired time (if provided)
    const { data: rideRequests, error: rideRequestError } = await supabaseAdmin
      .from('ride_requests')
      .select('*, profiles:rider_id(id, first_name, last_name, email, avatar_url)')
      .eq('ride_date', rideDate)
      .not('status', 'eq', 'cancelled')
      .order('ride_date', { ascending: true })
      .order('ride_time', { ascending: true })

    if (rideRequestError) {
      throw friendlyError('Unable to search for similar ride requests', rideRequestError)
    }

    const withinTwoHours = (candidateTime?: string | null) => {
      if (!rideTime || !candidateTime) return true
      const base = new Date(`1970-01-01T${rideTime}:00Z`).getTime()
      const candidate = new Date(`1970-01-01T${candidateTime}:00Z`).getTime()
      const diffMs = Math.abs(base - candidate)
      return diffMs <= 2 * 60 * 60 * 1000
    }

    let filteredRequests = (rideRequests || []).filter(req => {
      const haveReqOrigin =
        typeof req.origin_lat === 'number' && typeof req.origin_lng === 'number'
      const haveReqDest =
        typeof req.destination_lat === 'number' && typeof req.destination_lng === 'number'
      if (!haveReqOrigin || !haveReqDest) return false

      const originDist = haversineMeters(originLat!, originLng!, req.origin_lat, req.origin_lng)
      const destDist = haversineMeters(destinationLat!, destinationLng!, req.destination_lat, req.destination_lng)

      return originDist <= distanceThresholdMeters && destDist <= distanceThresholdMeters && withinTwoHours(req.ride_time)
    })

    // Filter out rides and ride requests from blocked users
    // Also filter out rides where blocked users are riders
    if (params.viewerId) {
      const blockedIds = await blockService.getBlockedUsers(params.viewerId)
      const blockedSet = new Set(blockedIds)
      
      // Filter out rides from blocked drivers
      filtered = filtered.filter((ride: any) => {
        const driverId = ride.driver_id || ride.profiles?.id
        return !blockedSet.has(driverId)
      })
      
      // Check if any blocked user is a rider on these rides
      if (filtered.length > 0) {
        const rideIds = filtered.map((r: any) => r.id)
        
        // Fetch all bookings for these rides
        const { data: bookings } = await supabaseAdmin
          .from('ride_bookings')
          .select('ride_id, rider_id')
          .in('ride_id', rideIds)
        
        // Create a set of ride IDs that have blocked riders
        const ridesWithBlockedRiders = new Set<number>()
        if (bookings) {
          bookings.forEach((booking: any) => {
            if (blockedSet.has(booking.rider_id)) {
              ridesWithBlockedRiders.add(booking.ride_id)
            }
          })
        }
        
        // Filter out rides that have blocked riders
        filtered = filtered.filter((ride: any) => !ridesWithBlockedRiders.has(ride.id))
      }
      
      filteredRequests = filteredRequests.filter((req: any) => {
        const riderId = req.rider_id || req.profiles?.id
        return !blockedSet.has(riderId)
      })
    }

    return { rides: filtered, rideRequests: filteredRequests }
  },

  async listForRider(riderId: string) {
    const { data, error } = await supabaseAdmin
      .from('ride_requests')
      .select('*, profiles:rider_id(id, first_name, last_name, email, avatar_url)')
      .eq('rider_id', riderId)
      .order('created_at', { ascending: false })

    if (error) {
      throw friendlyError('Unable to fetch ride requests', error)
    }

    return data ?? []
  },

  async listAll(viewerId: string) {
    const { data, error } = await supabaseAdmin
      .from('ride_requests')
      .select('*, profiles:rider_id(id, first_name, last_name, email, avatar_url)')
      .eq('is_completed', false)
      .neq('rider_id', viewerId)
      .order('created_at', { ascending: false })

    if (error) {
      throw friendlyError('Unable to fetch ride requests', error)
    }

    // Filter out ride requests from blocked users
    const blockedIds = await blockService.getBlockedUsers(viewerId)
    const blockedSet = new Set(blockedIds)
    
    return (data ?? []).filter((req: any) => {
      const riderId = req.rider_id || req.profiles?.id
      return !blockedSet.has(riderId)
    })
  },

  async getById(id: number) {
    const { data, error } = await supabaseAdmin
      .from('ride_requests')
      .select('*, profiles:rider_id(id, first_name, last_name, email, avatar_url)')
      .eq('id', id)
      .maybeSingle()

    if (error) throw friendlyError('Unable to load ride request', error)
    return data
  },

  async create(params: {
    riderId: string
    origin: string
    destination: string
    rideDate: string
    rideTime?: string | null
    seats?: number
    message?: string | null
    originLat?: number | null
    originLng?: number | null
    destinationLat?: number | null
    destinationLng?: number | null
  }) {
    const origin = normalizeText(params.origin)
    const destination = normalizeText(params.destination)
    const rideDate = normalizeText(params.rideDate)
    const rideTime = normalizeText(params.rideTime || '') || null
    const seats = Number(params.seats ?? 1)
    const message = params.message ?? null

    if (!origin) throw new Error('Origin is required')
    if (!destination) throw new Error('Destination is required')
    if (!rideDate) throw new Error('Ride date is required')
    validateDate(rideDate)

    if (!Number.isInteger(seats) || seats <= 0) {
      throw new Error('Seats must be at least 1')
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('ride_requests')
      .select('id, status')
      .eq('rider_id', params.riderId)
      .ilike('origin', origin)
      .ilike('destination', destination)
      .eq('ride_date', rideDate)
      .in('status', ['pending', 'matched'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingError) {
      throw friendlyError('Unable to check existing ride requests', existingError)
    }

    if (existing) {
      throw new Error('You already have a request for this route and date')
    }

    const { data, error } = await supabaseAdmin
      .from('ride_requests')
      .insert({
        rider_id: params.riderId,
        origin,
        destination,
        ride_date: rideDate,
        ride_time: rideTime,
        seats,
        message,
        origin_lat: params.originLat ?? null,
        origin_lng: params.originLng ?? null,
        destination_lat: params.destinationLat ?? null,
        destination_lng: params.destinationLng ?? null,
        interested_rider_ids: [params.riderId] // seed creator as interested
      })
      .select('*, profiles:rider_id(id, first_name, last_name, email, avatar_url)')
      .single()

    if (error || !data) {
      throw friendlyError('Unable to create ride request', error)
    }

    return data
  },

  async joinRideRequest(params: { requestId: number; riderId: string }) {
    const { requestId, riderId } = params
    if (!Number.isInteger(requestId) || requestId <= 0) {
      throw new Error('Invalid ride request id')
    }

    const { data: request, error: fetchError } = await supabaseAdmin
      .from('ride_requests')
      .select('id, rider_id, interested_rider_ids, status')
      .eq('id', requestId)
      .maybeSingle()

    if (fetchError) {
      throw friendlyError('Unable to fetch ride request', fetchError)
    }

    if (!request) {
      throw new Error('Ride request not found')
    }

    if (request.rider_id === riderId) {
      throw new Error('You already own this ride request')
    }

    if (request.status === 'cancelled') {
      throw new Error('Cannot join a cancelled ride request')
    }

    const existingList: string[] = Array.isArray(request.interested_rider_ids)
      ? request.interested_rider_ids
      : []

    if (existingList.includes(riderId)) {
      throw new Error('You already joined this ride request')
    }

    const updatedIds = Array.from(new Set([...existingList, riderId]))

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('ride_requests')
      .update({ interested_rider_ids: updatedIds })
      .eq('id', requestId)
      .select('*, profiles:rider_id(id, first_name, last_name, email, avatar_url)')
      .single()

    if (updateError || !updated) {
      throw friendlyError('Unable to join ride request', updateError)
    }

    return updated
  },

  async cancelMyRequest(requestId: number, riderId: string) {
    if (!Number.isInteger(requestId) || requestId <= 0) throw new Error('Invalid ride request id')

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('ride_requests')
      .select('id, rider_id, status, interested_rider_ids, is_completed')
      .eq('id', requestId)
      .maybeSingle()
    if (fetchErr) throw friendlyError('Unable to load ride request', fetchErr)
    if (!existing) throw new Error('Ride request not found')
    if (existing.rider_id !== riderId) throw new Error('Unauthorized')
    if (existing.status === 'cancelled') throw new Error('Request already cancelled')

    const interested = Array.isArray(existing.interested_rider_ids)
      ? existing.interested_rider_ids
      : []
    const filteredInterested = interested.filter((id: any) => id !== riderId)
    const shouldComplete = filteredInterested.length === 0

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('ride_requests')
      .update({
        status: 'cancelled',
        interested_rider_ids: filteredInterested,
        is_completed: shouldComplete ? true : existing.is_completed
      })
      .eq('id', requestId)
      .select()
      .single()
    if (updateErr || !updated) throw friendlyError('Unable to cancel request', updateErr)
    return updated
  },

  async createRideFromRequest(params: {
    requestId: number
    driverId: string
    rideOverrides: any
    inviteRiderIds?: string[]
  }) {
    const { requestId, driverId, rideOverrides, inviteRiderIds } = params
    if (!Number.isInteger(requestId) || requestId <= 0) throw new Error('Invalid ride request id')

    const { data: request, error: requestError } = await supabaseAdmin
      .from('ride_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle()
    if (requestError) throw friendlyError('Unable to load ride request', requestError)
    if (!request) throw new Error('Ride request not found')
    if (request.status === 'cancelled') throw new Error('Ride request is cancelled')

    const payload = buildRidePayloadFromRequest(request, driverId, rideOverrides || {})
    const { data: ride, error: rideError } = await supabaseAdmin
      .from('rides')
      .insert(payload)
      .select('*')
      .single()
    if (rideError || !ride) throw friendlyError('Unable to create ride', rideError)

    // Seed invites for selected riders (default: interested list)
    const ridersToInvite = Array.from(
      new Set(
        ((inviteRiderIds && inviteRiderIds.length ? inviteRiderIds : request.interested_rider_ids) || []).filter(
          (id: any) => typeof id === 'string' && id.length > 0
        )
      )
    )
    if (ridersToInvite.length) {
      const inviteRows = ridersToInvite.map(riderId => ({
        ride_id: ride.id,
        ride_request_id: requestId,
        rider_id: riderId,
        status: 'pending'
      }))
      const { error: inviteError } = await supabaseAdmin.from('ride_invites').insert(inviteRows)
      if (inviteError) throw friendlyError('Ride created but failed to invite riders', inviteError)
    }

    return { ride, invites: ridersToInvite.length }
  }
}
