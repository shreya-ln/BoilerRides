import { supabaseAdmin } from '../lib/supabaseClient'

const TABLE_NAME = 'user_blocks'

const friendlyError = (fallback: string, error?: any) => {
  const message = error?.message || fallback
  const err = new Error(message)
  err.name = error?.code || err.name
  return err
}

/**
 * Service for managing user blocks
 */
export const blockService = {
  /**
   * Blocks a user (mutual blocking)
   */
  async blockUser(params: { blockerId: string; blockedId: string }) {
    const { blockerId, blockedId } = params

    if (blockerId === blockedId) {
      throw new Error('Cannot block yourself')
    }

    // Check if already blocked
    const { data: existing, error: checkError } = await supabaseAdmin
      .from(TABLE_NAME)
      .select('id')
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId)
      .maybeSingle()

    if (checkError) {
      throw friendlyError('Unable to check block status', checkError)
    }

    if (existing) {
      throw new Error('User is already blocked')
    }

    // Create mutual block (both directions)
    const { error: block1Error } = await supabaseAdmin
      .from(TABLE_NAME)
      .insert({
        blocker_id: blockerId,
        blocked_id: blockedId
      })

    if (block1Error) {
      throw friendlyError('Unable to block user', block1Error)
    }

    // Also create reverse block for mutual blocking
    const { error: block2Error } = await supabaseAdmin
      .from(TABLE_NAME)
      .insert({
        blocker_id: blockedId,
        blocked_id: blockerId
      })

    if (block2Error) {
      // If reverse block fails, remove the first block
      await supabaseAdmin
        .from(TABLE_NAME)
        .delete()
        .eq('blocker_id', blockerId)
        .eq('blocked_id', blockedId)
      throw friendlyError('Unable to create mutual block', block2Error)
    }

    return { success: true }
  },

  /**
   * Unblocks a user (removes mutual blocks)
   */
  async unblockUser(params: { blockerId: string; blockedId: string }) {
    const { blockerId, blockedId } = params

    // Remove both directions
    const { error: delete1Error } = await supabaseAdmin
      .from(TABLE_NAME)
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId)

    if (delete1Error) {
      throw friendlyError('Unable to unblock user', delete1Error)
    }

    const { error: delete2Error } = await supabaseAdmin
      .from(TABLE_NAME)
      .delete()
      .eq('blocker_id', blockedId)
      .eq('blocked_id', blockerId)

    if (delete2Error) {
      throw friendlyError('Unable to remove mutual block', delete2Error)
    }

    return { success: true }
  },

  /**
   * Checks if two users are blocked
   */
  async areBlocked(userId1: string, userId2: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from(TABLE_NAME)
      .select('id')
      .or(`and(blocker_id.eq.${userId1},blocked_id.eq.${userId2}),and(blocker_id.eq.${userId2},blocked_id.eq.${userId1})`)
      .limit(1)

    if (error) {
      console.error('Error checking block status:', error)
      return false
    }

    return (data?.length || 0) > 0
  },

  /**
   * Gets all blocked users for a user
   */
  async getBlockedUsers(userId: string): Promise<string[]> {
    const { data, error } = await supabaseAdmin
      .from(TABLE_NAME)
      .select('blocked_id')
      .eq('blocker_id', userId)

    if (error) {
      throw friendlyError('Unable to get blocked users', error)
    }

    return (data || []).map((row: any) => row.blocked_id)
  },

  /**
   * Filters out blocked users from a list of user IDs
   */
  async filterBlockedUsers(userId: string, userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return []

    const blockedIds = await this.getBlockedUsers(userId)
    const blockedSet = new Set(blockedIds)

    return userIds.filter(id => !blockedSet.has(id))
  }
}

