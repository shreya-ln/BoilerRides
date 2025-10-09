import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { profileService, Profile, CreateProfileData, UpdateProfileData } from '@/lib/profileService'

interface UseProfileReturn {
  profile: Profile | null
  loading: boolean
  error: string | null
  isComplete: boolean
  createProfile: (data: CreateProfileData) => Promise<boolean>
  updateProfile: (data: UpdateProfileData) => Promise<boolean>
  uploadAvatar: (file: File) => Promise<boolean>
  deleteAvatar: () => Promise<boolean>
  refreshProfile: () => Promise<void>
}

const PROFILE_QUERY_KEY = 'profile'

export const useProfile = (): UseProfileReturn => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const userId = user?.id ?? null
  const queryKey = [PROFILE_QUERY_KEY, userId] as const

  const profileQuery = useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId) return null

      const { data, error } = await profileService.getProfile(userId)
      if (error) {
        throw new Error(error.message ?? 'Failed to load profile')
      }

      return data
    },
    enabled: !!userId,
    staleTime: 0
  })

  const setSharedProfile = (nextProfile: Profile | null) => {
    if (!userId) return
    queryClient.setQueryData(queryKey, nextProfile)
  }

  const refetchProfile = async () => {
    if (!userId) return
    await queryClient.invalidateQueries({ queryKey, refetchType: 'active' })
  }

  const createProfile = async (data: CreateProfileData): Promise<boolean> => {
    if (!userId) {
      setActionError('User not authenticated')
      return false
    }

    const validation = profileService.validateProfileData(data)
    if (!validation.isValid) {
      setActionError(validation.errors[0])
      return false
    }

    setActionLoading(true)
    setActionError(null)

    try {
      const { data: newProfile, error } = await profileService.createProfile(userId, data)

      if (error) {
        throw new Error(error.message ?? 'Failed to create profile')
      }

      if (newProfile) {
        setSharedProfile(newProfile)
      } else {
        await refetchProfile()
      }

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create profile'
      setActionError(message)
      return false
    } finally {
      setActionLoading(false)
    }
  }

  const updateProfile = async (updates: UpdateProfileData): Promise<boolean> => {
    if (!userId) {
      setActionError('User not authenticated')
      return false
    }

    const validation = profileService.validateProfileData(updates)
    if (!validation.isValid) {
      setActionError(validation.errors[0])
      return false
    }

    setActionLoading(true)
    setActionError(null)

    try {
      const { data: updatedProfile, error } = await profileService.updateProfile(userId, updates)

      if (error) {
        throw new Error(error.message ?? 'Failed to update profile')
      }

      if (updatedProfile) {
        setSharedProfile(updatedProfile)
      } else {
        await refetchProfile()
      }

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile'
      setActionError(message)
      return false
    } finally {
      setActionLoading(false)
    }
  }

  const uploadAvatar = async (file: File): Promise<boolean> => {
    if (!userId) {
      setActionError('User not authenticated')
      return false
    }

    setActionLoading(true)
    setActionError(null)

    try {
      const { data: uploadData, error: uploadError } = await profileService.uploadAvatar(userId, file)

      if (uploadError) {
        throw new Error('Failed to upload image')
      }

      if (!uploadData) {
        throw new Error('Upload failed')
      }

      const { data: updatedProfile, error: updateError } = await profileService.updateAvatar(userId, uploadData.publicUrl)

      if (updateError) {
        throw new Error(updateError.message ?? 'Failed to update profile with new avatar')
      }

      if (updatedProfile) {
        setSharedProfile(updatedProfile)
      } else {
        await refetchProfile()
      }

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload avatar'
      setActionError(message)
      return false
    } finally {
      setActionLoading(false)
    }
  }

  const deleteAvatar = async (): Promise<boolean> => {
    if (!userId) {
      setActionError('User not authenticated')
      return false
    }

    setActionLoading(true)
    setActionError(null)

    try {
      const { error: deleteError } = await profileService.deleteAvatar(userId)

      if (deleteError) {
        throw new Error(deleteError.message ?? 'Failed to delete avatar')
      }

      await refetchProfile()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete avatar'
      setActionError(message)
      return false
    } finally {
      setActionLoading(false)
    }
  }

  const refreshProfile = async (): Promise<void> => {
    setActionError(null)
    await refetchProfile()
  }

  const profile = profileQuery.data ?? null
  const queryError = profileQuery.error instanceof Error ? profileQuery.error.message : null
  const error = actionError ?? queryError

  const loading =
    actionLoading ||
    (!!userId && profileQuery.isPending)

  return {
    profile,
    loading,
    error,
    isComplete: profile?.is_complete || false,
    createProfile,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
    refreshProfile
  }
}
