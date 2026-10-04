import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/store'
import { WARDS, WARD_NAMES } from '../data/mock'
import { RULES, STATUS } from '../lib/labels'
import { inr, dmy } from '../lib/format'
import { useApi } from '../api/useApi'
import type { ApiCaseRow, ApiStats } from '../api/types'
import { Badge, Button, Card, LoadError, PageHeader, StatusBadge, Table, inputCls } from '../components/ui'
import type { CaseStatus, RuleId } from '../data/types'

const PAGE = 50

export default function Cases() {
  const { t, lang, persona } = useStore()
  const [params] = useSearchParams()
  const [status, setStatus] = useState<CaseStatus | ''>((params.get('status') as CaseStatus) ?? '')
  const [rule, setRule] = useState<RuleId | ''>('')
  const [ward, setWard] = useState(0)
  const [limit, setLimit] = useState(PAGE)
  useEffect(() => setLimit(PAGE), [status, rule, ward])

  const q = new URLSearchParams({ limit: String(limit) })
  if (status) q.set('status', status)
  if (rule) q.set('rule', rule)
  if (ward) q.set('ward', String(ward))
  const { data, error, loading, reload } = useApi<ApiCaseRow[]>(`/cases?${q}`)
  const stats = useApi<ApiStats>('/stats')
  const count = (s: CaseStatus) => stats.data?.byStatus.find(x => x.status === s)?.n ?? 0
  const wards = persona?.wards ?? WARDS

  return (
    <>
      <PageHeader title={t('संशयित प्रकरणे', 'Cases')} sub={t('विभागांच्या नोंदी न जुळल्यामुळे उघडलेली प्रकरणे. प्रत्यक्ष पाहणी आणि अधिकाऱ्याच्या मंजुरीशिवाय नोटीस जात नाही.', 'Cases opened where department records do not match. No notice goes out without a site visit and officer approval.')} />
      <div className="mb-3 flex flex-wrap gap-2">
        {(['suspected', 'assigned', 'verified', 'notice_sent', 'objection', 'recovered', 'not_found', 'closed'] as CaseStatus[]).map(s => (
          <button key={s} onClick={() => setStatus(status === s ? '' : s)}
            className={'rounded border px-3 py-1.5 text-sm ' + (status === s ? 'border-ink bg-ink text-white' : 'border-line bg-white')}>
            {STATUS[s][lang]} <b className="tnum ml-1">{count(s)}</b>
          </button>
        ))}
      </div>
      <Card>
        <div className="mb-3 flex flex-wrap gap-2">
          <select id="case-rule" className={inputCls} value={rule} onChange={e => setRule(e.target.value as RuleId | '')}>
            <option value="">{t('सर्व नियम', 'All rules')}</option>
            {(Object.keys(RULES) as RuleId[]).map(r => <option key={r} value={r}>{r} · {RULES[r].short[lang]}</option>)}
          </select>
          <select id="case-ward" className={inputCls} value={ward} onChange={e => setWard(+e.target.value)}>
            <option value={0}>{persona?.wards ? t('माझे सर्व प्रभाग', 'All my wards') : t('सर्व प्रभाग', 'All wards')}</option>
            {wards.map(w => <option key={w} value={w}>{t('प्रभाग', 'Ward')} {w} · {WARD_NAMES[w]}</option>)}
          </select>
          <span className="self-center text-sm text-muted">{t('संभाव्य मागणीनुसार क्रम', 'Sorted by potential demand')}</span>
        </div>
        {error && <LoadError message={error} onRetry={reload} />}
        {data && (
          <>
            <Table head={[t('प्रकरण', 'Case'), t('मालमत्ता', 'Property'), t('प्रभाग', 'Ward'), t('कारण', 'Reason'), t('विश्वास', 'Confidence'), t('संभाव्य मागणी', 'Potential demand'), t('निरीक्षक', 'Inspector'), t('स्थिती', 'Status')]} empty={!data.length}>
              {data.map(c => (
                <tr key={c.id}>
                  <td><Link className="font-mono text-xs text-info underline" to={`/cases/${c.id}`}>{c.id}</Link><div className="text-xs text-muted">{dmy(c.opened_on)}</div></td>
                  <td className="max-w-[16rem]">{c.address}<div className="text-xs text-muted">{c.owner_name}</div></td>
                  <td className="tnum">{c.ward}</td>
                  <td><div className="flex flex-wrap gap-1">{c.rules.map(r => <Badge key={r} tone="warn">{r} · {RULES[r].short[lang]}</Badge>)}</div></td>
                  <td className="tnum">{c.confidence}%</td>
                  <td className="tnum font-semibold">{Number(c.est_demand) ? inr(Number(c.est_demand)) : <span className="text-muted">{t('नोंद दुरुस्ती', 'Record fix')}</span>}</td>
                  <td>{c.assigned_name ?? '—'}</td>
                  <td><StatusBadge status={c.status} /></td>
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
