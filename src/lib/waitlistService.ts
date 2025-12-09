import { apiClient } from './apiClient'

export interface WaitlistEntry {
  id: number
  ride_id: number
  rider_id: string
  seats: number
  created_at: string
  profiles?: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    avatar_url: string | null
  }
  rides?: {
    id: number
    origin: string
    destination: string
    ride_date: string
    ride_time: string
    driver_id: string
    seats_available: number
    total_seats: number
    price: number
    profiles?: {
      id: string
      first_name: string | null
      last_name: string | null
      avatar_url: string | null
    }
  }
}

export interface WaitlistCount {
  count: number
}

export const waitlistService = {
  /**
   * Adds current user to waitlist for a ride
   */
  async addToWaitlist(rideId: number, seats: number = 1): Promise<WaitlistEntry> {
    return apiClient.post<WaitlistEntry>('/api/waitlist', { rideId, seats })
  },

  /**
   * Removes current user from waitlist for a ride
   */
  async removeFromWaitlist(rideId: number): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/api/waitlist/${rideId}`)
  },

  /**
   * Gets waitlist for a specific ride (driver only)
   */
  async getWaitlistForRide(rideId: number): Promise<WaitlistEntry[]> {
    return apiClient.get<WaitlistEntry[]>(`/api/waitlist/ride/${rideId}`)
  },

  /**
   * Gets waitlist count for a ride
   */
  async getWaitlistCount(rideId: number): Promise<number> {
    const result = await apiClient.get<WaitlistCount>(`/api/waitlist/count/${rideId}`)
    return result.count
  },

  /**
   * Gets all waitlists for current user
   */
  async getMyWaitlists(): Promise<WaitlistEntry[]> {
    return apiClient.get<WaitlistEntry[]>('/api/waitlist/me')
  }
}

