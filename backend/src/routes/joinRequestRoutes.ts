import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth'
import { joinRequestService } from '../services/joinRequestService'

const router = Router()

router.post('/', requireAuth, async (req, res) => {
  try {
    const { rideId, seats = 1, message } = req.body
    const parsedRideId = Number(rideId)
    const parsedSeats = Number(seats)

    if (!parsedRideId || parsedRideId <= 0) {
      return res.status(400).json({ message: 'rideId is required' })
    }

    const result = await joinRequestService.create({
      riderId: req.user!.id,
      rideId: parsedRideId,
      seats: parsedSeats,
      message
    })

    return res.status(201).json(result)
  } catch (error: any) {
    return res.status(400).json({ message: error.message || 'Failed to create join request' })
  }
})

router.get('/me', requireAuth, async (req, res) => {
  try {
    const requests = await joinRequestService.listForRider(req.user!.id)
    return res.json(requests)
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to fetch join requests' })
  }
})

router.get('/ride/:rideId', requireAuth, async (req, res) => {
  try {
    const rideId = Number(req.params.rideId)
    if (!rideId) {
      return res.status(400).json({ message: 'rideId must be a number' })
    }

    const requests = await joinRequestService.listForRide(req.user!.id, rideId)
    return res.json(requests)
  } catch (error: any) {
    const message = error.message || 'Failed to fetch join requests'
    const status = message.includes('authorized') ? 403 : message.includes('not found') ? 404 : 500
    return res.status(status).json({ message })
  }
})

router.post('/:requestId/cancel', requireAuth, async (req, res) => {
  try {
    const requestId = Number(req.params.requestId)
    if (!requestId) {
      return res.status(400).json({ message: 'requestId must be a number' })
    }

    const result = await joinRequestService.cancel({
      requestId,
      riderId: req.user!.id
    })

    return res.json(result)
  } catch (error: any) {
    const message = error.message || 'Failed to cancel join request'
    const status = message.includes('authorized')
      ? 403
      : message.includes('not found')
        ? 404
        : message.includes('Invalid') || message.includes('cannot cancel')
          ? 400
          : 500
    return res.status(status).json({ message })
  }
})

router.post('/:requestId/approve', requireAuth, async (req, res) => {
  try {
    const requestId = Number(req.params.requestId)
    if (!requestId) {
      return res.status(400).json({ message: 'requestId must be a number' })
    }

    const result = await joinRequestService.approve({
      requestId,
      driverId: req.user!.id
    })

    return res.json(result)
  } catch (error: any) {
    const message = error.message || 'Failed to approve join request'
    const status = message.includes('authorized') ? 403 : message.includes('not found') ? 404 : 400
    return res.status(status).json({ message })
  }
})

router.post('/:requestId/reject', requireAuth, async (req, res) => {
  try {
    const requestId = Number(req.params.requestId)
    if (!requestId) {
      return res.status(400).json({ message: 'requestId must be a number' })
    }

    const result = await joinRequestService.reject({
      requestId,
      driverId: req.user!.id
    })

    return res.json(result)
  } catch (error: any) {
    const message = error.message || 'Failed to reject join request'
    const status = message.includes('authorized') ? 403 : message.includes('not found') ? 404 : 400
    return res.status(status).json({ message })
  }
})

export default router
