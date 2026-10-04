import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import { useStore } from '../store/store'
import { WARD_NAMES } from '../data/mock'
import { RULES } from '../lib/labels'
import { dmy, inr, inrShort, num } from '../lib/format'
import { useApi } from '../api/useApi'
import type { RuleId } from '../data/types'
import { Badge, BarRow, Button, Card, Kpi, LoadError, Loading, PageHeader, StatusBadge, Table, Tabs } from '../components/ui'

interface Row {
  id: string; propertyId: string; rules: RuleId[]; status: 'recovered' | 'closed' | 'not_found'; address: string; owner: string; ward: number
  approvedDemand: number; recovered: number; annualIncrease: number; openedOn: string; noticeNo: string | null; paidAt: string | null
  receiptNo: string | null; recordedBy: string | null; visitRemarks: string | null; structureFound: boolean | null; objectionDecision: 'upheld' | 'rejected' | null; days: number | null
}
interface Resp { rows: Row[]; summary: { recoveredAmount: number; annualAdded: number; recoveredCount: number; closedCount: number; avgDays: number } }

type Tab = 'recovered' | 'closed'

function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = '﻿' + rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  URL.revokeObjectURL(url)
}

export default function Resolved() {
  const { t, lang } = useStore()
  const { data, error, reload } = useApi<Resp>('/resolved')
  const [tab, setTab] = useState<Tab>('recovered')
  if (error) return <LoadError message={error} onRetry={reload} />
  if (!data) return <Loading />
  const s = data.summary
  const recovered = data.rows.filter(r => r.status === 'recovered')
  const closed = data.rows.filter(r => r.status !== 'recovered')

  const byWard = new Map<number, { amount: number; annual: number; n: number }>()
  const byRule = new Map<RuleId, number>()
  for (const r of recovered) {
    const w = byWard.get(r.ward) ?? { amount: 0, annual: 0, n: 0 }
    byWard.set(r.ward, { amount: w.amount + r.recovered, annual: w.annual + r.annualIncrease, n: w.n + 1 })
    for (const rule of r.rules) byRule.set(rule, (byRule.get(rule) ?? 0) + r.recovered)
  }
  const wardRows = [...byWard.entries()].sort((a, b) => a[0] - b[0])
  const maxWard = Math.max(1, ...wardRows.map(([, v]) => v.amount))
  const ruleRows = [...byRule.entries()].sort((a, b) => b[1] - a[1])
  const maxRule = Math.max(1, ...ruleRows.map(([, v]) => v))

  const exportCsv = () => downloadCsv(`maha-passport-vasuli-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['प्रकरण', 'Passport ID', 'पत्ता', 'मालक', 'प्रभाग', 'कारण', 'मंजूर मागणी', 'वसूल रक्कम', 'दरवर्षी वाढलेला कर', 'भरणा दिनांक', 'पावती क्रमांक', 'नोंदवणारे', 'लागलेले दिवस'],
    ...recovered.map(r => [r.id, r.propertyId, r.address, r.owner, r.ward, r.rules.join(' '), r.approvedDemand, r.recovered, r.annualIncrease, dmy(r.paidAt), r.receiptNo ?? '', r.recordedBy ?? '', r.days ?? '']),
  ])

  return (
    <>
      <PageHeader
        title={t('निकाली प्रकरणे व महसूल', 'Resolved Cases & Revenue')}
        sub={t('ज्या प्रकरणांचे काम पूर्ण झाले: किती महसूल मिळाला, कोणत्या मालमत्तेतून, आणि दरवर्षी किती कर कायमस्वरूपी वाढला.', 'Cases that are finished: how much revenue came in, from which property, and how much annual tax was added for good.')}
        actions={<Button variant="secondary" onClick={exportCsv} disabled={!recovered.length}><Download size={16} />{t('Excel साठी CSV', 'CSV for Excel')}</Button>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi label={t('वसूल झालेला महसूल', 'Revenue collected')} value={inrShort(s.recoveredAmount, lang)} sub={t('मागील वर्षांच्या थकबाकीसह, एकदाच', 'One-time, incl. back years')} tone="ok" />
        <Kpi label={t('दरवर्षी वाढलेला कर', 'Annual tax added')} value={inrShort(s.annualAdded, lang)} sub={t('कर नोंदीत आल्याने दरवर्षी मिळणार', 'Recurs every year from now')} tone="file" />
        <Kpi label={t('वसूल प्रकरणे', 'Cases recovered')} value={num(s.recoveredCount)} tone="ok" />
        <Kpi label={t('कारवाईविना बंद', 'Closed without action')} value={num(s.closedCount)} sub={t('पाहणीत संशय खरा ठरला नाही', 'Flag not confirmed on site')} tone="neutral" />
        <Kpi label={t('सरासरी लागलेले दिवस', 'Average days taken')} value={num(s.avgDays)} sub={t('संशय ते भरणा', 'Flag to payment')} tone="info" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title={t('प्रभागनिहाय वसूल महसूल', 'Revenue collected by ward')}>
          <div className="flex flex-col gap-3">
            {wardRows.map(([w, v]) => <BarRow key={w} label={`${w} · ${WARD_NAMES[w]}`} value={v.amount} max={maxWard} display={`${inrShort(v.amount, lang)} · ${v.n}`} tone="ok" />)}
            {!wardRows.length && <p className="text-sm text-muted">{t('अजून वसुली नाही.', 'Nothing collected yet.')}</p>}
          </div>
        </Card>
        <Card title={t('कोणत्या नियमातून किती महसूल', 'Revenue by matching rule')}>
          <div className="flex flex-col gap-3">
            {ruleRows.map(([r, v]) => <BarRow key={r} label={<span><b className="mr-1 font-mono text-xs">{r}</b>{RULES[r].short[lang]}</span>} value={v} max={maxRule} display={inrShort(v, lang)} tone="file" />)}
            {!ruleRows.length && <p className="text-sm text-muted">{t('अजून वसुली नाही.', 'Nothing collected yet.')}</p>}
          </div>
          <p className="mt-3 text-xs text-muted">{t('एका प्रकरणात एकापेक्षा जास्त नियम असल्यास रक्कम प्रत्येक नियमाखाली दिसते.', 'A case with several rules is counted under each of them.')}</p>
        </Card>
      </div>

      <div className="mt-4">
        <Tabs<Tab> value={tab} onChange={setTab} tabs={[
          { id: 'recovered', label: `${t('वसूल', 'Recovered')} (${recovered.length})` },
          { id: 'closed', label: `${t('कारवाईविना बंद', 'Closed without action')} (${closed.length})` },
        ]} />
        <Card>
          {tab === 'recovered' && (
            <Table head={[t('प्रकरण', 'Case'), t('मालमत्ता', 'Property'), t('प्रभाग', 'Ward'), t('कारण', 'Reason'), t('मंजूर मागणी', 'Approved'), t('वसूल', 'Collected'), t('दरवर्षी वाढ', 'Annual added'), t('भरणा', 'Paid'), t('दिवस', 'Days')]} empty={!recovered.length}>
              {recovered.map(r => (
                <tr key={r.id}>
                  <td><Link className="font-mono text-xs text-info underline" to={`/cases/${r.id}`}>{r.id}</Link>{r.objectionDecision && <div className="mt-1"><Badge tone="info">{t('हरकत', 'Objection')}: {r.objectionDecision === 'upheld' ? t('मान्य', 'upheld') : t('फेटाळली', 'rejected')}</Badge></div>}</td>
                  <td className="max-w-[15rem]">{r.address}<div className="text-xs text-muted">{r.owner}</div></td>
                  <td className="tnum">{r.ward}</td>
                  <td><div className="flex flex-wrap gap-1">{r.rules.map(x => <Badge key={x} tone="warn">{x}</Badge>)}</div></td>
                  <td className="tnum">{inr(r.approvedDemand)}</td>
                  <td className="tnum font-semibold text-ok">{inr(r.recovered)}</td>
                  <td className="tnum font-semibold">{inr(r.annualIncrease)}<span className="text-xs font-normal text-muted">{t(' /वर्ष', ' /yr')}</span></td>
                  <td className="whitespace-nowrap">{dmy(r.paidAt)}<div className="font-mono text-xs text-muted">{r.receiptNo}</div></td>
                  <td className="tnum">{r.days ?? '—'}</td>
                </tr>
              ))}
            </Table>
          )}
          {tab === 'closed' && (
            <Table head={[t('प्रकरण', 'Case'), t('मालमत्ता', 'Property'), t('प्रभाग', 'Ward'), t('कारण', 'Reason'), t('पाहणी शेरा', 'Site remark'), t('स्थिती', 'Status')]} empty={!closed.length}>
              {closed.map(r => (
                <tr key={r.id}>
                  <td><Link className="font-mono text-xs text-info underline" to={`/cases/${r.id}`}>{r.id}</Link></td>
                  <td className="max-w-[15rem]">{r.address}<div className="text-xs text-muted">{r.owner}</div></td>
                  <td className="tnum">{r.ward}</td>
                  <td><div className="flex flex-wrap gap-1">{r.rules.map(x => <Badge key={x} tone="warn">{x}</Badge>)}</div></td>
                  <td className="max-w-xs">{r.visitRemarks ?? '—'}</td>
                  <td><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </Table>
          )}
          {tab === 'closed' && <p className="mt-3 text-xs text-muted">{t('ही प्रकरणे प्रणालीच्या अचूकतेचे मोजमाप आहेत: संशय आला, पण पाहणीत खरा ठरला नाही, म्हणून नागरिकाला नोटीस गेली नाही.', 'These measure accuracy: a flag was raised but not confirmed on site, so no notice went to the citizen.')}</p>}
        </Card>
      </div>
    </>
  )
}
