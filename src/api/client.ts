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

const UNREACHABLE = 'सर्व्हरशी संपर्क झाला नाही. थोड्या वेळाने पुन्हा प्रयत्न करा. / Could not reach the server. Please try again shortly.'

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const token = tokenStore.get()
  let res: Response
  try {
    res = await fetch('/api' + path, {
      method: init?.method ?? 'GET',
      headers: {
        ...(init?.body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'UNREACHABLE', UNREACHABLE)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized()
    // A gateway error without a JSON body means the API itself is down.
    const message = data.message ?? (res.status >= 502 ? UNREACHABLE : `Request failed (${res.status})`)
    throw new ApiError(res.status, data.error ?? 'ERROR', message)
  }
  if (init?.method && init.method !== 'GET') notifyDataChanged()
  return data as T
}

/** Fired after any successful change, so counters elsewhere on screen (e.g. "My work") refresh. */
export const DATA_CHANGED = 'maha-passport:data-changed'
const notifyDataChanged = () => window.dispatchEvent(new Event(DATA_CHANGED))

/** Multipart upload (file + fields). JSON helpers above cannot send files. */
export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const token = tokenStore.get()
  let res: Response
  try {
    res = await fetch('/api' + path, { method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body: form })
  } catch {
    throw new ApiError(0, 'UNREACHABLE', UNREACHABLE)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'ERROR', data.message ?? (res.status >= 502 ? UNREACHABLE : `Upload failed (${res.status})`))
  notifyDataChanged()
  return data as T
}
