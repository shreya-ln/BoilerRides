import { supabase } from './supabase'

const DEFAULT_BACKEND_URL = 'http://localhost:4000'
const baseUrl = import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL

const getAccessToken = async () => {
  const {
    data: { session }
  } = await supabase.auth.getSession()

  const token = session?.access_token
  if (!token) {
    throw new Error('You must be signed in to call this endpoint.')
  }
  return token
}

const handleResponse = async (response: Response) => {
  const contentType = response.headers.get('content-type')
  const isJson = contentType?.includes('application/json')
  const payload = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : payload?.message || 'Request failed'
    throw new Error(message)
  }

  return payload
}

const authorizedFetch = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const token = await getAccessToken()
  const headers = new Headers(options.headers || {})

  headers.set('Authorization', `Bearer ${token}`)
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers
  })

  return handleResponse(response)
}

export const apiClient = {
  get: <T>(path: string) => authorizedFetch<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    authorizedFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    authorizedFetch<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined })
}
