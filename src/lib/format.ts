import type { Lang } from '../data/types'

export const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')

export function inrShort(n: number, lang: Lang) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} ${lang === 'mr' ? 'कोटी' : 'Cr'}`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} ${lang === 'mr' ? 'लाख' : 'L'}`
  return inr(n)
}

export const num = (n: number) => n.toLocaleString('en-IN')

export const dmy = (iso?: string | null) => {
  if (!iso) return '—'
  if (iso.includes('T')) {
    // Timestamp from the API: show in the viewer's local time.
    const d = new Date(iso)
    const p = (n: number) => String(n).padStart(2, '0')
    return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
  }
  const [d, t] = iso.split(' ')
  const [y, m, day] = d.split('-')
  return `${day}-${m}-${y}${t ? ' ' + t : ''}`
}

export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)
