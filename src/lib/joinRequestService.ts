import { apiClient } from './apiClient'

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
  rides?: {
    id: number
    origin: string
    destination: string
    ride_date: string
    ride_time: string
    driver_id: string
    seats_available: number
    total_seats: number
  }
  profiles?: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    avatar_url: string | null
  }
}

export interface CreateJoinRequestPayload {
  rideId: number
  seats?: number
  message?: string
}

export const joinRequestService = {
  async getMyRequests(): Promise<JoinRequest[]> {
    return apiClient.get<JoinRequest[]>('/api/join-requests/me')
  },

  async create(payload: CreateJoinRequestPayload): Promise<JoinRequest> {
    return apiClient.post<JoinRequest>('/api/join-requests', payload)
  },

  async listForRide(rideId: number): Promise<JoinRequest[]> {
    return apiClient.get<JoinRequest[]>(`/api/join-requests/ride/${rideId}`)
  },

  async cancel(requestId: number): Promise<JoinRequest> {
    return apiClient.post<JoinRequest>(`/api/join-requests/${requestId}/cancel`)
  }
}
