import { useState } from 'react'
import { useStore } from '../store/store'
import { CITY, DATA_SOURCES, DISTRICT, PERSONAS, WARDS, WARD_NAMES } from '../data/mock'
import { RULES, ROLES } from '../lib/labels'
import { Badge, Card, Notice, PageHeader, Table, Tabs } from '../components/ui'
import type { RoleId, RuleId } from '../data/types'

type Tab = 'users' | 'roles' | 'offices' | 'depts' | 'rules' | 'types' | 'settings'

const PERMS: { mr: string; en: string; roles: RoleId[] }[] = [
  { mr: 'Dashboard पाहणे', en: 'View dashboards', roles: ['platform_admin', 'state_lead', 'collector', 'commissioner', 'assessment_officer', 'ward_officer', 'representative'] },
  { mr: 'वैयक्तिक मालमत्ता तपशील', en: 'Individual property details', roles: ['platform_admin', 'commissioner', 'assessment_officer', 'ward_officer', 'inspector', 'hearing_officer', 'recovery_clerk', 'auditor'] },
  { mr: 'Data upload', en: 'Upload data', roles: ['platform_admin', 'dept_data_officer'] },
  { mr: 'प्रकरण सोपवणे', en: 'Assign cases', roles: ['ward_officer', 'assessment_officer', 'commissioner'] },
  { mr: 'प्रत्यक्ष पाहणी', en: 'Site visit', roles: ['inspector'] },
  { mr: 'आकारणी मंजुरी / नोटीस', en: 'Approve assessment / notice', roles: ['assessment_officer', 'commissioner'] },
  { mr: 'हरकतीवर निर्णय', en: 'Decide objections', roles: ['hearing_officer'] },
  { mr: 'वसुली नोंद', en: 'Record payments', roles: ['recovery_clerk', 'assessment_officer'] },
  { mr: 'Audit log', en: 'Audit log', roles: ['auditor', 'platform_admin', 'commissioner'] },
]
const MATRIX_ROLES: RoleId[] = ['commissioner', 'assessment_officer', 'ward_officer', 'inspector', 'hearing_officer', 'recovery_clerk', 'dept_data_officer', 'auditor', 'representative']

