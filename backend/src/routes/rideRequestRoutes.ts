import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth'
import { rideRequestService } from '../services/rideRequestService'

const router = Router()

router.get('/similar', requireAuth, async (req, res) => {
  try {
    const { origin, destination, rideDate, rideTime, originLat, originLng, destinationLat, destinationLng } = req.query
    if (!origin || !destination || !rideDate) {
      return res.status(400).json({ message: 'origin, destination, and rideDate are required' })
    }

    const result = await rideRequestService.findSimilar({
      origin: String(origin),
      destination: String(destination),
      rideDate: String(rideDate),
      rideTime: rideTime ? String(rideTime) : undefined,
      originLat: originLat !== undefined ? Number(originLat) : undefined,
      originLng: originLng !== undefined ? Number(originLng) : undefined,
      destinationLat: destinationLat !== undefined ? Number(destinationLat) : undefined,
      destinationLng: destinationLng !== undefined ? Number(destinationLng) : undefined
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

router.get('/all', requireAuth, async (req, res) => {
  try {
    const requests = await rideRequestService.listAll(req.user!.id)
    return res.json(requests)
  } catch (error: any) {
    const message = error.message || 'Failed to fetch ride requests'
    const status = message.includes('Invalid') || message.includes('required') ? 400 : 500
    return res.status(status).json({ message })
  }
})

router.get('/:requestId', requireAuth, async (req, res) => {
  try {
    const requestId = Number(req.params.requestId)
    if (!requestId) return res.status(400).json({ message: 'requestId must be a number' })
    const request = await rideRequestService.getById(requestId)
    if (!request) return res.status(404).json({ message: 'Ride request not found' })
    return res.json(request)
  } catch (error: any) {
    const message = error.message || 'Failed to fetch ride request'
    const status = message.includes('Invalid') ? 400 : 500
    return res.status(status).json({ message })
  }
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      origin,
      destination,
      rideDate,
      rideTime,
      seats = 1,
      message,
      originLat,
      originLng,
      destinationLat,
      destinationLng
    } = req.body
    const result = await rideRequestService.create({
      riderId: req.user!.id,
      origin,
      destination,
      rideDate,
      rideTime,
      seats: Number(seats),
      message,
      originLat: originLat !== undefined ? Number(originLat) : null,
      originLng: originLng !== undefined ? Number(originLng) : null,
      destinationLat: destinationLat !== undefined ? Number(destinationLat) : null,
      destinationLng: destinationLng !== undefined ? Number(destinationLng) : null
    })

    return res.status(201).json(result)
  } catch (error: any) {
    const message = error.message || 'Failed to create ride request'
    const status = message.includes('already have') || message.includes('Invalid') || message.includes('required') ? 400 : 500
    return res.status(status).json({ message })
  }
})

router.post('/:requestId/create-ride', requireAuth, async (req, res) => {
  try {
    const requestId = Number(req.params.requestId)
    if (!requestId) return res.status(400).json({ message: 'requestId must be a number' })

    const { rideOverrides = {}, inviteRiderIds } = req.body || {}
    const result = await rideRequestService.createRideFromRequest({
      requestId,
      driverId: req.user!.id,
      rideOverrides,
      inviteRiderIds: Array.isArray(inviteRiderIds) ? inviteRiderIds : undefined
    })

    return res.status(201).json(result)
  } catch (error: any) {
    const message = error.message || 'Failed to create ride from request'
    const status = message.includes('Invalid') || message.includes('required') ? 400 : 500
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

router.post('/:requestId/cancel', requireAuth, async (req, res) => {
  try {
    const requestId = Number(req.params.requestId)
    if (!requestId) {
      return res.status(400).json({ message: 'requestId must be a number' })
    }
    const result = await rideRequestService.cancelMyRequest(requestId, req.user!.id)
    return res.json(result)
  } catch (error: any) {
    const message = error.message || 'Failed to cancel ride request'
    const status = message.includes('Unauthorized') ? 403 : message.includes('not found') ? 404 : 400
    return res.status(status).json({ message })
  }
})

export default router
