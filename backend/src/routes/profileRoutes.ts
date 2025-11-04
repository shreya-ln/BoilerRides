import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth'
import { profileService, ProfilePayload, ProfileUpdatePayload } from '../services/profileService'

const router = Router()

const validateProfilePayload = (payload: ProfilePayload) => {
  if (!payload.first_name || !payload.last_name || !payload.email) {
    throw new Error('first_name, last_name, and email are required')
  }
}

router.get('/me', requireAuth, async (req, res) => {
  try {
    const profile = await profileService.getById(req.user!.id)
    return res.json(profile)
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to fetch profile' })
  }
})

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const profile = await profileService.getById(req.params.id)
    return res.json(profile)
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to fetch profile' })
  }
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const payload: ProfilePayload = req.body
    validateProfilePayload(payload)
    const profile = await profileService.createOrReplace(req.user!.id, payload)
    return res.status(201).json(profile)
  } catch (error: any) {
    const status = error.message?.includes('required') ? 400 : 500
    return res.status(status).json({ message: error.message || 'Failed to save profile' })
  }
})

router.put('/me', requireAuth, async (req, res) => {
  try {
    const payload: ProfileUpdatePayload = req.body
    if (!payload || Object.keys(payload).length === 0) {
      return res.status(400).json({ message: 'No fields provided for update' })
    }
    const profile = await profileService.update(req.user!.id, payload)
    return res.json(profile)
  } catch (error: any) {
    const status = error.message === 'Profile not found' ? 404 : 500
    return res.status(status).json({ message: error.message || 'Failed to update profile' })
  }
})

export default router
