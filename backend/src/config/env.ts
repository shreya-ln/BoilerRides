import fs from 'fs'
import path from 'path'
import { config } from 'dotenv'

const candidatePaths = [
  process.env.BACKEND_ENV_PATH,
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env')
].filter(Boolean) as string[]

let loaded = false
for (const envPath of candidatePaths) {
  if (fs.existsSync(envPath)) {
    config({ path: envPath })
    loaded = true
    break
  }
}

if (!loaded) {
  config()
}

const getEnv = (key: string, fallback?: string) => {
  const value = process.env[key] ?? fallback
  if (value === undefined || value === null || value === '') {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.BACKEND_PORT || process.env.PORT || '4000', 10),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  supabaseUrl: getEnv('SUPABASE_URL', process.env.VITE_SUPABASE_URL),
  supabaseServiceKey: getEnv('SUPABASE_SERVICE_ROLE_KEY')
}
