import { PostgrestError } from '@supabase/supabase-js'
import { supabaseAdmin } from '../lib/supabaseClient'

const friendlyError = (fallback: string, error?: PostgrestError | null) => {
  const message = error?.message || fallback
  const err = new Error(message)
  err.name = error?.code || err.name
  return err
}

const toRad = (v: number) => (v * Math.PI) / 180

export const rideInviteService = {
  async listForRider(riderId: string) {
    const { data, error } = await supabaseAdmin
      .from('ride_invites')
      .select('*, rides:ride_id(*, profiles:driver_id(id, first_name, last_name, email)), ride_requests:ride_request_id(id, origin, destination, ride_date, ride_time)')
      .eq('rider_id', riderId)
      .order('created_at', { ascending: false })

    if (error) throw friendlyError('Unable to load invites', error)
    return data || []
  },

  async listForDriver(driverId: string) {
    // Fetch ride ids owned by this driver first
    const { data: rides, error: rideErr } = await supabaseAdmin
      .from('rides')
      .select('id')
      .eq('driver_id', driverId)
    if (rideErr) throw friendlyError('Unable to load driver rides', rideErr)
    const rideIds = (rides || []).map(r => r.id).filter((id): id is number => typeof id === 'number')
    if (!rideIds.length) return []

    const { data, error } = await supabaseAdmin
      .from('ride_invites')
      .select('*, rides:ride_id(*, profiles:driver_id(id, first_name, last_name, email)), ride_requests:ride_request_id(id, origin, destination, ride_date, ride_time), profiles:rider_id(id, first_name, last_name, email, avatar_url)')
      .in('ride_id', rideIds)
      .order('ride_id', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) throw friendlyError('Unable to load invites for driver', error)
    return data || []
  },

  async listForRide(driverId: string, rideId: number) {
    const { data: ride, error: rideError } = await supabaseAdmin
      .from('rides')
      .select('id, driver_id')
      .eq('id', rideId)
      .maybeSingle()
    if (rideError) throw friendlyError('Unable to load ride', rideError)
    if (!ride) throw new Error('Ride not found')
    if (ride.driver_id !== driverId) throw new Error('Unauthorized')

    const { data, error } = await supabaseAdmin
      .from('ride_invites')
      .select('*, profiles:rider_id(id, first_name, last_name, email, avatar_url), ride_requests:ride_request_id(id, origin, destination, ride_date, ride_time)')
      .eq('ride_id', rideId)
      .order('created_at', { ascending: true })

    if (error) throw friendlyError('Unable to load ride invites', error)
    return data || []
  },

  async acceptInvite(inviteId: number, riderId: string) {
    if (!Number.isInteger(inviteId) || inviteId <= 0) throw new Error('Invalid invite id')

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('ride_invites')
      .select('id, rider_id, ride_id, status, ride_request_id')
      .eq('id', inviteId)
      .maybeSingle()
    if (inviteError) throw friendlyError('Unable to load invite', inviteError)
    if (!invite) throw new Error('Invite not found')
    // Normalize missing rider_id if somehow absent
    const inviteRiderId = invite.rider_id || riderId
    if (inviteRiderId !== riderId) throw new Error('Unauthorized')
    if (invite.status !== 'pending') throw new Error('Invite already responded to')

    // Load ride for seat check
    const { data: ride, error: rideError } = await supabaseAdmin
      .from('rides')
      .select('id, seats_available, price, driver_id')
      .eq('id', invite.ride_id)
      .maybeSingle()
    if (rideError) throw friendlyError('Unable to load ride', rideError)
    if (!ride) throw new Error('Ride not found')
    const seatsAvailable = Number(ride.seats_available ?? 0)
    if (seatsAvailable < 1) throw new Error('No seats available')

    // Create booking (1 seat) and update invite status and seats atomically best-effort
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('ride_bookings')
      .insert({ ride_id: invite.ride_id, rider_id: inviteRiderId, seats: 1 })
      .select()
      .single()
    if (bookingError || !booking) throw friendlyError('Unable to create booking', bookingError)

    const { data: updatedInvite, error: inviteUpdateError } = await supabaseAdmin
      .from('ride_invites')
      .update({ status: 'accepted', rider_id: inviteRiderId })
      .eq('id', inviteId)
      .select()
      .single()
    if (inviteUpdateError) throw friendlyError('Unable to update invite', inviteUpdateError)

    try {
      await supabaseAdmin
        .from('rides')
        .update({ seats_available: Math.max(0, seatsAvailable - 1) })
        .eq('id', invite.ride_id)
    } catch (e) {
      // ignore best-effort
    }

    // If invite tied to a ride_request, update interested list and completion
    if (invite.ride_request_id) {
      const rideRequestId = invite.ride_request_id as number
      try {
        const { data: request } = await supabaseAdmin
          .from('ride_requests')
          .select('interested_rider_ids, is_completed')
          .eq('id', rideRequestId)
          .maybeSingle()
        if (request) {
          const interested = Array.isArray(request.interested_rider_ids)
            ? request.interested_rider_ids.filter((id: any) => typeof id === 'string')
            : []
          const remaining = interested.filter(id => id !== inviteRiderId)

          const { data: inviteStatuses } = await supabaseAdmin
            .from('ride_invites')
            .select('rider_id, status')
            .eq('ride_request_id', rideRequestId)

          const accepted = new Set<string>(
            (inviteStatuses || [])
              .filter((i: any) => i.status === 'accepted' && i.rider_id)
              .map((i: any) => i.rider_id as string)
          )
          const allAccepted = Array.from(remaining).every(id => accepted.has(id))
          const shouldComplete = allAccepted || remaining.length === 0

          await supabaseAdmin
            .from('ride_requests')
            .update({
              interested_rider_ids: remaining,
              is_completed: shouldComplete ? true : request.is_completed,
              status: shouldComplete ? 'matched' : request.status
            })
            .eq('id', rideRequestId)
        }
      } catch (e) {
        // ignore best-effort
      }
    }

    return updatedInvite
  },

  async declineInvite(inviteId: number, riderId: string) {
    if (!Number.isInteger(inviteId) || inviteId <= 0) throw new Error('Invalid invite id')

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('ride_invites')
      .select('id, rider_id, status')
      .eq('id', inviteId)
      .maybeSingle()
    if (inviteError) throw friendlyError('Unable to load invite', inviteError)
    if (!invite) throw new Error('Invite not found')
    if (invite.rider_id !== riderId) throw new Error('Unauthorized')
    if (invite.status !== 'pending') throw new Error('Invite already responded to')

    const { data: updatedInvite, error: inviteUpdateError } = await supabaseAdmin
      .from('ride_invites')
      .update({ status: 'declined' })
      .eq('id', inviteId)
      .select()
      .single()
    if (inviteUpdateError) throw friendlyError('Unable to update invite', inviteUpdateError)
    return updatedInvite
  }
}
