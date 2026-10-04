const TOKEN_KEY = 'maha-passport-token'

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message) }
}

export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } },
  set: (t: string | null) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ } },
}

let onUnauthorized: () => void = () => {}
export const setUnauthorizedHandler = (f: () => void) => { onUnauthorized = f }

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const token = tokenStore.get()
  const res = await fetch('/api' + path, {
    method: init?.method ?? 'GET',
    headers: {
      ...(init?.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized()
    throw new ApiError(res.status, data.error ?? 'ERROR', data.message ?? 'Request failed')
  }
  return data as T
}
