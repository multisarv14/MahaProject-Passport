import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Play } from 'lucide-react'
import { useStore } from '../store/store'
import { DATA_SOURCES } from '../data/mock'
import { RULES } from '../lib/labels'
import { dmy, num } from '../lib/format'
import { api } from '../api/client'
import { useApi } from '../api/useApi'
import type { ApiStats } from '../api/types'
import { Badge, Button, Card, Kpi, LoadError, Notice, PageHeader, Table } from '../components/ui'
import type { RuleId } from '../data/types'

const RULE_SOURCES: Record<RuleId, string> = {
  R1: 'OC + कर', R2: 'MSEDCL + कर', R3: 'MSEDCL + कर', R4: 'IGR + कर', R5: 'OC + कर', R6: 'पाणी + कर',
}

interface Summary { pending: number; review: number; runs: { id: number; run_at: string; run_by_name: string | null; processed: number; linked: number; created: number; to_review: number; cases_opened: number }[] }
interface RunResult { processed: number; linked: number; created: number; toReview: number; casesOpened: number; casesUpdated: number }
interface Review {
  id: number; score: number; runner_up_score: number | null; source: string; record_address: string; record_name: string | null; ref_no: string
  candidate_id: string; candidate_address: string; candidate_owner: string; runner_up_id: string | null; runner_up_address: string | null; runner_up_owner: string | null
}

