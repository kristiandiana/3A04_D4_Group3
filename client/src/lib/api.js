import { getAuthToken } from './auth.js'

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:5000').replace(/\/$/, '')

export function buildApiUrl(path, query = {}) {
  const url = new URL(path, `${API_BASE_URL}/`)

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value)
    }
  })

  return url.toString()
}

export async function fetchJson(path, options = {}, query = {}) {
  const headers = { ...(options.headers ?? {}) }

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const authToken = getAuthToken()
  if (authToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${authToken}`
  }

  const response = await fetch(buildApiUrl(path, query), {
    ...options,
    headers,
  })

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await response.json() : null

  if (!response.ok) {
    throw new Error(payload?.error ?? `Request failed with status ${response.status}`)
  }

  return payload
}

export { API_BASE_URL }
