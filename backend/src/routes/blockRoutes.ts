import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth'
import { blockService } from '../services/blockService'

const router = Router()

/**
 * POST /api/blocks/:blockedId
 * Blocks a user (creates mutual block)
 */
router.post('/:blockedId', requireAuth, async (req, res) => {
  try {
    const blockedId = req.params.blockedId

    if (!blockedId) {
      return res.status(400).json({ message: 'Invalid user id' })
    }

    const result = await blockService.blockUser({
      blockerId: req.user!.id,
      blockedId
    })

    return res.json(result)
  } catch (error: any) {
    const message = error.message || 'Failed to block user'
    const status = message.includes('Invalid') || message.includes('already') || message.includes('yourself')
      ? 400
      : 500
    return res.status(status).json({ message })
  }
})

/**
 * DELETE /api/blocks/:blockedId
 * Unblocks a user (removes mutual block)
 */
router.delete('/:blockedId', requireAuth, async (req, res) => {
  try {
    const blockedId = req.params.blockedId

    if (!blockedId) {
      return res.status(400).json({ message: 'Invalid user id' })
    }

    const result = await blockService.unblockUser({
      blockerId: req.user!.id,
      blockedId
    })

    return res.json(result)
  } catch (error: any) {
    const message = error.message || 'Failed to unblock user'
    const status = message.includes('Invalid') || message.includes('not found')
      ? 400
      : 500
    return res.status(status).json({ message })
  }
})

/**
 * GET /api/blocks/check/:userId1/:userId2
 * Checks if two users are blocked
 */
router.get('/check/:userId1/:userId2', requireAuth, async (req, res) => {
  try {
    const { userId1, userId2 } = req.params

    if (!userId1 || !userId2) {
      return res.status(400).json({ message: 'Invalid user ids' })
    }

    const areBlocked = await blockService.areBlocked(userId1, userId2)

    return res.json({ areBlocked })
  } catch (error: any) {
    const message = error.message || 'Failed to check block status'
    return res.status(500).json({ message })
  }
})

/**
 * GET /api/blocks/me
 * Gets all blocked users for current user
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const blockedIds = await blockService.getBlockedUsers(req.user!.id)

    return res.json({ blockedIds })
  } catch (error: any) {
    const message = error.message || 'Failed to get blocked users'
    return res.status(500).json({ message })
  }
})

export default router

