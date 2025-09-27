import { supabase } from './supabase'
import { PostgrestError } from '@supabase/supabase-js'

export interface Profile {
  id: string
  created_at?: string
  updated_at?: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  bio: string | null
  avatar_url: string | null
  is_complete: boolean
}

export interface CreateProfileData {
  first_name: string
  last_name: string
  email: string
  phone?: string
  bio?: string
}

export interface UpdateProfileData {
  first_name?: string
  last_name?: string
  phone?: string
  bio?: string
}

// Profile CRUD operations
export const profileService = {
  // Get current user's profile
  async getProfile(userId: string): Promise<{ data: Profile | null; error: PostgrestError | null }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Create a new profile
  async createProfile(userId: string, profileData: CreateProfileData): Promise<{ data: Profile | null; error: PostgrestError | null }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert([
          {
            id: userId,
            first_name: profileData.first_name,
            last_name: profileData.last_name,
            email: profileData.email,
            phone: profileData.phone || null,
            bio: profileData.bio || null,
            is_complete: true
          }
        ])
        .select()
        .single()

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Update existing profile
  async updateProfile(userId: string, updates: UpdateProfileData): Promise<{ data: Profile | null; error: PostgrestError | null }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
          is_complete: true
        })
        .eq('id', userId)
        .select()
        .single()

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Helper function to clean up old avatar files
  async cleanupOldAvatars(userId: string): Promise<void> {
    try {
      // List all files in the user's avatar folder
      const { data: files, error: listError } = await supabase.storage
        .from('avatars')
        .list(userId)

      if (listError || !files) return

      // Keep only the most recent avatar file, delete the rest
      if (files.length > 1) {
        // Sort by created_at (newest first)
        const sortedFiles = files.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        
        // Delete all but the newest file
        const filesToDelete = sortedFiles.slice(1).map(file => `${userId}/${file.name}`)
        
        if (filesToDelete.length > 0) {
          await supabase.storage
            .from('avatars')
            .remove(filesToDelete)
        }
      }
    } catch (error) {
      // Silently fail - cleanup is not critical
      console.warn('Failed to cleanup old avatars:', error)
    }
  },

  // Upload profile picture
  async uploadAvatar(userId: string, file: File): Promise<{ data: { path: string; publicUrl: string } | null; error: Error | null }> {
    try {
      const fileExt = file.name.split('.').pop()
      // Add timestamp to filename to prevent caching issues
      const timestamp = Date.now()
      const fileName = `${userId}/avatar-${timestamp}.${fileExt}`

      // Upload file to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        return { data: null, error: uploadError }
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Cleanup old avatar files (don't wait for this)
      this.cleanupOldAvatars(userId)

      return {
        data: {
          path: uploadData.path,
          publicUrl: urlData.publicUrl
        },
        error: null
      }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Update profile avatar URL
  async updateAvatar(userId: string, avatarUrl: string): Promise<{ data: Profile | null; error: PostgrestError | null }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Delete avatar
  async deleteAvatar(userId: string): Promise<{ error: Error | null }> {
    try {
      const fileName = `${userId}/avatar`
      
      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([fileName])

      if (deleteError) {
        return { error: deleteError }
      }

      // Update profile to remove avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      return { error: updateError }
    } catch (error) {
      return { error }
    }
  },

  // Validate Purdue email
  validatePurdueEmail(email: string): boolean {
    const purdueEmailRegex = /^[^\s@]+@purdue\.edu$/
    return purdueEmailRegex.test(email)
  },

  // Validate profile data
  validateProfileData(data: CreateProfileData | UpdateProfileData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check required fields for create
    if ('first_name' in data) {
      if (!data.first_name?.trim()) {
        errors.push('First name is required')
      }
    }

    if ('last_name' in data) {
      if (!data.last_name?.trim()) {
        errors.push('Last name is required')
      }
    }

    if ('email' in data) {
      if (!data.email?.trim()) {
        errors.push('Email is required')
      } else if (!this.validatePurdueEmail(data.email)) {
        errors.push('Please use a valid Purdue email address (@purdue.edu)')
      }
    }

    // Validate phone format if provided
    if (data.phone && data.phone.trim()) {
      const phoneRegex = /^\+?[\d\s\-()]+$/
      if (!phoneRegex.test(data.phone)) {
        errors.push('Please enter a valid phone number')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}