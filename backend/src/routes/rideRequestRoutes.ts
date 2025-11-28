import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth'
import { rideRequestService } from '../services/rideRequestService'

const router = Router()

router.get('/similar', requireAuth, async (req, res) => {
  try {
    const { origin, destination, rideDate, rideTime } = req.query
    if (!origin || !destination || !rideDate) {
      return res.status(400).json({ message: 'origin, destination, and rideDate are required' })
    }

    const result = await rideRequestService.findSimilar({
      origin: String(origin),
      destination: String(destination),
      rideDate: String(rideDate),
      rideTime: rideTime ? String(rideTime) : undefined
    })

    return res.json(result)
  } catch (error: any) {
    const message = error.message || 'Failed to search for similar rides'
    const status = message.includes('Invalid') || message.includes('required') ? 400 : 500
    return res.status(status).json({ message })
  }
})

router.get('/me', requireAuth, async (req, res) => {
  try {
    const requests = await rideRequestService.listForRider(req.user!.id)
    return res.json(requests)
  } catch (error: any) {
    const message = error.message || 'Failed to fetch ride requests'
    const status = message.includes('Invalid') || message.includes('required') ? 400 : 500
    return res.status(status).json({ message })
  }
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const { origin, destination, rideDate, rideTime, seats = 1, message } = req.body
    const result = await rideRequestService.create({
      riderId: req.user!.id,
      origin,
      destination,
      rideDate,
      rideTime,
      seats: Number(seats),
      message
    })

    return res.status(201).json(result)
  } catch (error: any) {
    const message = error.message || 'Failed to create ride request'
    const status = message.includes('already have') || message.includes('Invalid') || message.includes('required') ? 400 : 500
    return res.status(status).json({ message })
  }
})

router.post('/:requestId/join', requireAuth, async (req, res) => {
  try {
    const requestId = Number(req.params.requestId)
    if (!requestId) {
      return res.status(400).json({ message: 'requestId must be a number' })
    }

    const result = await rideRequestService.joinRideRequest({
      requestId,
      riderId: req.user!.id
    })

    return res.json(result)
  } catch (error: any) {
    const message = error.message || 'Failed to join ride request'
    const status = message.includes('Invalid') || message.includes('already') ? 400 : 500
    return res.status(status).json({ message })
  }
})

export default router
