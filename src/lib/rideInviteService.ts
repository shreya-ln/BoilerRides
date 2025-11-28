import { apiClient } from './apiClient'

export type RideInviteStatus = 'pending' | 'accepted' | 'declined'

export interface RideInvite {
  id: number
  ride_id: number
  ride_request_id: number | null
  rider_id: string
  status: RideInviteStatus
  created_at: string
  updated_at: string
  rides?: any
  ride_requests?: any
  profiles?: any
}

export const rideInviteService = {
  async listMine(): Promise<RideInvite[]> {
    return apiClient.get<RideInvite[]>('/api/ride-invites/me')
  },

  async listForRide(rideId: number): Promise<RideInvite[]> {
    return apiClient.get<RideInvite[]>(`/api/ride-invites/ride/${rideId}`)
  },

  async listForDriver(): Promise<RideInvite[]> {
    return apiClient.get<RideInvite[]>('/api/ride-invites/driver/me')
  },

  async accept(inviteId: number): Promise<RideInvite> {
    return apiClient.post<RideInvite>(`/api/ride-invites/${inviteId}/accept`)
  },

  async decline(inviteId: number): Promise<RideInvite> {
    return apiClient.post<RideInvite>(`/api/ride-invites/${inviteId}/decline`)
  }
}