export default function Admin() {
  const { t, lang } = useStore()
  const [tab, setTab] = useState<Tab>('users')
  const [rules, setRules] = useState<Record<string, boolean>>(Object.fromEntries(Object.keys(RULES).map(r => [r, true])))
  const [conf, setConf] = useState(70)

  return (
    <>
      <PageHeader title={t('प्रशासन', 'Administration')} sub={t('Users, भूमिका, कार्यालये, विभाग, नियम आणि Passport प्रकार', 'Users, roles, offices, departments, rules and passport types')} />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'users', label: 'Users' }, { id: 'roles', label: t('भूमिका व अधिकार', 'Roles & permissions') },
        { id: 'offices', label: t('कार्यालये व क्षेत्र', 'Offices & jurisdiction') }, { id: 'depts', label: t('विभाग', 'Departments') },
        { id: 'rules', label: t('जुळवणी नियम', 'Matching rules') }, { id: 'types', label: t('Passport प्रकार', 'Passport types') },
        { id: 'settings', label: 'Settings' },
      ]} />
      <Card>
        {tab === 'users' && (
          <Table head={[t('नाव', 'Name'), t('भूमिका', 'Role'), t('कार्यालय', 'Office'), t('प्रवेश', 'Login'), t('स्थिती', 'Status')]}>
            {PERSONAS.map(p => <tr key={p.id}><td className="font-semibold">{p.name}</td><td>{ROLES[p.role][lang]}</td><td>{p.office}</td><td>{t('मोबाईल OTP', 'Mobile OTP')}</td><td><Badge tone="ok">{t('सक्रिय', 'Active')}</Badge></td></tr>)}
          </Table>
        )}
        {tab === 'roles' && (
          <Table head={[t('अधिकार', 'Permission'), ...MATRIX_ROLES.map(r => ROLES[r][lang])]}>
            {PERMS.map(p => (
              <tr key={p.en}><td className="font-semibold whitespace-nowrap">{t(p.mr, p.en)}</td>{MATRIX_ROLES.map(r => <td key={r} className="text-center">{p.roles.includes(r) ? <span className="font-bold text-ok">✓</span> : <span className="text-line">—</span>}</td>)}</tr>
            ))}
          </Table>
        )}
        {tab === 'offices' && (
          <ul className="text-sm">
            <li className="font-semibold">{t('महाराष्ट्र राज्य · नगरविकास विभाग', 'Maharashtra · Urban Development Dept')}</li>
            <li className="ml-5 border-l border-line pl-4 pt-2 font-semibold">{t(DISTRICT.mr, DISTRICT.en)}</li>
            <li className="ml-10 border-l border-line pl-4 pt-2 font-semibold">{t(CITY.mr, CITY.en)}</li>
            {WARDS.map(w => <li key={w} className="ml-[3.75rem] border-l border-line pl-4 pt-1">{t('प्रभाग', 'Ward')} {w} · {WARD_NAMES[w]}</li>)}
          </ul>
        )}
        {tab === 'depts' && (
          <Table head={[t('विभाग', 'Department'), t('नोडल अधिकारी', 'Nodal officer'), t('data करार', 'Data agreement'), t('पद्धत', 'Method')]}>
            {DATA_SOURCES.map(d => <tr key={d.id}><td className="font-semibold">{d.dept[lang]}</td><td>{d.id === 'elec' ? 'किरण थोरात' : t('नियुक्ती बाकी', 'To be appointed')}</td><td>{d.id === 'tax' || d.id === 'oc' || d.id === 'elec' ? <Badge tone="ok">{t('Pilot आदेश', 'Pilot order')}</Badge> : <Badge tone="warn">{t('दुसरा टप्पा', 'Phase 2')}</Badge>}</td><td>Excel / CSV</td></tr>)}
          </Table>
        )}
        {tab === 'rules' && (
          <div className="flex flex-col gap-4">
            <Table head={[t('नियम', 'Rule'), t('वर्णन', 'Description'), t('सुरू', 'Enabled')]}>
              {(Object.keys(RULES) as RuleId[]).map(r => (
                <tr key={r}><td className="font-mono font-bold">{r}</td><td>{RULES[r][lang]}</td><td><input id={`rule-${r}`} type="checkbox" checked={rules[r]} onChange={e => setRules(s => ({ ...s, [r]: e.target.checked }))} /></td></tr>
              ))}
            </Table>
            <label className="flex flex-wrap items-center gap-3 text-sm">{t('किमान विश्वास टक्केवारी', 'Minimum confidence')}
              <input id="rule-conf" type="range" min={50} max={95} value={conf} onChange={e => setConf(+e.target.value)} /> <b className="tnum">{conf}%</b>
            </label>
            <Notice tone="info">{t('नियम बदल audit log मध्ये नोंदवले जातात आणि पुढील जुळवणीपासून लागू होतात.', 'Rule changes are logged and apply from the next matching run.')}</Notice>
          </div>
        )}
        {tab === 'types' && (
          <Table head={[t('Passport प्रकार', 'Passport type'), 'ID', t('स्थिती', 'Status')]}>
            <tr><td className="font-semibold">{t('मालमत्ता Passport', 'Property Passport')}</td><td className="font-mono text-xs">MP-MH-NMN-2026-000001</td><td><Badge tone="ok">Pilot</Badge></td></tr>
            <tr><td className="font-semibold">{t('व्यवसाय Passport', 'Business Passport')}</td><td className="font-mono text-xs">BP-MH-NMN-2026-00001</td><td><Badge tone="info">{t('पुढील टप्पा', 'Next phase')}</Badge></td></tr>
            <tr><td className="font-semibold">{t('प्रकल्प Passport', 'Project Passport')}</td><td className="font-mono text-xs">MPP-MH-PUNE-2026-000123</td><td><Badge tone="neutral">{t('डिझाइन', 'Design')}</Badge></td></tr>
          </Table>
        )}
        {tab === 'settings' && (
          <Table head={[t('सेटिंग', 'Setting'), t('मूल्य', 'Value')]}>
            <tr><td>{t('मुख्य भाषा', 'Default language')}</td><td>मराठी</td></tr>
            <tr><td>{t('जुळवणी वेळापत्रक', 'Matching schedule')}</td><td>{t('रोज पहाटे ६:००', 'Daily 06:00')}</td></tr>
            <tr><td>{t('पाहणीसाठी किमान फोटो', 'Minimum photos per visit')}</td><td>2</td></tr>
            <tr><td>{t('नोटीस भरणा मुदत', 'Notice payment period')}</td><td>{t('३० दिवस', '30 days')}</td></tr>
            <tr><td>Hosting</td><td>{t('भारतात: राज्य Data Center / MeitY-empanelled cloud', 'In India: State Data Center / MeitY-empanelled cloud')}</td></tr>
            <tr><td>{t('Data संरक्षण', 'Data protection')}</td><td>DPDP Act 2023</td></tr>
          </Table>
        )}
      </Card>
    </>
  )
}
