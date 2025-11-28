import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth'
import { rideInviteService } from '../services/rideInviteService'

const router = Router()

// Rider: list my invites
router.get('/me', requireAuth, async (req, res) => {
  try {
    const invites = await rideInviteService.listForRider(req.user!.id)
    return res.json(invites)
  } catch (error: any) {
    const message = error.message || 'Failed to fetch invites'
    return res.status(500).json({ message })
  }
})

// Driver: list invites for a ride
router.get('/ride/:rideId', requireAuth, async (req, res) => {
  try {
    const rideId = Number(req.params.rideId)
    if (!rideId) return res.status(400).json({ message: 'rideId must be a number' })
    const invites = await rideInviteService.listForRide(req.user!.id, rideId)
    return res.json(invites)
  } catch (error: any) {
    const message = error.message || 'Failed to fetch ride invites'
    const status = message.includes('Unauthorized') ? 403 : message.includes('not found') ? 404 : 400
    return res.status(status).json({ message })
  }
})

// Driver: list invites across my rides
router.get('/driver/me', requireAuth, async (req, res) => {
  try {
    const invites = await rideInviteService.listForDriver(req.user!.id)
    return res.json(invites)
  } catch (error: any) {
    const message = error.message || 'Failed to fetch invites'
    const status = message.includes('Unauthorized') ? 403 : 500
    return res.status(status).json({ message })
  }
})

// Rider: accept invite
router.post('/:inviteId/accept', requireAuth, async (req, res) => {
  try {
    const inviteId = Number(req.params.inviteId)
    if (!inviteId) return res.status(400).json({ message: 'inviteId must be a number' })
    const result = await rideInviteService.acceptInvite(inviteId, req.user!.id)
    return res.json(result)
  } catch (error: any) {
    const message = error.message || 'Failed to accept invite'
    const status = message.includes('Unauthorized') ? 403 : message.includes('not found') ? 404 : 400
    return res.status(status).json({ message })
  }
})

// Rider: decline invite
router.post('/:inviteId/decline', requireAuth, async (req, res) => {
  try {
    const inviteId = Number(req.params.inviteId)
    if (!inviteId) return res.status(400).json({ message: 'inviteId must be a number' })
    const result = await rideInviteService.declineInvite(inviteId, req.user!.id)
    return res.json(result)
  } catch (error: any) {
    const message = error.message || 'Failed to decline invite'
    const status = message.includes('Unauthorized') ? 403 : message.includes('not found') ? 404 : 400
    return res.status(status).json({ message })
  }
})

export default router
