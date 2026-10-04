import { useState } from 'react'
import { Download } from 'lucide-react'
import { useStore } from '../store/store'
import { WARDS, WARD_NAMES } from '../data/mock'
import { caseStats, wardOf } from '../lib/stats'
import { inr, num } from '../lib/format'
import { Button, Card, Notice, PageHeader, Table, cx } from '../components/ui'

const REPORTS = [
  { id: 'ward', mr: 'प्रभागनिहाय सारांश', en: 'Ward-wise summary' },
  { id: 'rule', mr: 'नियमनिहाय प्रकरणे', en: 'Cases by rule' },
  { id: 'inspector', mr: 'निरीक्षकनिहाय पाहणी', en: 'Visits by inspector' },
  { id: 'recovery', mr: 'मागणी व वसुली', en: 'Demand and collection' },
  { id: 'objection', mr: 'हरकती व निर्णय', en: 'Objections and decisions' },
  { id: 'quality', mr: 'विभागांच्या data ची गुणवत्ता', en: 'Department data quality' },
  { id: 'pilot', mr: 'Pilot अहवाल (मासिक)', en: 'Pilot report (monthly)' },
]

export default function Reports() {
  const { t, lang, cases } = useStore()
  const [sel, setSel] = useState('ward')
  const [msg, setMsg] = useState('')
  return (
    <>
      <PageHeader title={t('अहवाल', 'Reports')} sub={t('PDF / Excel / CSV मध्ये export (Demo मध्ये export फक्त दाखवण्यासाठी).', 'Export to PDF / Excel / CSV (export is illustrative in the demo).')} />
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card>
          <ul className="flex flex-col gap-1">
            {REPORTS.map(r => (
              <li key={r.id}><button onClick={() => { setSel(r.id); setMsg('') }} className={cx('w-full rounded px-3 py-2 text-left text-sm', sel === r.id ? 'bg-ink text-white' : 'hover:bg-paper')}>{lang === 'mr' ? r.mr : r.en}</button></li>
            ))}
          </ul>
        </Card>
        <Card title={REPORTS.find(r => r.id === sel)![lang]} action={
          <div className="flex gap-2">{['PDF', 'Excel', 'CSV'].map(f => <Button key={f} size="sm" variant="secondary" onClick={() => setMsg(t(`${f} file तयार झाली (Demo).`, `${f} file prepared (demo).`))}><Download size={14} />{f}</Button>)}</div>
        }>
          {msg && <div className="mb-3"><Notice tone="ok">{msg}</Notice></div>}
          <Table head={[t('प्रभाग', 'Ward'), t('प्रकरणे', 'Cases'), t('पाहणी', 'Visited'), t('खात्री', 'Confirmed'), t('अचूकता', 'Accuracy'), t('मागणी', 'Demand'), t('वसुली', 'Collected')]}>
            {WARDS.map(w => {
              const s = caseStats(cases.filter(c => wardOf(c) === w))
              return <tr key={w}><td>{w} · {WARD_NAMES[w]}</td><td className="tnum">{num(s.total)}</td><td className="tnum">{s.visited}</td><td className="tnum">{s.confirmed}</td><td className="tnum">{s.accuracy}%</td><td className="tnum">{inr(s.demand)}</td><td className="tnum">{inr(s.recovered)}</td></tr>
            })}
          </Table>
          {sel !== 'ward' && <p className="mt-3 text-xs text-muted">{t('Demo मध्ये सर्व अहवालांसाठी प्रभागनिहाय नमुना दाखवला आहे.', 'The demo shows the ward-wise sample for every report.')}</p>}
        </Card>
      </div>
    </>
  )
}
