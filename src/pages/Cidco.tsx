import { useState } from 'react'
import { useStore } from '../store/store'
import { CIDCO_PLOTS, cidcoTransferCharge, type CidcoFlag, type CidcoPlot } from '../data/mock'
import { CIDCO_FLAGS } from '../lib/labels'
import { dmy, inr, inrShort, num } from '../lib/format'
import { Badge, BarRow, Card, KV, Kpi, Modal, Notice, PageHeader, Table, Tabs, cx } from '../components/ui'

type Tab = 'all' | CidcoFlag
const USE = { residential: { mr: 'निवासी', en: 'Residential' }, commercial: { mr: 'व्यावसायिक', en: 'Commercial' }, institutional: { mr: 'संस्थात्मक', en: 'Institutional' } }

export default function Cidco() {
  const { t, lang } = useStore()
  const [tab, setTab] = useState<Tab>('all')
  const [sel, setSel] = useState<CidcoPlot | null>(null)
  const flagged = CIDCO_PLOTS.filter(p => p.flags.length)
  const rows = (tab === 'all' ? flagged : CIDCO_PLOTS.filter(p => p.flags.includes(tab))).sort((a, b) => b.estCharges - a.estCharges)
  const total = flagged.reduce((a, p) => a + p.estCharges, 0)
  const byFlag = (Object.keys(CIDCO_FLAGS) as CidcoFlag[]).map(f => ({ f, n: CIDCO_PLOTS.filter(p => p.flags.includes(f)).length, amt: CIDCO_PLOTS.filter(p => p.flags.includes(f)).reduce((a, p) => a + p.estCharges, 0) }))
  const maxAmt = Math.max(1, ...byFlag.map(x => x.amt))

  return (
    <>
      <PageHeader eyebrow={t('प्रस्तावित वापर · CIDCO (Demo)', 'Proposed use · CIDCO (demo)')} title={t('CIDCO भूखंड Passport', 'CIDCO Plot Passport')}
        sub={t('तेच engine, आता भाडेपट्ट्याच्या भूखंडांसाठी: CIDCO च्या Estate नोंदी, IGR विक्री, वीज वापर आणि बांधकाम जोडून शुल्काची उणीव शोधणे.', 'Same engine for leasehold plots: CIDCO estate records, IGR sales, power use and construction joined to find uncollected charges.')} />
      <Notice tone="file">{t('काल्पनिक "नमुना नोड" मधील ९६ भूखंड. नियम व दर उदाहरणादाखल; CIDCO च्या मान्यतेनंतर त्यांच्या धोरणानुसार निश्चित होतील.', '96 fictional plots in an invented "Namuna node". Rules and rates are illustrative and would follow CIDCO policy once approved.')}</Notice>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={t('भूखंड', 'Plots')} value={num(CIDCO_PLOTS.length)} />
        <Kpi label={t('उणीव आढळलेले भूखंड', 'Plots with a gap')} value={num(flagged.length)} tone="warn" />
        <Kpi label={t('हस्तांतरण शुल्क बाकी (C1)', 'Transfer fee pending (C1)')} value={num(byFlag[0].n)} tone="bad" />
        <Kpi label={t('संभाव्य वसूलयोग्य शुल्क', 'Potential charges')} value={inrShort(total, lang)} tone="file" />
      </div>

      <Card className="mt-4" title={t('कोणत्या उणिवेतून किती शुल्क', 'Charges by gap type')}>
        <div className="flex flex-col gap-3">
          {byFlag.map(x => <BarRow key={x.f} label={<span><b className="mr-1 font-mono text-xs">{x.f}</b>{CIDCO_FLAGS[x.f].short[lang]} ({x.n})</span>} value={x.amt} max={maxAmt} display={inrShort(x.amt, lang)} tone="file" />)}
        </div>
      </Card>

      <div className="mt-4">
        <Tabs<Tab> value={tab} onChange={setTab} tabs={[
          { id: 'all', label: t('सर्व उणिवा', 'All gaps') },
          ...(Object.keys(CIDCO_FLAGS) as CidcoFlag[]).map(f => ({ id: f as Tab, label: `${f} · ${CIDCO_FLAGS[f].short[lang]}` })),
        ]} />
        <Card>
          <Table head={['Passport ID', t('सेक्टर / भूखंड', 'Sector / plot'), t('वाटपधारक', 'Allottee'), t('वाटप वापर', 'Allotted use'), t('क्षेत्र (चौ.मी.)', 'Area (sq m)'), t('उणीव', 'Gap'), t('संभाव्य शुल्क', 'Potential charge')]} empty={!rows.length}>
            {rows.map(p => (
              <tr key={p.id} className="cursor-pointer" onClick={() => setSel(p)}>
                <td className="font-mono text-xs text-info underline">{p.id}</td>
                <td>{t('सेक्टर', 'Sector')} {p.sector} · {p.plotNo}</td>
                <td>{p.allottee}</td>
                <td>{USE[p.allottedUse][lang]}</td>
                <td className="tnum">{num(p.areaSqm)}</td>
                <td><div className="flex flex-wrap gap-1">{p.flags.map(f => <Badge key={f} tone={f === 'C1' || f === 'C2' ? 'bad' : 'warn'}>{f}</Badge>)}</div></td>
                <td className="tnum font-semibold">{inr(p.estCharges)}</td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>

      <Modal open={!!sel} onClose={() => setSel(null)} title={sel ? `${sel.id} · ${t('सेक्टर', 'Sector')} ${sel.sector}, ${t('भूखंड', 'plot')} ${sel.plotNo}` : ''} wide>
        {sel && (
          <div className="flex flex-col gap-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead><tr className="text-left text-xs text-muted"><th className="border-b border-line px-3 py-2" /><th className="border-b border-line px-3 py-2">CIDCO Estate</th><th className="border-b border-line px-3 py-2">IGR</th><th className="border-b border-line px-3 py-2">{t('वीज', 'Power')}</th><th className="border-b border-line px-3 py-2">{t('बांधकाम (OC)', 'Construction (OC)')}</th></tr></thead>
                <tbody className="[&_td]:border-b [&_td]:border-line [&_td]:px-3 [&_td]:py-2 [&_th]:border-b [&_th]:border-line [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:text-muted">
                  <tr><th>{t('धारक', 'Holder')}</th><td className={cx(sel.flags.includes('C1') && 'bg-bad-soft font-semibold text-bad')}>{sel.allottee}</td><td>{sel.igrSale?.buyer ?? '—'}</td><td>—</td><td>—</td></tr>
                  <tr><th>{t('वापर', 'Use')}</th><td className={cx(sel.flags.includes('C2') && 'bg-bad-soft font-semibold text-bad')}>{USE[sel.allottedUse][lang]}</td><td>—</td><td>{sel.elecCategory ?? t('जोडणी नाही', 'None')}</td><td>—</td></tr>
                  <tr><th>{t('बांधीव क्षेत्र (चौ.फूट)', 'Built-up (sq ft)')}</th><td>{t('मंजूर', 'Permitted')} {num(sel.permittedBua)}</td><td>—</td><td>—</td><td className={cx(sel.flags.includes('C3') && 'bg-bad-soft font-semibold text-bad')}>{sel.builtBua ? num(sel.builtBua) : t('बांधकाम नाही', 'Not built')}</td></tr>
                  <tr><th>{t('नोंद', 'Record')}</th><td>{t('भाडेपट्टा', 'Lease')} {dmy(sel.leaseFrom)}{sel.transferNoc && <div className="font-mono text-xs">{sel.transferNoc}</div>}</td><td>{sel.igrSale ? <span className="font-mono text-xs">{sel.igrSale.docNo} · {dmy(sel.igrSale.date)}</span> : '—'}</td><td>—</td><td>—</td></tr>
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-2">{sel.flags.map(f => <Notice key={f} tone={f === 'C1' || f === 'C2' ? 'bad' : 'warn'}><b className="mr-2 font-mono">{f}</b>{CIDCO_FLAGS[f][lang]}</Notice>)}</div>
            <KV items={[
              [t('क्षेत्र', 'Area'), `${num(sel.areaSqm)} ${t('चौ.मी.', 'sq m')}`],
              [t('थकबाकी', 'Arrears'), inr(sel.arrears)],
              [t('हस्तांतरण शुल्क (टप्पा)', 'Transfer charge (slab)'), inr(cidcoTransferCharge(sel.areaSqm))],
              [t('एकूण संभाव्य शुल्क', 'Total potential charge'), <b>{inr(sel.estCharges)}</b>],
            ]} />
            <p className="text-xs text-muted">{t('पुढील कृती मालमत्ता Passport सारखीच: Estate अधिकाऱ्याकडून पडताळणी, प्रत्यक्ष पाहणी, नोटीस, हरकत, वसुली.', 'Next steps mirror the Property Passport: estate officer review, site visit, notice, objection, recovery.')}</p>
          </div>
        )}
      </Modal>
    </>
  )
}
