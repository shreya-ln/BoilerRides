import express, { Request, Response } from 'express'
import { riderRatingService } from '../services/riderRatingService'
import { requireAuth } from '../middleware/requireAuth'

const router = express.Router()

/**
 * POST /api/rider-ratings
 * Submit a rating for a rider after a ride (driver rating)
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rideId, riderId, rating, comment } = req.body
    const driverId = req.user?.id

    if (!driverId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    if (!rideId || !riderId || !rating) {
      return res.status(400).json({ error: 'Missing required fields: rideId, riderId, rating' })
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' })
    }

    const ratingRecord = await riderRatingService.submitRating(
      rideId,
      driverId,
      riderId,
      rating,
      comment
    )

    res.status(201).json({
      success: true,
      data: ratingRecord
    })
  } catch (error: any) {
    console.error('Error submitting rider rating:', error)
    res.status(500).json({
      error: error?.message || 'Failed to submit rating'
    })
  }
})

/**
 * GET /api/rider-ratings/rider/:riderId
 * Get average rating and all ratings for a rider
 */
router.get('/rider/:riderId', async (req: Request, res: Response) => {
  try {
    const { riderId } = req.params

    if (!riderId) {
      return res.status(400).json({ error: 'Missing riderId' })
    }

    const [averageRating, allRatings] = await Promise.all([
      riderRatingService.getRiderAverageRating(riderId),
      riderRatingService.getRiderRatings(riderId)
    ])

    res.json({
      success: true,
      data: {
        average: averageRating.average,
        count: averageRating.count,
        ratings: allRatings
      }
    })
  } catch (error: any) {
    console.error('Error fetching rider ratings:', error)
    res.status(500).json({
      error: error?.message || 'Failed to fetch rider ratings'
    })
  }
})

/**
 * GET /api/rider-ratings/ride/:rideId
 * Get rating for a specific ride from driver (requires auth)
 */
router.get('/ride/:rideId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rideId } = req.params
    const driverId = req.user?.id

    if (!driverId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    if (!rideId) {
      return res.status(400).json({ error: 'Missing rideId' })
    }

    const ratingRecord = await riderRatingService.getRideRating(Number(rideId), driverId)

    res.json({
      success: true,
      data: ratingRecord
    })
  } catch (error: any) {
    console.error('Error fetching ride rating:', error)
    res.status(500).json({
      error: error?.message || 'Failed to fetch ride rating'
    })
  }
})

/**
 * PUT /api/rider-ratings/:ratingId
 * Update an existing rider rating (requires auth)
 */
router.put('/:ratingId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { ratingId } = req.params
    const { rating, comment } = req.body

    if (!ratingId) {
      return res.status(400).json({ error: 'Missing ratingId' })
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' })
    }

    const updatedRating = await riderRatingService.updateRating(
      Number(ratingId),
      rating,
      comment
    )

    res.json({
      success: true,
      data: updatedRating
    })
  } catch (error: any) {
    console.error('Error updating rider rating:', error)
    res.status(500).json({
      error: error?.message || 'Failed to update rating'
    })
  }
})

export default router
