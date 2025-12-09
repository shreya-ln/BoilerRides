import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth'
import { waitlistService } from '../services/waitlistService'

const router = Router()

/**
 * POST /api/waitlist
 * Adds current user to waitlist for a ride
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { rideId, seats } = req.body

    if (!rideId || !Number.isInteger(Number(rideId)) || Number(rideId) <= 0) {
      return res.status(400).json({ message: 'Invalid ride id' })
    }

    const result = await waitlistService.addToWaitlist({
      riderId: req.user!.id,
      rideId: Number(rideId),
      seats: seats ? Number(seats) : 1
    })

    return res.json(result)
  } catch (error: any) {
    const message = error.message || 'Failed to add to waitlist'
    const status = message.includes('Invalid') || message.includes('already') || message.includes('not found') || message.includes('authorized')
      ? 400
      : message.includes('authorized')
        ? 403
        : 500
    return res.status(status).json({ message })
  }
})

/**
 * DELETE /api/waitlist/:rideId
 * Removes current user from waitlist for a ride
 */
router.delete('/:rideId', requireAuth, async (req, res) => {
  try {
    const rideId = Number(req.params.rideId)

    if (!rideId || rideId <= 0) {
      return res.status(400).json({ message: 'Invalid ride id' })
    }

    const result = await waitlistService.removeFromWaitlist({
      riderId: req.user!.id,
      rideId
    })

    return res.json(result)
  } catch (error: any) {
    const message = error.message || 'Failed to remove from waitlist'
    const status = message.includes('Invalid') || message.includes('not found')
      ? 400
      : 500
    return res.status(status).json({ message })
  }
})

/**
 * GET /api/waitlist/ride/:rideId
 * Gets waitlist for a specific ride (driver only)
 */
router.get('/ride/:rideId', requireAuth, async (req, res) => {
  try {
    const rideId = Number(req.params.rideId)

    if (!rideId || rideId <= 0) {
      return res.status(400).json({ message: 'Invalid ride id' })
    }

    const result = await waitlistService.getWaitlistForRide({
      driverId: req.user!.id,
      rideId
    })

    return res.json(result)
  } catch (error: any) {
    const message = error.message || 'Failed to get waitlist'
    const status = message.includes('Invalid') || message.includes('not found')
      ? 400
      : message.includes('authorized')
        ? 403
        : 500
    return res.status(status).json({ message })
  }
})

/**
 * GET /api/waitlist/count/:rideId
 * Gets waitlist count for a ride
 */
router.get('/count/:rideId', requireAuth, async (req, res) => {
  try {
    const rideId = Number(req.params.rideId)

    if (!rideId || rideId <= 0) {
      return res.status(400).json({ message: 'Invalid ride id' })
    }

    const count = await waitlistService.getWaitlistCount(rideId)

    return res.json({ count })
  } catch (error: any) {
    const message = error.message || 'Failed to get waitlist count'
    const status = message.includes('Invalid')
      ? 400
      : 500
    return res.status(status).json({ message })
  }
})

/**
 * GET /api/waitlist/me
 * Gets all waitlists for current user
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await waitlistService.getMyWaitlists(req.user!.id)

    return res.json(result)
  } catch (error: any) {
    const message = error.message || 'Failed to get waitlists'
    return res.status(500).json({ message })
  }
})

export default router

