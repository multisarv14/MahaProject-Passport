import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useStore } from '../store/store'
import { PROPERTIES, WARDS, WARD_NAMES } from '../data/mock'
import { USAGE } from '../lib/labels'
import { Badge, Button, Card, PageHeader, StatusBadge, Table, inputCls } from '../components/ui'

export default function Registry() {
  const { t, lang, cases } = useStore()
  const [q, setQ] = useState('')
  const [ward, setWard] = useState(0)
  const [onlyCases, setOnlyCases] = useState(false)
  const [limit, setLimit] = useState(40)
  const caseByProp = useMemo(() => Object.fromEntries(cases.map(c => [c.propertyId, c])), [cases])

  const rows = PROPERTIES.filter(p =>
    (!ward || p.ward === ward) &&
    (!onlyCases || caseByProp[p.id]) &&
    (!q || [p.id, p.address, p.owner, p.tax?.taxNo, p.elec?.consumerNo].some(v => v?.toLowerCase().includes(q.toLowerCase()))))

  const chip = (has: boolean, label: string) => <Badge tone={has ? 'ok' : 'neutral'}>{label}</Badge>

  return (
    <>
      <PageHeader title={t('Passport शोध', 'Passport Registry')} sub={t('Passport ID, पत्ता, मालक, कर क्रमांक किंवा वीज ग्राहक क्रमांकाने शोधा', 'Search by Passport ID, address, owner, tax number or electricity consumer number')} />
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
        <p className="mb-2 text-sm text-muted">{rows.length} {t('मालमत्ता', 'properties')}</p>
        <Table head={['Passport ID', t('पत्ता', 'Address'), t('मालक', 'Owner'), t('वापर', 'Usage'), t('जोडलेल्या नोंदी', 'Linked records'), t('प्रकरण', 'Case')]} empty={!rows.length}>
          {rows.slice(0, limit).map(p => {
            const c = caseByProp[p.id]
            return (
              <tr key={p.id}>
                <td><Link to={`/property/${p.id}`} className="font-mono text-xs text-info underline">{p.id}</Link></td>
                <td className="max-w-xs">{p.address}</td>
                <td>{p.owner}</td>
                <td>{USAGE[p.usage][lang]}</td>
                <td><div className="flex flex-wrap gap-1">{chip(!!p.tax, t('कर', 'Tax'))}{chip(!!p.oc, 'OC')}{chip(!!p.elec, t('वीज', 'Power'))}{chip(!!p.igr, 'IGR')}{chip(!!p.water, t('पाणी', 'Water'))}</div></td>
                <td>{c ? <Link to={`/cases/${c.id}`}><StatusBadge status={c.status} /></Link> : <span className="text-muted">—</span>}</td>
              </tr>
            )
          })}
        </Table>
        {rows.length > limit && <div className="mt-3 text-center"><Button variant="secondary" onClick={() => setLimit(l => l + 40)}>{t('अधिक दाखवा', 'Show more')}</Button></div>}
      </Card>
    </>
  )
}