export default function Matching() {
  const { t, lang } = useStore()
  const summary = useApi<Summary>('/matching/summary')
  const reviews = useApi<Review[]>('/matching/reviews')
  const stats = useApi<ApiStats>('/stats')
  const [result, setResult] = useState<RunResult | null>(null)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const ruleCount = Object.fromEntries((stats.data?.byRule ?? []).map(r => [r.rule, r.n])) as Record<string, number>

  const refresh = () => { summary.reload(); reviews.reload(); stats.reload() }
  const run = async () => {
    setBusy('run'); setErr('')
    try { setResult(await api<RunResult>('/matching/run', { method: 'POST', body: {} })); refresh() }
    catch (e) { setErr((e as Error).message) } finally { setBusy('') }
  }
  const decideReview = async (id: number, decision: 'link' | 'new', propertyId?: string) => {
    setBusy(`r${id}`); setErr('')
    try { await api(`/matching/reviews/${id}`, { method: 'POST', body: { decision, propertyId } }); refresh() }
    catch (e) { setErr((e as Error).message) } finally { setBusy('') }
  }

  return (
    <>
      <PageHeader
        title={t('जुळवणी (Matching)', 'Matching')}
        sub={t('विभागांच्या नोंदी मालमत्तांशी जोडणे. मराठी व English पत्ते, नावे आणि घर क्रमांक तपासले जातात. शंका असल्यास अधिकारी ठरवतात.', 'Links department records to properties by comparing Marathi and English addresses, names and house numbers. Uncertain matches go to an officer.')}
        actions={<Button onClick={run} disabled={!!busy || !summary.data?.pending}><Play size={16} />{busy === 'run' ? t('चालू आहे…', 'Running…') : t('जुळवणी चालवा', 'Run matching')}</Button>}
      />
      {err && <div className="mb-4"><Notice tone="bad">{err}</Notice></div>}
      {summary.error && <LoadError message={summary.error} onRetry={summary.reload} />}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={t('जुळवणी बाकी नोंदी', 'Records waiting')} value={num(summary.data?.pending ?? 0)} tone="warn" />
        <Kpi label={t('अधिकारी पडताळणी बाकी', 'Awaiting officer review')} value={num(reviews.data?.length ?? 0)} tone="bad" />
        <Kpi label={t('शेवटच्या जुळवणीत नवीन Passport', 'New passports in last run')} value={num(summary.data?.runs[0]?.created ?? 0)} tone="file" />
        <Kpi label={t('शेवटच्या जुळवणीत नवीन प्रकरणे', 'New cases in last run')} value={num(summary.data?.runs[0]?.cases_opened ?? 0)} tone="info" />
      </div>

      {result && (
        <div className="mt-4">
          <Notice tone="ok">
            {t(`${result.processed} नोंदी तपासल्या: ${result.linked} जुन्या मालमत्तांशी जोडल्या, ${result.created} नवीन Passport तयार, ${result.toReview} अधिकारी पडताळणीसाठी. ${result.casesOpened} नवीन प्रकरणे उघडली.`,
              `${result.processed} records processed: ${result.linked} linked, ${result.created} new passports, ${result.toReview} for officer review. ${result.casesOpened} new cases opened.`)}
            {result.casesOpened > 0 && <> <Link className="underline" to="/cases?status=suspected">{t('प्रकरणे पहा', 'View cases')}</Link></>}
          </Notice>
        </div>
      )}

      <Card className="mt-4" title={t('अधिकारी पडताळणी: शंकास्पद जुळवणी', 'Officer review: uncertain matches')}>
        {reviews.error && <LoadError message={reviews.error} onRetry={reviews.reload} />}
        {reviews.data && !reviews.data.length && <p className="text-sm text-muted">{t('पडताळणीसाठी काहीही बाकी नाही.', 'Nothing waiting for review.')}</p>}
        <div className="flex flex-col gap-3">
          {reviews.data?.map(r => (
            <div key={r.id} className="rounded border border-line p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                <Badge tone="info">{DATA_SOURCES.find(d => d.id === r.source)?.dept[lang]}</Badge>
                <span className="font-mono text-xs">{r.ref_no}</span>
                <Badge tone="warn">{t('जुळणी', 'Match')} {Math.round(r.score * 100)}%</Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded bg-paper p-2 text-sm">
                  <div className="text-xs font-semibold text-muted">{t('विभागाची नोंद', 'Department record')}</div>
                  <div className="font-semibold">{r.record_address}</div>
                  <div className="text-muted">{r.record_name || '—'}</div>
                </div>
                {[{ id: r.candidate_id, a: r.candidate_address, o: r.candidate_owner, s: r.score }, ...(r.runner_up_id ? [{ id: r.runner_up_id, a: r.runner_up_address!, o: r.runner_up_owner!, s: r.runner_up_score ?? 0 }] : [])].map(c => (
                  <div key={c.id} className="flex flex-col gap-2 rounded border border-line p-2 text-sm">
                    <div className="text-xs font-semibold text-muted">{t('संभाव्य मालमत्ता', 'Possible property')} · {Math.round(c.s * 100)}%</div>
                    <div className="font-semibold">{c.a}</div>
                    <div className="text-muted">{c.o}</div>
                    <Link to={`/property/${c.id}`} className="font-mono text-xs text-info underline">{c.id}</Link>
                    <Button size="sm" disabled={!!busy} onClick={() => decideReview(r.id, 'link', c.id)}>{t('हीच मालमत्ता', 'Same property')}</Button>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-right"><Button size="sm" variant="secondary" disabled={!!busy} onClick={() => decideReview(r.id, 'new')}>{t('वेगळी मालमत्ता, नवीन Passport', 'Different property, new passport')}</Button></div>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title={t('जुळवणीचे नियम', 'Matching rules')}>
          <Table head={[t('नियम', 'Rule'), t('वर्णन', 'Description'), t('विभाग', 'Sources'), t('प्रकरणे', 'Cases')]}>
            {(Object.keys(RULES) as RuleId[]).map(r => (
              <tr key={r}>
                <td className="font-mono font-bold">{r}</td>
                <td>{RULES[r][lang]}</td>
                <td>{RULE_SOURCES[r]}</td>
                <td className="tnum">{num(ruleCount[r] ?? 0)}</td>
              </tr>
            ))}
          </Table>
          <p className="mt-3 text-xs text-muted">{t('८०% किंवा अधिक जुळणी: आपोआप जोडले जाते. ५५–८०%: अधिकारी ठरवतात. ५५% पेक्षा कमी: नवीन Passport.', '80% or more: linked automatically. 55–80%: an officer decides. Below 55%: new passport.')}</p>
        </Card>
        <Card title={t('जुळवणी इतिहास', 'Run history')}>
          <Table head={[t('वेळ', 'Time'), t('कोणी', 'By'), t('तपासल्या', 'Processed'), t('जोडल्या', 'Linked'), t('नवीन', 'New'), t('पडताळणी', 'Review'), t('प्रकरणे', 'Cases')]} empty={!summary.data?.runs.length}>
            {summary.data?.runs.map(r => (
              <tr key={r.id}><td className="tnum whitespace-nowrap">{dmy(r.run_at)}</td><td>{r.run_by_name ?? '—'}</td><td className="tnum">{r.processed}</td><td className="tnum">{r.linked}</td><td className="tnum">{r.created}</td><td className="tnum">{r.to_review}</td><td className="tnum">{r.cases_opened}</td></tr>
            ))}
          </Table>
        </Card>
      </div>
    </>
  )
}
