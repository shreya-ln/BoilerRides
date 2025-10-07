import { supabase } from '@/lib/supabase'

export interface Ride {
  id: number
  created_at: string
  updated_at: string
  origin: string
  destination: string
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
}


