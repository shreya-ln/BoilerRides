import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth'
import { ridesService } from '../services/ridesService'

const router = Router()

/**
 * POST /api/rides/:rideId/bookings/:bookingId/cancel
 * Cancels a rider's booking for a specific ride
 */
router.post('/:rideId/bookings/:bookingId/cancel', requireAuth, async (req, res) => {
  try {
    const rideId = Number(req.params.rideId)
    const bookingId = Number(req.params.bookingId)
    const seats = Number(req.body.seats) || 1

    if (!rideId || rideId <= 0) {
      return res.status(400).json({ message: 'Invalid ride id' })
    }

    if (!bookingId || bookingId <= 0) {
      return res.status(400).json({ message: 'Invalid booking id' })
    }

    if (!seats || seats <= 0) {
      return res.status(400).json({ message: 'Invalid seats count' })
    }

    const result = await ridesService.cancelBooking({
      bookingId,
      riderId: req.user!.id,
      rideId,
      seats
    })

    return res.json(result)
  } catch (error: any) {
    const message = error.message || 'Failed to cancel booking'
    const status = message.includes('authorized')
      ? 403
      : message.includes('not found')
        ? 404
        : message.includes('Invalid')
          ? 400
          : 500
    return res.status(status).json({ message })
  }
})

/**
 * DELETE /api/rides/:rideId
 * Deletes a ride and all associated bookings/join requests
 */
router.delete('/:rideId', requireAuth, async (req, res) => {
  try {
    const rideId = Number(req.params.rideId)

    if (!rideId || rideId <= 0) {
      return res.status(400).json({ message: 'Invalid ride id' })
    }

    const result = await ridesService.deleteRide({
      rideId,
      driverId: req.user!.id
    })

    return res.json(result)
  } catch (error: any) {
    const message = error.message || 'Failed to delete ride'
    const status = message.includes('authorized')
      ? 403
      : message.includes('not found')
        ? 404
        : message.includes('Invalid')
          ? 400
          : 500
    return res.status(status).json({ message })
  }
})

export default router

