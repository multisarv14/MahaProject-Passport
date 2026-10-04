import { Link } from 'react-router-dom'
import { useStore } from '../store/store'
import { PROPERTIES } from '../data/mock'
import { num, dmy } from '../lib/format'
import { Badge, Card, Notice, PageHeader, Table } from '../components/ui'

const MODULES = [
  ['Project Passport', 'प्रकल्प, इमारती, विंग, मजले, सदनिका', 'Project, buildings, wings, floors, units'],
  ['Authority Mapping', 'PMRDA, अग्निशमन, SEIAA, MSEDCL, MahaRERA', 'PMRDA, Fire, SEIAA, MSEDCL, MahaRERA'],
  ['Approvals', 'मंजुरीचा संपूर्ण जीवनक्रम', 'Full approval lifecycle'],
  ['Queries & Inspections', 'शासकीय त्रुटी व तपासणी', 'Government queries and inspections'],
  ['Blocker Engine', '"माझा प्रकल्प कुठे अडला आहे?"', '"What is blocking my project?"'],
  ['Source of Truth', 'प्रत्येक नोंदीचा स्रोत', 'Source of every record'],
] as const

export default function Project() {
  const { t } = useStore()
  const withOc = PROPERTIES.filter(p => p.oc && p.oc.units >= 8).slice(0, 8)
  return (
    <>
      <PageHeader eyebrow={t('प्रकल्प Passport · डिझाइन टप्प्यात', 'Project Passport · In design')} title={t('महाप्रकल्प पासपोर्ट (MPP)', 'MahaProject Passport (MPP)')}
        sub={t('बांधकाम प्रकल्पांच्या अनेक प्राधिकरणांच्या मंजुरी एका ठिकाणी. हे module डिझाइन होत आहे; खाली त्याची रचना आणि मालमत्ता Passport शी जोड दाखवली आहे.', 'Multi-authority approvals for construction projects in one place. This module is being designed; below are its structure and its link to the Property Passport.')} />
      <Notice tone="file">{t('हे module अजून तयार नाही. Demo मध्ये फक्त रचना दाखवली आहे.', 'This module is not built yet. The demo shows its structure only.')}</Notice>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map(([name, mr, en]) => (
          <Card key={name}><div className="flex items-start justify-between gap-2"><div><h3 className="font-bold">{name}</h3><p className="mt-1 text-sm text-muted">{t(mr, en)}</p></div><Badge tone="neutral">{t('डिझाइन', 'Design')}</Badge></div></Card>
        ))}
      </div>
      <Card className="mt-4" title={t('मालमत्ता Passport शी जोड: OC मिळालेले प्रकल्प', 'Link to Property Passport: projects with OC')}>
        <p className="mb-3 text-sm text-muted">{t('प्रकल्पाला OC मिळताच त्याच्या सर्व सदनिका मालमत्ता Passport मध्ये येतात आणि कर नोंदीशी जुळवल्या जातात.', 'Once a project receives its OC, all its units enter the Property Passport and are matched to the tax roll.')}</p>
        <Table head={[t('OC क्रमांक', 'OC number'), t('पत्ता', 'Address'), t('सदनिका', 'Units'), t('OC दिनांक', 'OC date'), t('कर नोंद', 'On tax roll')]}>
          {withOc.map(p => (
            <tr key={p.id}>
              <td className="font-mono text-xs">{p.oc!.ocNo}</td>
              <td><Link className="text-info underline" to={`/property/${p.id}`}>{p.address}</Link></td>
              <td className="tnum">{num(p.oc!.units)}</td>
              <td>{dmy(p.oc!.date)}</td>
              <td>{p.tax ? <Badge tone="ok">{t('आहे', 'Yes')}</Badge> : <Badge tone="bad">{t('नाही', 'No')}</Badge>}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  )
}
