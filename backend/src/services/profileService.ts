import { PostgrestError } from '@supabase/supabase-js'
import { supabaseAdmin } from '../lib/supabaseClient'

const TABLE_NAME = 'profiles'

export interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  bio: string | null
  avatar_url: string | null
  is_complete: boolean
  role?: string | null
  created_at?: string
  updated_at?: string
}

export interface ProfilePayload {
  first_name: string
  last_name: string
  email: string
  phone?: string
  bio?: string
  avatar_url?: string
}

export interface ProfileUpdatePayload {
  first_name?: string
  last_name?: string
  phone?: string
  bio?: string
  avatar_url?: string
}

const handleError = (error: PostgrestError | null, fallbackMessage: string) => {
  if (!error) return
  const err = new Error(error.message || fallbackMessage)
  err.name = error.code || err.name
  throw err
}

export const profileService = {
  async getById(id: string): Promise<Profile | null> {
    const { data, error } = await supabaseAdmin
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .maybeSingle()

    handleError(error, 'Unable to fetch profile')
    return data
  },

  async createOrReplace(id: string, payload: ProfilePayload): Promise<Profile> {
    const { data, error } = await supabaseAdmin
      .from(TABLE_NAME)
      .upsert(
        {
          id,
          ...payload,
          is_complete: true,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      )
      .select()
      .single()

    handleError(error, 'Unable to save profile')
    if (!data) {
      throw new Error('Missing profile data from Supabase')
    }

    return data
  },

  async update(id: string, payload: ProfileUpdatePayload): Promise<Profile> {
    const { data, error } = await supabaseAdmin
      .from(TABLE_NAME)
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
        is_complete: true
      })
      .eq('id', id)
      .select()
      .single()

    handleError(error, 'Unable to update profile')
    if (!data) {
      throw new Error('Profile not found')
    }

    return data
  }
}
