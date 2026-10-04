import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Lang } from '../data/types'
import { api, setUnauthorizedHandler, tokenStore } from '../api/client'
import type { SessionUser } from '../api/types'

// Upload and matching history stay in the browser until real ingestion (phase 2) lands.
export interface Upload { at: string; source: string; file: string; records: number; by: string }
export interface MatchRun { at: string; by: string; found: number; newCases: number }

const PREFS = 'maha-passport-prefs-v2'

interface Local { lang: Lang; uploads: Upload[]; runs: MatchRun[] }
const initialLocal = (): Local => ({
  lang: 'mr',
  uploads: [
    { at: '2026-09-28 11:20', source: 'tax', file: 'property_tax_register_sep2026.xlsx', records: 0, by: 'u_admin' },
    { at: '2026-09-30 16:05', source: 'elec', file: 'msedcl_consumers_nmn.csv', records: 0, by: 'u_do' },
  ],
  runs: [{ at: '2026-10-01 06:00', by: 'system', found: 164, newCases: 37 }],
})
const loadLocal = (): Local => {
  try { const r = localStorage.getItem(PREFS); if (r) return { ...initialLocal(), ...JSON.parse(r) } } catch { /* ignore */ }
  return initialLocal()
}
const now = () => {
  const d = new Date()
  return `${d.toISOString().slice(0, 10)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function useStoreValue() {
  const [local, setLocal] = useState<Local>(loadLocal)
  const [user, setUser] = useState<SessionUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => { try { localStorage.setItem(PREFS, JSON.stringify(local)) } catch { /* ignore */ } }, [local])

  // Restore the session from a saved token.
  useEffect(() => {
    setUnauthorizedHandler(() => { tokenStore.set(null); setUser(null) })
    if (!tokenStore.get()) { setReady(true); return }
    api<SessionUser>('/me').then(setUser).catch(() => tokenStore.set(null)).finally(() => setReady(true))
  }, [])

  const signIn = (r: { token: string; user: SessionUser }) => { tokenStore.set(r.token); setUser(r.user) }

  return {
    ready,
    persona: user,
    lang: local.lang,
    uploads: local.uploads,
    runs: local.runs,
    t: (mr: string, en: string) => (local.lang === 'mr' ? mr : en),
    setLang: (lang: Lang) => setLocal(s => ({ ...s, lang })),
    signIn,
    demoLogin: async (userId: string) => signIn(await api<{ token: string; user: SessionUser }>('/auth/demo-login', { method: 'POST', body: { userId } })),
    logout: () => { tokenStore.set(null); setUser(null) },
    addUpload: (u: Omit<Upload, 'at' | 'by'>) => setLocal(s => ({ ...s, uploads: [{ ...u, at: now(), by: user?.id ?? 'system' }, ...s.uploads] })),
    addRun: (found: number) => setLocal(s => ({ ...s, runs: [{ at: now(), by: user?.id ?? 'system', found, newCases: 0 }, ...s.runs] })),
  }
}

type Store = ReturnType<typeof useStoreValue>
const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const v = useStoreValue()
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('StoreProvider missing')
  return v
}
