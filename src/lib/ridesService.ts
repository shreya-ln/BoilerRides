import { supabase } from '@/lib/supabase'
import { apiClient } from '@/lib/apiClient'


export interface Ride {
  id: number
  created_at: string
  updated_at: string
  origin: string
  destination: string
  origin_lat?: number | null
  origin_lng?: number | null
  destination_lat?: number | null
  destination_lng?: number | null
  ride_date: string
  ride_time: string
  duration: string | null
  driver_id: string
  rating: number | null
  price: number
  seats_available: number
  total_seats: number
  car_type?: string | null
  car_notes?: string | null
  special_moment?: string | null
}

export interface CreateRideInput {
  origin: string
  destination: string
  origin_lat?: number | null
  origin_lng?: number | null
  destination_lat?: number | null
  destination_lng?: number | null
  ride_date: string // yyyy-MM-dd
  ride_time: string // HH:mm
  price: number
  total_seats: number
  seats_available?: number
  duration?: string | null
  car_type?: string | null
  car_notes?: string | null
  special_moment?: string | null
}

export const ridesService = {
  // Inserts a new ride for the authenticated driver
  async createRide(driverId: string, input: CreateRideInput) {
    const payload = {
      ...input,
      seats_available: input.seats_available ?? input.total_seats,
      driver_id: driverId,
    }

    const { data, error } = await supabase
      .from('rides')
      .insert(payload)
      .select()
      .single<Ride>()

    return { data, error }
  },

  // Lists rides with optional filters
  async listRides(filters?: { destinationIlike?: string; dateEq?: string; timeGte?: string }) {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const currentTime = now.toTimeString().split(' ')[0]

    let query = supabase
      .from('rides')
      .select('*, profiles:driver_id(first_name,last_name,avatar_url)')

    if (filters?.destinationIlike) {
      query = query.ilike('destination', `%${filters.destinationIlike}%`)
    }
    if (filters?.dateEq) {
      query = query.eq('ride_date', filters.dateEq)
    }
    if (filters?.timeGte) {
      query = query.gte('ride_time', filters.timeGte)
    }

    query = query.or(`ride_date.gt.${today},and(ride_date.eq.${today},ride_time.gt.${currentTime})`)

    query = query
      .order('ride_date', { ascending: true })
      .order('ride_time', { ascending: true })

    const { data, error } = await query
    return { data: data ?? [], error }
  },

  // Lists rides created by a specific driver
  async listMyRides(driverId: string) {
    const { data, error } = await supabase
      .from('rides')
      .select('*, profiles:driver_id(first_name,last_name,avatar_url)')
      .eq('driver_id', driverId)
      .order('ride_date', { ascending: true })

    return { data: data ?? [], error }
  },

  // Fetch a single ride by id
  async getRide(id: number) {
    const { data, error } = await supabase
      .from('rides')
      .select('*, profiles:driver_id(first_name,last_name,avatar_url)')
      .eq('id', id)
      .single()
    return { data, error }
  },

  // Update a ride (only owner allowed by RLS)
  async updateRide(id: number, updates: Partial<CreateRideInput>) {
    const { data, error } = await supabase
      .from('rides')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // Delete a ride (only owner allowed by RLS)
  async deleteRide(id: number) {
    const { error } = await supabase
      .from('rides')
      .delete()
      .eq('id', id)
    return { error }
  },

  // Upcoming rides the user is hosting (future by date/time)
  async listUpcomingHosting(driverId: string) {
    const { data, error } = await supabase
      .from('rides')
      .select('*, profiles:driver_id(first_name,last_name,avatar_url)')
      .eq('driver_id', driverId)
      .gte('ride_date', new Date().toISOString().slice(0, 10))
      .order('ride_date', { ascending: true })
    return { data: data ?? [], error }
  },

  // Upcoming rides the user booked
  async listUpcomingBooked(riderId: string) {
    const { data, error } = await supabase
      .from('ride_bookings')
      .select('seats, rides:ride_id(*, profiles:driver_id(first_name,last_name,avatar_url))')
      .eq('rider_id', riderId)
    return { data: data ?? [], error }
  },

  // Fetch all riders (bookings) for a specific ride
  async getRideBookings(rideId: number) {
    const { data, error } = await supabase
      .from('ride_bookings')
      .select('id, seats, created_at, rider_id, paid, amount, paid_at, profiles:rider_id(id, first_name, last_name, avatar_url, email)')
      .eq('ride_id', rideId)
      .order('created_at', { ascending: true })
    
    return { data: data ?? [], error }
  },

  // Fetch all bookings for a specific rider
  async getMyBookings(riderId: string) {
    const { data, error } = await supabase
      .from('ride_bookings')
      .select('id, seats, created_at, ride_id, paid, amount, paid_at, rides:ride_id(*,profiles:driver_id(first_name,last_name,avatar_url,email))')
      .eq('rider_id', riderId)
      .order('created_at', { ascending: false })
    
    return { data: data ?? [], error }
  },

  // Mark a booking as paid (mock transaction)
  async markBookingPaid(bookingId: number, amount: number) {
    const { data, error } = await supabase
      .from('ride_bookings')
      .update({ paid: true, amount: amount, paid_at: new Date().toISOString() })
      .eq('id', bookingId)
      .select()
      .single()

    return { data, error }
  },

  // Create a booking for a rider (decrements seats_available atomically)
  async createBooking(riderId: string, rideId: number, seats: number = 1) {
    // Insert booking
    const { data: booking, error: insertError } = await supabase
      .from('ride_bookings')
      .insert({ rider_id: riderId, ride_id: rideId, seats })
      .select()
      .single()

    if (insertError) {
      return { data: null, error: insertError }
    }

    // Decrement available seats on the ride
    const { error: updateError } = await supabase
      .from('rides')
      .update({ seats_available: supabase.rpc ? undefined : null })
      .eq('id', rideId)

    // The above attempt to be safe - if RLS/DB has triggers to maintain seats_available
    // fallback: try fetching current seats and update decrementally
    if (updateError) {
      // Try fallback: fetch ride, then update
      const { data: ride, error: fetchRideErr } = await supabase
        .from('rides')
        .select('seats_available')
        .eq('id', rideId)
        .single()
      if (!fetchRideErr && ride) {
        const newSeats = Math.max(0, (ride.seats_available || 0) - seats)
        await supabase.from('rides').update({ seats_available: newSeats }).eq('id', rideId)
      }
    }

    return { data: booking, error: null }
  },

  // Cancel a booking (rider drops from a ride)
  // Uses backend API to ensure proper cleanup and seat availability updates
  async cancelBooking(bookingId: number, rideId: number, seatsToFree: number) {
    try {
      const result = await apiClient.post<{ success: boolean; seatsFreed: number }>(
        `/api/rides/${rideId}/bookings/${bookingId}/cancel`,
        { seats: seatsToFree }
      )
      return { data: result, error: null }
    } catch (error: any) {
      return { 
        data: null, 
        error: { message: error.message || 'Failed to cancel booking' } as any 
      }
    }
  },

  // Remove a rider from a ride (driver removes specific rider)
  async removeRiderFromRide(bookingId: number, rideId: number, seatsToFree: number) {
    // Same as cancelBooking but semantically different (driver-initiated)
    return this.cancelBooking(bookingId, rideId, seatsToFree)
  },

  // Delete ride with all bookings (driver deletes ride)
  // Uses backend API to ensure proper cleanup of all riders and join requests
  async deleteRideWithBookings(rideId: number) {
    try {
      const result = await apiClient.delete<{ 
        success: boolean; 
        affectedRiders: any[]; 
        affectedRequests: any[] 
      }>(`/api/rides/${rideId}`)
      return { 
        data: result, 
        error: null,
        affectedRiders: result.affectedRiders || []
      }
    } catch (error: any) {
      return { 
        data: null, 
        error: { message: error.message || 'Failed to delete ride' } as any,
        affectedRiders: []
      }
    }
  },
}
