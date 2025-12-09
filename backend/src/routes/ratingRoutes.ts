import express, { Request, Response } from 'express'
import { ratingService } from '../services/ratingService'
import { requireAuth } from '../middleware/requireAuth'

const router = express.Router()

/**
 * POST /api/ratings
 * Submit a rating for a driver after a ride
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rideId, driverId, rating, comment } = req.body
    const riderId = req.user?.id

    if (!riderId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    if (!rideId || !driverId || !rating) {
      return res.status(400).json({ error: 'Missing required fields: rideId, driverId, rating' })
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' })
    }

    const ratingRecord = await ratingService.submitRating(
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
    console.error('Error submitting rating:', error)
    res.status(500).json({
      error: error?.message || 'Failed to submit rating'
    })
  }
})

/**
 * GET /api/ratings/driver/:driverId
 * Get average rating and all ratings for a driver
 */
router.get('/driver/:driverId', async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params

    if (!driverId) {
      return res.status(400).json({ error: 'Missing driverId' })
    }

    const [averageRating, allRatings] = await Promise.all([
      ratingService.getDriverAverageRating(driverId),
      ratingService.getDriverRatings(driverId)
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
    console.error('Error fetching driver ratings:', error)
    res.status(500).json({
      error: error?.message || 'Failed to fetch driver ratings'
    })
  }
})

/**
 * GET /api/ratings/ride/:rideId
 * Get rating for a specific ride (requires auth)
 */
router.get('/ride/:rideId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rideId } = req.params
    const riderId = req.user?.id

    if (!riderId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    if (!rideId) {
      return res.status(400).json({ error: 'Missing rideId' })
    }

    const ratingRecord = await ratingService.getRideRating(Number(rideId), riderId)

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
 * PUT /api/ratings/:ratingId
 * Update an existing rating (requires auth)
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

    const updatedRating = await ratingService.updateRating(
      Number(ratingId),
      rating,
      comment
    )

    res.json({
      success: true,
      data: updatedRating
    })
  } catch (error: any) {
    console.error('Error updating rating:', error)
    res.status(500).json({
      error: error?.message || 'Failed to update rating'
    })
  }
})

export default router
