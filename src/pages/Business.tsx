import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/store'
import { BUSINESSES, PROPERTY_BY_ID, WARD_NAMES } from '../data/mock'
import { BIZ_FLAGS } from '../lib/labels'
import { Badge, Card, KV, Kpi, Modal, Notice, PageHeader, Table, Tabs } from '../components/ui'
import type { Business as Biz } from '../data/types'

type Tab = 'all' | 'flags' | 'gst'

export default function Business() {
  const { t, lang } = useStore()
  const [tab, setTab] = useState<Tab>('flags')
  const [sel, setSel] = useState<Biz | null>(null)
  const flagged = BUSINESSES.filter(b => b.flags.length)
  const gst = BUSINESSES.filter(b => b.flags.includes('B3'))
  const rows = tab === 'all' ? BUSINESSES : tab === 'flags' ? flagged.filter(b => !b.flags.every(f => f === 'B3')) : gst
  const yes = (v?: string) => v ? <Badge tone="ok">{t('आहे', 'Yes')}</Badge> : <Badge tone="bad">{t('नाही', 'No')}</Badge>

  return (
    <>
      <PageHeader eyebrow={t('व्यवसाय Passport · पुढील टप्पा (Demo)', 'Business Passport · Next phase (demo)')} title={t('व्यवसाय Passport', 'Business Passport')}
        sub={t('तेच engine, आता दुकाने व आस्थापनांसाठी: दुकाने व आस्थापना नोंदणी, व्यवसाय कर (PT), परवाना आणि व्यावसायिक वीज.', 'Same engine, now for shops and establishments: Shop Act, Professional Tax, trade licence and commercial power.')} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={t('आस्थापना', 'Establishments')} value={BUSINESSES.length} />
        <Kpi label={t('Shop Act नोंदणी नाही', 'No Shop Act registration')} value={BUSINESSES.filter(b => b.flags.includes('B1')).length} tone="warn" />
        <Kpi label={t('PT नोंदणी नाही', 'No PT enrolment')} value={BUSINESSES.filter(b => b.flags.includes('B2')).length} tone="warn" />
        <Kpi label={t('State GST संदर्भ', 'State GST referrals')} value={gst.length} tone="bad" />
      </div>
      <div className="mt-4">
        <Tabs<Tab> value={tab} onChange={setTab} tabs={[
          { id: 'flags', label: t('नोंदणीतील उणिवा', 'Registration gaps') },
          { id: 'gst', label: t('State GST संदर्भ यादी', 'State GST referral list') },
          { id: 'all', label: t('सर्व आस्थापना', 'All establishments') },
        ]} />
        {tab === 'gst' && <div className="mb-3"><Notice tone="info">{t('GST analytics GSTN कडे आहे. ही यादी फक्त स्थानिक पाहणी व वीज / मालमत्ता नोंदींवर आधारित संदर्भ म्हणून State GST विभागाला दिली जाते. कारवाईचा निर्णय त्या विभागाचा.', 'GST analytics sits with GSTN. This list is only a referral to the State GST department, based on local site and power / property records. Any action is that department\'s decision.')}</Notice></div>}
        <Card>
          <Table head={['Passport ID', t('नाव', 'Name'), t('प्रभाग', 'Ward'), 'Shop Act', 'PT', t('परवाना', 'Licence'), 'GST', t('उणीव', 'Gap')]}>
            {rows.map(b => (
              <tr key={b.id} className="cursor-pointer" onClick={() => setSel(b)}>
                <td className="font-mono text-xs text-info underline">{b.id}</td>
                <td>{b.name}</td>
                <td className="tnum">{b.ward}</td>
                <td>{yes(b.shopAct)}</td><td>{yes(b.ptNo)}</td><td>{yes(b.licence)}</td>
                <td>{b.gstin ? <Badge tone="info">{t('नोंदणीकृत', 'Registered')}</Badge> : <span className="text-muted">—</span>}</td>
                <td><div className="flex flex-wrap gap-1">{b.flags.map(f => <Badge key={f} tone={f === 'B3' ? 'bad' : 'warn'}>{f}</Badge>)}</div></td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
      <Modal open={!!sel} onClose={() => setSel(null)} title={sel?.name ?? ''} wide>
        {sel && (() => {
          const p = PROPERTY_BY_ID[sel.propertyId]
          return (
            <div className="flex flex-col gap-4">
              <KV items={[
                ['Passport ID', <span className="font-mono">{sel.id}</span>], [t('प्रकार', 'Type'), sel.type],
                [t('पत्ता', 'Address'), p.address], [t('प्रभाग', 'Ward'), `${sel.ward} · ${WARD_NAMES[sel.ward]}`],
                ['Shop Act', sel.shopAct ?? '—'], ['PT', sel.ptNo ?? '—'], [t('परवाना', 'Licence'), sel.licence ?? '—'], ['GSTIN', sel.gstin ?? '—'],
                [t('वीज', 'Electricity'), sel.elecCommercial ? 'LT-II व्यावसायिक' : p.elec ? p.elec.category : t('जोडणी नाही', 'No connection')],
                [t('मालमत्ता Passport', 'Property Passport'), <Link className="font-mono text-info underline" to={`/property/${p.id}`}>{p.id}</Link>],
              ]} />
              <div className="flex flex-col gap-2">{sel.flags.map(f => <Notice key={f} tone={f === 'B3' ? 'bad' : 'warn'}><b className="mr-2 font-mono">{f}</b>{BIZ_FLAGS[f][lang]}</Notice>)}</div>
            </div>
          )
        })()}
      </Modal>
    </>
  )
}
