import { Link } from 'react-router-dom'
import { useStore } from '../store/store'
import { PROPERTY_BY_ID } from '../data/mock'
import { inr, dmy } from '../lib/format'
import { Badge, Card, Kpi, PageHeader, StatusBadge, Table } from '../components/ui'

export default function Objections() {
  const { t, cases } = useStore()
  const withObj = cases.filter(c => c.objection)
  const pending = withObj.filter(c => c.status === 'objection')
  const decided = withObj.filter(c => c.objection?.decision)
  const upheld = decided.filter(c => c.objection?.decision === 'upheld').length

  return (
    <>
      <PageHeader title={t('हरकती व सुनावणी', 'Objections & Hearings')} sub={t('नोटिशीवर नागरिकांनी घेतलेल्या हरकती. प्रत्येक हरकतीवर सुनावणी अधिकारी निर्णय घेतात.', 'Objections filed by citizens against notices. A hearing officer decides each one.')} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={t('एकूण हरकती', 'Total objections')} value={withObj.length} />
        <Kpi label={t('सुनावणी प्रलंबित', 'Pending hearing')} value={pending.length} tone="bad" />
        <Kpi label={t('मान्य', 'Upheld')} value={upheld} tone="ok" />
        <Kpi label={t('फेटाळल्या', 'Rejected')} value={decided.length - upheld} tone="neutral" />
      </div>
      <Card className="mt-4" title={t('हरकतींची यादी', 'Objections')}>
        <Table head={[t('प्रकरण', 'Case'), t('मालक', 'Owner'), t('हरकत', 'Objection'), t('दिनांक', 'Filed'), t('मागणी', 'Demand'), t('निर्णय', 'Decision'), t('स्थिती', 'Status')]} empty={!withObj.length}>
          {withObj.map(c => {
            const p = PROPERTY_BY_ID[c.propertyId]
            return (
              <tr key={c.id}>
                <td><Link className="font-mono text-xs text-info underline" to={`/cases/${c.id}`}>{c.id}</Link></td>
                <td>{p.owner}<div className="text-xs text-muted">{p.address}</div></td>
                <td className="max-w-xs">{c.objection!.text}</td>
                <td className="tnum">{dmy(c.objection!.date)}</td>
                <td className="tnum">{inr(c.approvedDemand ?? 0)}</td>
                <td>{c.objection!.decision ? <Badge tone={c.objection!.decision === 'upheld' ? 'ok' : 'neutral'}>{c.objection!.decision === 'upheld' ? t('मान्य', 'Upheld') : t('फेटाळली', 'Rejected')}</Badge> : <Badge tone="warn">{t('प्रलंबित', 'Pending')}</Badge>}</td>
                <td><StatusBadge status={c.status} /></td>
              </tr>
            )
          })}
        </Table>
      </Card>
    </>
  )
}
