import { supabase } from './supabase'
import { apiClient } from './apiClient'

export interface RiderRating {
  id: number
  created_at: string
  ride_id: number
  driver_id: string
  rider_id: string
  rating: number
  comment?: string
}

class RiderRatingService {
  /**
   * Submit a rating for a rider after a ride
   */
  async submitRating(rideId: number, riderId: string, rating: number, comment?: string): Promise<RiderRating> {
    const { data, error } = await supabase
      .from('rider_ratings')
      .insert({
        ride_id: rideId,
        rider_id: riderId,
        driver_id: (await supabase.auth.getUser()).data.user?.id,
        rating,
        comment: comment || null
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message || 'Failed to submit rating')
    }

    return data
  }

  /**
   * Get average rating for a rider
   */
  async getRiderAverageRating(riderId: string): Promise<{ average: number; count: number }> {
    const { data, error } = await supabase
      .from('rider_ratings')
      .select('rating')
      .eq('rider_id', riderId)

    if (error) {
      throw new Error(error.message || 'Failed to fetch rider ratings')
    }

    const ratings = data || []
    if (ratings.length === 0) {
      return { average: 0, count: 0 }
    }

    const sum = ratings.reduce((acc, r) => acc + r.rating, 0)
    const average = sum / ratings.length

    return {
      average: Math.round(average * 10) / 10, // Round to 1 decimal place
      count: ratings.length
    }
  }

  /**
   * Get all ratings for a rider
   */
  async getRiderRatings(riderId: string): Promise<RiderRating[]> {
    const { data, error } = await supabase
      .from('rider_ratings')
      .select('*')
      .eq('rider_id', riderId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message || 'Failed to fetch rider ratings')
    }

    return data || []
  }

  /**
   * Get rating for a specific ride (if exists)
   */
  async getRideRating(rideId: number): Promise<RiderRating | null> {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('rider_ratings')
      .select('*')
      .eq('ride_id', rideId)
      .eq('driver_id', userData.user.id)
      .single()

    if (error?.code === 'PGRST116') {
      // No rows found - this is expected if rating hasn't been submitted yet
      return null
    }

    if (error) {
      throw new Error(error.message || 'Failed to fetch ride rating')
    }

    return data || null
  }

  /**
   * Get all reviews/ratings for a rider (with comments)
   */
  async getRiderReviews(riderId: string): Promise<RiderRating[]> {
    const { data, error } = await supabase
      .from('rider_ratings')
      .select('*')
      .eq('rider_id', riderId)
      .not('comment', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message || 'Failed to fetch rider reviews')
    }

    return data || []
  }

  /**
   * Update an existing rating
   */
  async updateRating(ratingId: number, rating: number, comment?: string): Promise<RiderRating> {
    const { data, error } = await supabase
      .from('rider_ratings')
      .update({
        rating,
        comment: comment || null
      })
      .eq('id', ratingId)
      .select()
      .single()

    if (error) {
      throw new Error(error.message || 'Failed to update rating')
    }

    return data
  }
}

export const riderRatingService = new RiderRatingService()
