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
  interested_rider_ids?: string[]
  is_completed?: boolean
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
  originLat?: number | null
  originLng?: number | null
  destinationLat?: number | null
  destinationLng?: number | null
}

export const rideRequestService = {
  async create(payload: RideRequestInput): Promise<RideRequest> {
    return apiClient.post<RideRequest>('/api/ride-requests', payload)
  },

  async findSimilar(params: {
    origin: string
    destination: string
    rideDate: string
    rideTime?: string | null
    originLat?: number | null
    originLng?: number | null
    destinationLat?: number | null
    destinationLng?: number | null
  }) {
    const searchParams = new URLSearchParams({
      origin: params.origin,
      destination: params.destination,
      rideDate: params.rideDate
    })

    if (params.rideTime) {
      searchParams.set('rideTime', params.rideTime)
    }
    if (typeof params.originLat === 'number') {
      searchParams.set('originLat', String(params.originLat))
    }
    if (typeof params.originLng === 'number') {
      searchParams.set('originLng', String(params.originLng))
    }
    if (typeof params.destinationLat === 'number') {
      searchParams.set('destinationLat', String(params.destinationLat))
    }
    if (typeof params.destinationLng === 'number') {
      searchParams.set('destinationLng', String(params.destinationLng))
    }

    return apiClient.get<{ rides: any[]; rideRequests: RideRequest[] }>(`/api/ride-requests/similar?${searchParams.toString()}`)
  },

  async listMine(): Promise<RideRequest[]> {
    return apiClient.get<RideRequest[]>('/api/ride-requests/me')
  },

  async joinRideRequest(requestId: number): Promise<RideRequest> {
    return apiClient.post<RideRequest>(`/api/ride-requests/${requestId}/join`)
  },

  async cancel(requestId: number): Promise<RideRequest> {
    return apiClient.post<RideRequest>(`/api/ride-requests/${requestId}/cancel`)
  },

  async listAll(): Promise<RideRequest[]> {
    return apiClient.get<RideRequest[]>('/api/ride-requests/all')
  },

  async getById(id: number): Promise<RideRequest> {
    return apiClient.get<RideRequest>(`/api/ride-requests/${id}`)
  },

  async createRideFromRequest(requestId: number, rideOverrides: any, inviteRiderIds?: string[]) {
    return apiClient.post<{ ride: any; invites: number }>(`/api/ride-requests/${requestId}/create-ride`, {
      rideOverrides,
      inviteRiderIds
    })
  }
}
