import { useState, useEffect, useCallback } from 'react'
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

export const useProfile = (): UseProfileReturn => {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load profile data
  const loadProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const { data, error: profileError } = await profileService.getProfile(user.id)
      
      if (profileError) {
        setError(profileError.message)
        setProfile(null)
      } else {
        setProfile(data)
      }
    } catch (err) {
      setError('Failed to load profile')
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  // Load profile on user change
  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  // Create new profile
  const createProfile = async (data: CreateProfileData): Promise<boolean> => {
    if (!user?.id) {
      setError('User not authenticated')
      return false
    }

    try {
      setLoading(true)
      setError(null)

      // Validate data
      const validation = profileService.validateProfileData(data)
      if (!validation.isValid) {
        setError(validation.errors[0])
        return false
      }

      const { data: newProfile, error: createError } = await profileService.createProfile(user.id, data)
      
      if (createError) {
        setError(createError.message)
        return false
      }

      setProfile(newProfile)
      return true
    } catch (err) {
      setError('Failed to create profile')
      return false
    } finally {
      setLoading(false)
    }
  }

  // Update existing profile
  const updateProfile = async (updates: UpdateProfileData): Promise<boolean> => {
    if (!user?.id) {
      setError('User not authenticated')
      return false
    }

    try {
      setLoading(true)
      setError(null)

      // Validate data
      const validation = profileService.validateProfileData(updates)
      if (!validation.isValid) {
        setError(validation.errors[0])
        return false
      }

      const { data: updatedProfile, error: updateError } = await profileService.updateProfile(user.id, updates)
      
      if (updateError) {
        setError(updateError.message)
        return false
      }

      setProfile(updatedProfile)
      return true
    } catch (err) {
      setError('Failed to update profile')
      return false
    } finally {
      setLoading(false)
    }
  }

  // Upload profile picture
  const uploadAvatar = async (file: File): Promise<boolean> => {
    if (!user?.id) {
      setError('User not authenticated')
      return false
    }

    try {
      setLoading(true)
      setError(null)

      // Upload file
      const { data: uploadData, error: uploadError } = await profileService.uploadAvatar(user.id, file)
      
      if (uploadError) {
        setError('Failed to upload image')
        return false
      }

      if (!uploadData) {
        setError('Upload failed')
        return false
      }

      // Update profile with new avatar URL
      const { data: updatedProfile, error: updateError } = await profileService.updateAvatar(user.id, uploadData.publicUrl)
      
      if (updateError) {
        setError('Failed to update profile with new avatar')
        return false
      }

      setProfile(updatedProfile)
      return true
    } catch (err) {
      setError('Failed to upload avatar')
      return false
    } finally {
      setLoading(false)
    }
  }

  // Delete profile picture
  const deleteAvatar = async (): Promise<boolean> => {
    if (!user?.id) {
      setError('User not authenticated')
      return false
    }

    try {
      setLoading(true)
      setError(null)

      const { error: deleteError } = await profileService.deleteAvatar(user.id)
      
      if (deleteError) {
        setError('Failed to delete avatar')
        return false
      }

      // Refresh profile to get updated data
      await loadProfile()
      return true
    } catch (err) {
      setError('Failed to delete avatar')
      return false
    } finally {
      setLoading(false)
    }
  }

  // Refresh profile data
  const refreshProfile = async (): Promise<void> => {
    await loadProfile()
  }

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