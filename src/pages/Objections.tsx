import { Link } from 'react-router-dom'
import { useStore } from '../store/store'
import { inr, dmy } from '../lib/format'
import { useApi } from '../api/useApi'
import type { ApiObjection } from '../api/types'
import { Badge, Card, Kpi, LoadError, Loading, PageHeader, StatusBadge, Table } from '../components/ui'

export default function Objections() {
  const { t } = useStore()
  const { data, error, reload } = useApi<ApiObjection[]>('/objections')
  if (error) return <LoadError message={error} onRetry={reload} />
  if (!data) return <Loading />
  const pending = data.filter(o => !o.decision).length
  const upheld = data.filter(o => o.decision === 'upheld').length

  return (
    <>
      <PageHeader title={t('हरकती व सुनावणी', 'Objections & Hearings')} sub={t('नोटिशीवर नागरिकांनी घेतलेल्या हरकती. प्रत्येक हरकतीवर सुनावणी अधिकारी निर्णय घेतात.', 'Objections filed by citizens against notices. A hearing officer decides each one.')} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={t('एकूण हरकती', 'Total objections')} value={data.length} />
        <Kpi label={t('सुनावणी प्रलंबित', 'Pending hearing')} value={pending} tone="bad" />
        <Kpi label={t('मान्य', 'Upheld')} value={upheld} tone="ok" />
        <Kpi label={t('फेटाळल्या', 'Rejected')} value={data.length - pending - upheld} tone="neutral" />
      </div>
      <Card className="mt-4" title={t('हरकतींची यादी', 'Objections')}>
        <Table head={[t('प्रकरण', 'Case'), t('मालक', 'Owner'), t('हरकत', 'Objection'), t('दिनांक', 'Filed'), t('मागणी', 'Demand'), t('निर्णय', 'Decision'), t('स्थिती', 'Status')]} empty={!data.length}>
          {data.map(o => (
            <tr key={o.id}>
              <td><Link className="font-mono text-xs text-info underline" to={`/cases/${o.case_id}`}>{o.case_id}</Link></td>
              <td>{o.owner_name}<div className="text-xs text-muted">{o.address}</div></td>
              <td className="max-w-xs">{o.text}</td>
              <td className="tnum">{dmy(o.filed_on)}</td>
              <td className="tnum">{inr(Number(o.approved_demand ?? 0))}</td>
              <td>{o.decision ? <Badge tone={o.decision === 'upheld' ? 'ok' : 'neutral'}>{o.decision === 'upheld' ? t('मान्य', 'Upheld') : t('फेटाळली', 'Rejected')}</Badge> : <Badge tone="warn">{t('प्रलंबित', 'Pending')}</Badge>}</td>
              <td><StatusBadge status={o.status} /></td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  )
}
