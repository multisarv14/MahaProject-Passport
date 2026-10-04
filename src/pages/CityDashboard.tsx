import { Link } from 'react-router-dom'
import { useStore } from '../store/store'
import { CITY, WARD_NAMES, inspectorForWard } from '../data/mock'
import { RULES } from '../lib/labels'
import { inrShort, num, dmy } from '../lib/format'
import { BarRow, Button, Card, Kpi, LoadError, Loading, PageHeader, Table } from '../components/ui'
import type { RuleId } from '../data/types'
import { useApi } from '../api/useApi'
import { summarize } from '../api/adapters'
import type { ApiAudit, ApiStats } from '../api/types'

export default function CityDashboard() {
  const { persona, lang, t } = useStore()
  const stats = useApi<ApiStats>('/stats')
  const canAudit = ['auditor', 'commissioner'].includes(persona?.role ?? '')
  const audit = useApi<ApiAudit[]>(canAudit ? '/audit?limit=8' : null)
  if (stats.error) return <LoadError message={stats.error} onRetry={stats.reload} />
  if (!stats.data) return <Loading />
  const s = summarize(stats.data)
  const props = s.properties
  const funnel = [
    { mr: 'संशयित (पाहणी बाकी)', en: 'Suspected (not yet visited)', v: s.suspected + s.assigned, tone: 'warn' as const },
    { mr: 'पाहणी झाली', en: 'Visited', v: s.visited, tone: 'info' as const },
    { mr: 'खात्री झाली', en: 'Confirmed', v: s.confirmed, tone: 'info' as const },
    { mr: 'नोटीस पाठवली', en: 'Notice sent', v: s.noticed, tone: 'file' as const },
    { mr: 'वसूल', en: 'Recovered', v: s.recoveredCount, tone: 'ok' as const },
  ]
  const maxRule = Math.max(1, ...Object.values(s.ruleCount))

  return (
    <>
      <PageHeader
        eyebrow={persona?.wards ? t(`प्रभाग ${persona.wards.join(', ')}`, `Wards ${persona.wards.join(', ')}`) : t('शहर', 'City')}
        title={t(CITY.mr, CITY.en)}
        sub={t('मालमत्ता Passport · थेट database मधून', 'Property Passport · live from the database')}
        actions={<Link to="/cases"><Button>{t('संशयित प्रकरणे पहा', 'Open cases')}</Button></Link>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={t('मालमत्ता Passport', 'Property Passports')} value={num(props)} sub={t('५ विभागांच्या नोंदी जोडलेल्या', '5 departments linked')} />
        <Kpi label={t('संशयित प्रकरणे', 'Suspected cases')} value={num(s.total)} sub={t(`${s.suspected} अजून सोपवायची`, `${s.suspected} not yet assigned`)} tone="warn" />
        <Kpi label={t('पाहणीत खात्री', 'Confirmed on site')} value={num(s.confirmed)} sub={t(`अचूकता ${s.accuracy}%`, `Accuracy ${s.accuracy}%`)} tone="info" />
        <Kpi label={t('संभाव्य मागणी', 'Potential demand')} value={inrShort(s.potential, lang)} sub={t('सर्व संशयित प्रकरणे', 'All open cases')} tone="file" />
        <Kpi label={t('मंजूर मागणी', 'Approved demand')} value={inrShort(s.demand, lang)} sub={t(`${s.noticed} नोटिसा`, `${s.noticed} notices`)} tone="file" />
        <Link to="/resolved" className="block rounded-md hover:ring-2 hover:ring-ok/40" title={t('निकाली प्रकरणांची यादी पहा', 'View resolved cases')}>
          <Kpi label={t('वसुली', 'Recovered')} value={inrShort(s.recovered, lang)} sub={t(`${s.recoveredCount} प्रकरणे · यादी पहा →`, `${s.recoveredCount} cases · view list →`)} tone="ok" />
        </Link>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title={t('प्रकरणांची प्रगती', 'Case progress')}>
          <div className="flex flex-col gap-3">
            {funnel.map(f => <BarRow key={f.en} label={t(f.mr, f.en)} value={f.v} max={s.total} tone={f.tone} />)}
          </div>
          {s.objections > 0 && <p className="mt-3 text-sm text-bad">{t(`${s.objections} हरकती सुनावणीसाठी प्रलंबित`, `${s.objections} objections awaiting hearing`)} · <Link className="underline" to="/objections">{t('पहा', 'View')}</Link></p>}
        </Card>
        <Card title={t('कोणत्या नियमाने किती प्रकरणे', 'Cases by matching rule')}>
          <div className="flex flex-col gap-3">
            {(Object.keys(RULES) as RuleId[]).map(r => (
              <BarRow key={r} label={<span><b className="mr-1 font-mono text-xs">{r}</b>{RULES[r].short[lang]}</span>} value={s.ruleCount[r] ?? 0} max={maxRule} tone="file" />
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-4" title={t('प्रभागनिहाय स्थिती', 'Ward-wise status')}>
        <Table head={[t('प्रभाग', 'Ward'), t('प्रकरणे', 'Cases'), t('पाहणी बाकी', 'Pending visit'), t('खात्री', 'Confirmed'), t('मंजूर मागणी', 'Demand'), t('वसुली', 'Recovered'), t('निरीक्षक', 'Inspector')]}>
          {stats.data.byWard.map(ws => (
            <tr key={ws.ward}>
              <td><b>{ws.ward}</b> · {WARD_NAMES[ws.ward]}</td>
              <td className="tnum">{ws.cases}</td>
              <td className="tnum">{ws.pending}</td>
              <td className="tnum">{ws.confirmed}</td>
              <td className="tnum">{inrShort(Number(ws.demand), lang)}</td>
              <td className="tnum">{inrShort(Number(ws.recovered), lang)}</td>
              <td>{inspectorForWard(ws.ward)?.name ?? '—'}</td>
            </tr>
          ))}
        </Table>
      </Card>

      {canAudit && audit.data && <Card className="mt-4" title={t('अलीकडील कामकाज', 'Recent activity')} action={<Link to="/audit" className="text-sm text-info underline">{t('सर्व पहा', 'View all')}</Link>}>
        <ul className="flex flex-col divide-y divide-line text-sm">
          {audit.data.map((a, i) => (
            <li key={i} className="flex flex-wrap items-center gap-x-3 py-2">
              <span className="tnum w-36 text-muted">{dmy(a.at)}</span>
              <span className="font-semibold">{a.who ?? t('प्रणाली', 'System')}</span>
              <span>{a.action}</span>
              <Link to={a.entity.startsWith('C-') ? `/cases/${a.entity}` : '#'} className="font-mono text-xs text-info">{a.entity}</Link>
            </li>
          ))}
        </ul>
      </Card>}
    </>
  )
}
