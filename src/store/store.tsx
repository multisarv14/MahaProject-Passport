import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Lang } from '../data/types'
import { api, setUnauthorizedHandler, tokenStore } from '../api/client'
import type { SessionUser } from '../api/types'

const PREFS = 'maha-passport-prefs-v2'

interface Local { lang: Lang }
const initialLocal = (): Local => ({ lang: 'mr' })
const loadLocal = (): Local => {
  try { const r = localStorage.getItem(PREFS); if (r) return { ...initialLocal(), ...JSON.parse(r) } } catch { /* ignore */ }
  return initialLocal()
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
    t: (mr: string, en: string) => (local.lang === 'mr' ? mr : en),
    setLang: (lang: Lang) => setLocal(s => ({ ...s, lang })),
    signIn,
    demoLogin: async (userId: string) => signIn(await api<{ token: string; user: SessionUser }>('/auth/demo-login', { method: 'POST', body: { userId } })),
    logout: () => { tokenStore.set(null); setUser(null) },
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
