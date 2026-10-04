import { useCallback, useEffect, useState } from 'react'
import { api } from './client'

/** Loads `path` (skipped when null) and exposes reload() for after a mutation. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(!!path)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!path) { setLoading(false); return }
    let live = true
    setLoading(true)
    api<T>(path)
      .then(d => { if (live) { setData(d); setError(null) } })
      .catch(e => { if (live) setError(e.message) })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [path, tick])

  const reload = useCallback(() => setTick(t => t + 1), [])
  return { data, error, loading, reload }
}
