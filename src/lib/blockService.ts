import { apiClient } from './apiClient'

export const blockService = {
  /**
   * Blocks a user (creates mutual block)
   */
  async blockUser(blockedId: string): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>(`/api/blocks/${blockedId}`)
  },

  /**
   * Unblocks a user (removes mutual block)
   */
  async unblockUser(blockedId: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/api/blocks/${blockedId}`)
  },

  /**
   * Checks if two users are blocked
   */
  async areBlocked(userId1: string, userId2: string): Promise<boolean> {
    const result = await apiClient.get<{ areBlocked: boolean }>(`/api/blocks/check/${userId1}/${userId2}`)
    return result.areBlocked
  },

  /**
   * Gets all blocked users for current user
   */
  async getBlockedUsers(): Promise<string[]> {
    const result = await apiClient.get<{ blockedIds: string[] }>('/api/blocks/me')
    return result.blockedIds
  }
}

