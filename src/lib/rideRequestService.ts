import { apiClient } from './apiClient'

export type RideRequestStatus = 'pending' | 'matched' | 'cancelled'

export interface RideRequest {
  id: number
  rider_id: string
  origin: string
  destination: string
  ride_date: string
  ride_time: string | null
  seats: number
  status: RideRequestStatus
  message: string | null
  created_at: string
  updated_at: string
  profiles?: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    avatar_url: string | null
  }
}

export interface RideRequestInput {
  origin: string
  destination: string
  rideDate: string
  rideTime?: string | null
  seats?: number
  message?: string | null
}

export const rideRequestService = {
  async create(payload: RideRequestInput): Promise<RideRequest> {
    return apiClient.post<RideRequest>('/api/ride-requests', payload)
  },

  async findSimilar(params: { origin: string; destination: string; rideDate: string; rideTime?: string | null }) {
    const searchParams = new URLSearchParams({
      origin: params.origin,
      destination: params.destination,
      rideDate: params.rideDate
    })

    if (params.rideTime) {
      searchParams.set('rideTime', params.rideTime)
    }

    return apiClient.get<{ rides: any[]; rideRequests: RideRequest[] }>(`/api/ride-requests/similar?${searchParams.toString()}`)
  },

  async listMine(): Promise<RideRequest[]> {
    return apiClient.get<RideRequest[]>('/api/ride-requests/me')
  },

  async joinRideRequest(requestId: number): Promise<RideRequest> {
    return apiClient.post<RideRequest>(`/api/ride-requests/${requestId}/join`)
  }
}
