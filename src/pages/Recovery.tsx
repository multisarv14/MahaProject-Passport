import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/store'
import { WARD_NAMES } from '../data/mock'
import { inr, inrShort, pct } from '../lib/format'
import { api } from '../api/client'
import { useApi } from '../api/useApi'
import { summarize } from '../api/adapters'
import type { ApiCaseRow, ApiStats } from '../api/types'
import { BarRow, Button, Card, Kpi, LoadError, Loading, Notice, PageHeader, StatusBadge, Table } from '../components/ui'

export default function Recovery() {
  const { t, lang, persona } = useStore()
  const stats = useApi<ApiStats>('/stats')
  const due = useApi<ApiCaseRow[]>('/cases?status=notice_sent&limit=200')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState('')
  if (stats.error) return <LoadError message={stats.error} onRetry={stats.reload} />
  if (!stats.data) return <Loading />
  const s = summarize(stats.data)
  const canRecord = persona?.role === 'recovery_clerk' || persona?.role === 'assessment_officer'
  const maxDemand = Math.max(1, ...stats.data.byWard.map(r => Number(r.demand)))
  const pay = async (id: string) => {
    setBusy(id); setErr('')
    try { await api(`/cases/${id}/payment`, { method: 'POST', body: {} }); stats.reload(); due.reload() }
    catch (e) { setErr((e as Error).message) } finally { setBusy('') }
  }

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
          {err && <div className="mb-3"><Notice tone="bad">{err}</Notice></div>}
          {due.error && <LoadError message={due.error} onRetry={due.reload} />}
          {due.data && (
            <Table head={[t('प्रकरण', 'Case'), t('मालक', 'Owner'), t('मागणी', 'Demand'), t('स्थिती', 'Status'), '']} empty={!due.data.length}>
              {due.data.map(c => (
                <tr key={c.id}>
                  <td><Link className="font-mono text-xs text-info underline" to={`/cases/${c.id}`}>{c.id}</Link></td>
                  <td>{c.owner_name}<div className="text-xs text-muted">{c.address}</div></td>
                  <td className="tnum font-semibold">{inr(Number(c.approved_demand ?? 0))}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td>{canRecord && <Button size="sm" disabled={busy === c.id} onClick={() => pay(c.id)}>{t('भरणा नोंदवा', 'Record payment')}</Button>}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
        <Card title={t('प्रभागनिहाय मागणी व वसुली', 'Demand and collection by ward')}>
          <div className="flex flex-col gap-3">
            {stats.data.byWard.map(r => (
              <div key={r.ward}>
                <div className="mb-1 text-sm font-semibold">{r.ward} · {WARD_NAMES[r.ward]}</div>
                <BarRow label={t('मागणी', 'Demand')} value={Number(r.demand)} max={maxDemand} display={inrShort(Number(r.demand), lang)} tone="file" />
                <BarRow label={t('वसूल', 'Collected')} value={Number(r.recovered)} max={maxDemand} display={inrShort(Number(r.recovered), lang)} tone="ok" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}
