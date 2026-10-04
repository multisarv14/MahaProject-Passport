import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useStore } from '../store/store'
import { WARDS, WARD_NAMES } from '../data/mock'
import { USAGE } from '../lib/labels'
import { useApi } from '../api/useApi'
import type { CaseStatus, Usage } from '../data/types'
import { Badge, Button, Card, LoadError, PageHeader, StatusBadge, Table, inputCls } from '../components/ui'

interface Row { id: string; ward: number; address: string; owner_name: string; usage: Usage; sources: string[]; case: { id: string; status: CaseStatus } | null }

const PAGE = 40

export default function Registry() {
  const { t, lang } = useStore()
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  const [ward, setWard] = useState(0)
  const [onlyCases, setOnlyCases] = useState(false)
  const [limit, setLimit] = useState(PAGE)
  useEffect(() => { const h = setTimeout(() => setDebounced(q), 300); return () => clearTimeout(h) }, [q])
  useEffect(() => setLimit(PAGE), [debounced, ward, onlyCases])

  const params = new URLSearchParams({ limit: String(limit) })
  if (debounced) params.set('q', debounced)
  if (ward) params.set('ward', String(ward))
  if (onlyCases) params.set('flagged', 'true')
  const { data, error, loading, reload } = useApi<Row[]>(`/properties?${params}`)
  const chip = (has: boolean, label: string) => <Badge tone={has ? 'ok' : 'neutral'}>{label}</Badge>

  return (
    <>
      <PageHeader title={t('Passport शोध', 'Passport Registry')} sub={t('Passport ID, पत्ता किंवा मालकाच्या नावाने शोधा', 'Search by Passport ID, address or owner name')} />
      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input id="reg-q" className={inputCls + ' w-full pl-9'} placeholder={t('उदा. MP-MH-NMN-2026-000123 किंवा पाटील', 'e.g. MP-MH-NMN-2026-000123 or Patil')} value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <select id="reg-ward" className={inputCls} value={ward} onChange={e => setWard(+e.target.value)}>
            <option value={0}>{t('सर्व प्रभाग', 'All wards')}</option>
            {WARDS.map(w => <option key={w} value={w}>{t('प्रभाग', 'Ward')} {w} · {WARD_NAMES[w]}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm"><input id="reg-only" type="checkbox" checked={onlyCases} onChange={e => setOnlyCases(e.target.checked)} />{t('फक्त संशयित', 'Suspected only')}</label>
        </div>
        {error && <LoadError message={error} onRetry={reload} />}
        {data && (
          <>
            <Table head={['Passport ID', t('पत्ता', 'Address'), t('मालक', 'Owner'), t('वापर', 'Usage'), t('जोडलेल्या नोंदी', 'Linked records'), t('प्रकरण', 'Case')]} empty={!data.length}>
              {data.map(p => (
                <tr key={p.id}>
                  <td><Link to={`/property/${p.id}`} className="font-mono text-xs text-info underline">{p.id}</Link></td>
                  <td className="max-w-xs">{p.address}</td>
                  <td>{p.owner_name}</td>
                  <td>{USAGE[p.usage][lang]}</td>
                  <td><div className="flex flex-wrap gap-1">{chip(p.sources.includes('tax'), t('कर', 'Tax'))}{chip(p.sources.includes('oc'), 'OC')}{chip(p.sources.includes('elec'), t('वीज', 'Power'))}{chip(p.sources.includes('igr'), 'IGR')}{chip(p.sources.includes('water'), t('पाणी', 'Water'))}</div></td>
                  <td>{p.case ? <Link to={`/cases/${p.case.id}`}><StatusBadge status={p.case.status} /></Link> : <span className="text-muted">—</span>}</td>
                </tr>
              ))}
            </Table>
            {data.length >= limit && <div className="mt-3 text-center"><Button variant="secondary" disabled={loading} onClick={() => setLimit(l => l + PAGE)}>{t('अधिक दाखवा', 'Show more')}</Button></div>}
          </>
        )}
      </Card>
    </>
  )
}
