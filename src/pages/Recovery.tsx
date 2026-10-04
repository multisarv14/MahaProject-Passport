import { Link } from 'react-router-dom'
import { useStore } from '../store/store'
import { PROPERTY_BY_ID, WARDS, WARD_NAMES } from '../data/mock'
import { caseStats, wardOf } from '../lib/stats'
import { inr, inrShort, dmy, pct } from '../lib/format'
import { BarRow, Button, Card, Kpi, PageHeader, StatusBadge, Table } from '../components/ui'

export default function Recovery() {
  const st = useStore()
  const { t, lang, cases, persona } = st
  const s = caseStats(cases)
  const due = cases.filter(c => c.status === 'notice_sent').sort((a, b) => (b.approvedDemand ?? 0) - (a.approvedDemand ?? 0))
  const canRecord = persona?.role === 'recovery_clerk' || persona?.role === 'platform_admin' || persona?.role === 'assessment_officer'
  const wardRows = WARDS.map(w => ({ w, ...caseStats(cases.filter(c => wardOf(c) === w)) }))
  const maxDemand = Math.max(...wardRows.map(r => r.demand))

  return (
    <>
      <PageHeader title={t('वसुली', 'Recovery')} sub={t('मंजूर मागणीपैकी किती रक्कम आली आणि किती थकली आहे.', 'How much of the approved demand has been collected and how much is outstanding.')} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={t('मंजूर मागणी', 'Approved demand')} value={inrShort(s.demand, lang)} tone="file" />
        <Kpi label={t('वसूल', 'Collected')} value={inrShort(s.recovered, lang)} tone="ok" />
        <Kpi label={t('थकबाकी', 'Outstanding')} value={inrShort(s.demand - s.recovered, lang)} tone="warn" />
        <Kpi label={t('वसुली टक्केवारी', 'Collection rate')} value={`${pct(s.recovered, s.demand)}%`} tone="info" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card title={t('भरणा बाकी असलेल्या नोटिसा', 'Notices awaiting payment')}>
          <Table head={[t('प्रकरण', 'Case'), t('मालक', 'Owner'), t('नोटीस', 'Notice'), t('मागणी', 'Demand'), t('स्थिती', 'Status'), '']} empty={!due.length}>
            {due.map(c => {
              const p = PROPERTY_BY_ID[c.propertyId]
              return (
                <tr key={c.id}>
                  <td><Link className="font-mono text-xs text-info underline" to={`/cases/${c.id}`}>{c.id}</Link></td>
                  <td>{p.owner}<div className="text-xs text-muted">{p.address}</div></td>
                  <td className="font-mono text-xs">{c.noticeNo}<div className="text-muted">{dmy(c.noticeDate)}</div></td>
                  <td className="tnum font-semibold">{inr(c.approvedDemand ?? 0)}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td>{canRecord && <Button size="sm" onClick={() => st.recordPayment(c.id)}>{t('भरणा नोंदवा', 'Record payment')}</Button>}</td>
                </tr>
              )
            })}
          </Table>
        </Card>
        <Card title={t('प्रभागनिहाय मागणी व वसुली', 'Demand and collection by ward')}>
          <div className="flex flex-col gap-3">
            {wardRows.map(r => (
              <div key={r.w}>
                <div className="mb-1 text-sm font-semibold">{r.w} · {WARD_NAMES[r.w]}</div>
                <BarRow label={t('मागणी', 'Demand')} value={r.demand} max={maxDemand} display={inrShort(r.demand, lang)} tone="file" />
                <BarRow label={t('वसूल', 'Collected')} value={r.recovered} max={maxDemand} display={inrShort(r.recovered, lang)} tone="ok" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}
