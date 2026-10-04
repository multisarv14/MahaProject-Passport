import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useStore } from '../store/store'
import { WARD_NAMES } from '../data/mock'
import { useApi } from '../api/useApi'
import { toProperty } from '../api/adapters'
import type { ApiCase, ApiProperty } from '../api/types'
import { RULES, USAGE } from '../lib/labels'
import { inr, num, dmy } from '../lib/format'
import { Badge, Card, KV, LoadError, Loading, Notice, PageHeader, StatusBadge, Tabs } from '../components/ui'
import { MiniMap, SourceComparison } from '../components/Evidence'

type Tab = 'summary' | 'tax' | 'oc' | 'elec' | 'igr' | 'water' | 'case'

export default function PropertyPassport() {
  const { id = '' } = useParams()
  const { t, lang } = useStore()
  const [tab, setTab] = useState<Tab>('summary')
  const prop = useApi<ApiProperty>(`/properties/${encodeURIComponent(id)}`)
  const caseId = prop.data?.case_id
  const cd = useApi<ApiCase>(caseId ? `/cases/${caseId}` : null)
  if (prop.error) return <Notice tone="bad">{t('हा Passport सापडला नाही.', 'Passport not found.')} <Link to="/registry" className="underline">{t('शोधाकडे परत', 'Back to registry')}</Link></Notice>
  if (!prop.data) return <Loading />
  if (cd.error) return <LoadError message={cd.error} onRetry={cd.reload} />
  const p = toProperty(prop.data)
  const c = cd.data
  const none = <p className="text-sm text-muted">{t('या विभागाकडे या मालमत्तेची नोंद नाही.', 'This department has no record for this property.')}</p>

  return (
    <>
      <PageHeader
        eyebrow={t('मालमत्ता Passport', 'Property Passport')}
        title={p.address}
        sub={<span className="font-mono">{p.id}</span>}
        actions={c && <Link to={`/cases/${c.id}`} className="flex items-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm font-semibold">{t('प्रकरण', 'Case')} {c.id} <StatusBadge status={c.status} /></Link>}
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card>
          <KV items={[
            [t('मालक (नवीनतम नोंद)', 'Owner (latest record)'), p.owner],
            [t('प्रभाग', 'Ward'), `${p.ward} · ${WARD_NAMES[p.ward]}`],
            [t('वापर (प्रत्यक्ष)', 'Usage (actual)'), USAGE[p.usage][lang]],
            [t('क्षेत्रफळ', 'Area'), `${num(p.area)} ${t('चौ.फूट', 'sq ft')}`],
            [t('कर क्रमांक', 'Tax number'), p.tax?.taxNo ?? <Badge tone="bad">{t('कर नोंद नाही', 'Not on tax roll')}</Badge>],
            [t('वार्षिक कर', 'Annual tax'), p.tax ? inr(p.tax.annualTax) : '—'],
          ]} />
        </Card>
        <Card title={t('स्थान', 'Location')}><MiniMap p={p} /><p className="mt-2 text-xs text-muted">{t('नकाशा प्रतीकात्मक आहे (Demo).', 'Map is schematic (demo).')}</p></Card>
      </div>

      <div className="mt-4">
        <Tabs<Tab> value={tab} onChange={setTab} tabs={[
          { id: 'summary', label: t('सर्व विभागांची तुलना', 'All departments') },
          { id: 'tax', label: t('मालमत्ता कर', 'Property tax') },
          { id: 'oc', label: 'OC' },
          { id: 'elec', label: t('वीज', 'Electricity') },
          { id: 'igr', label: 'IGR' },
          { id: 'water', label: t('पाणी', 'Water') },
          { id: 'case', label: t('प्रकरण व Timeline', 'Case & timeline') },
        ]} />
        <Card>
          {tab === 'summary' && (
            <>
              <SourceComparison p={p} />
              {c && (
                <div className="mt-4 flex flex-col gap-2">
                  {c.rules.map(r => <Notice key={r} tone="warn"><b className="mr-2 font-mono">{r}</b>{RULES[r][lang]}</Notice>)}
                </div>
              )}
            </>
          )}
          {tab === 'tax' && (p.tax ? <KV items={[
            [t('कर क्रमांक', 'Tax number'), p.tax.taxNo], [t('मालक', 'Owner'), p.tax.owner], [t('वापर', 'Usage'), USAGE[p.tax.usage][lang]],
            [t('आकारलेले क्षेत्रफळ', 'Assessed area'), num(p.tax.assessedArea)], [t('वार्षिक कर', 'Annual tax'), inr(p.tax.annualTax)],
            [t('शेवटचा भरणा', 'Last paid'), dmy(p.tax.lastPaid)], [t('थकबाकी', 'Arrears'), inr(p.tax.arrears)],
          ]} /> : none)}
          {tab === 'oc' && (p.oc ? <KV items={[
            [t('OC क्रमांक', 'OC number'), p.oc.ocNo], [t('दिनांक', 'Date'), dmy(p.oc.date)], [t('बांधीव क्षेत्रफळ', 'Built-up area'), num(p.oc.builtUpArea)],
            [t('सदनिका / गाळे', 'Units'), p.oc.units], [t('प्राधिकरण', 'Authority'), p.oc.authority],
          ]} /> : none)}
          {tab === 'elec' && (p.elec ? <KV items={[
            [t('ग्राहक क्रमांक', 'Consumer number'), p.elec.consumerNo], [t('दर प्रकार', 'Tariff'), p.elec.category],
            [t('जोडणी दिनांक', 'Connected since'), dmy(p.elec.since)], [t('सरासरी मासिक युनिट', 'Avg monthly units'), num(p.elec.avgMonthlyUnits)],
          ]} /> : none)}
          {tab === 'igr' && (p.igr ? <KV items={[
            [t('दस्त क्रमांक', 'Document number'), p.igr.docNo], [t('दिनांक', 'Date'), dmy(p.igr.date)], [t('खरेदीदार', 'Buyer'), p.igr.buyer], [t('विक्रेता', 'Seller'), p.igr.seller],
          ]} /> : none)}
          {tab === 'water' && (p.water ? <KV items={[
            [t('जोडणी क्रमांक', 'Connection number'), p.water.connNo], [t('पासून', 'Since'), dmy(p.water.since)], [t('बिल आकारणी', 'Billed'), p.water.billed ? t('होय', 'Yes') : t('नाही', 'No')],
          ]} /> : none)}
          {tab === 'case' && (c ? (
            <ol className="relative ml-2 border-l-2 border-line pl-5 text-sm">
              <li className="mb-4"><div className="font-semibold">{t('जुळवणीत संशय नोंदला', 'Flagged by matching')}</div><div className="text-muted">{dmy(c.opened_on)} · {c.rules.join(', ')}</div></li>
              {c.activity.map((a, i) => (
                <li key={i} className="mb-4"><div className="font-semibold">{a.action}</div><div className="text-muted">{dmy(a.at)} · {a.who ?? '—'}</div></li>
              ))}
            </ol>
          ) : <p className="text-sm text-muted">{t('या मालमत्तेवर कोणतेही प्रकरण नाही.', 'No case on this property.')}</p>)}
        </Card>
      </div>
    </>
  )
}
