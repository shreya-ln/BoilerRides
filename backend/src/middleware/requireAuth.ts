import { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from '../lib/supabaseClient'

const extractToken = (authorizationHeader?: string) => {
  if (!authorizationHeader) return null
  const [scheme, token] = authorizationHeader.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null
  }
  return token
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req.headers.authorization)

    if (!token) {
      return res.status(401).json({ message: 'Authorization header missing or malformed' })
    }

    const {
      data: { user },
      error
    } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ message: 'Invalid or expired token' })
    }

    req.user = user
    req.accessToken = token

    return next()
  } catch (error) {
    return res.status(500).json({ message: 'Failed to verify access token' })
  }
}
