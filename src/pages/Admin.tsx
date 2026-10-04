import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { useStore } from '../store/store'
import { DATA_SOURCES, WARDS } from '../data/mock'
import { RULES, ROLES } from '../lib/labels'
import { dmy } from '../lib/format'
import { api } from '../api/client'
import { useApi } from '../api/useApi'
import type { RoleId, RuleId } from '../data/types'
import { Badge, Button, Card, Field, LoadError, Loading, Modal, Notice, PageHeader, Table, Tabs, inputCls } from '../components/ui'

type Tab = 'users' | 'roles' | 'offices' | 'system' | 'audit' | 'settings'
type Source = 'tax' | 'oc' | 'elec' | 'igr' | 'water'

interface AdminUser {
  id: string; name: string; mobile: string; role: RoleId; office_id: string | null; office_name: string
  wards: number[] | null; data_source: Source | null; active: boolean; created_at: string; last_login: string | null
}
interface Office { id: string; name: string; kind: string; parent_id: string | null; users: number }
interface System {
  version: string; node: string; uptimeSeconds: number; demoMode: boolean; environment: string
  database: { ok: boolean; responseMs: number; size: string; engine: string }
  migrations: { applied: number; pending: string[] }
  users: { total: number; active: number }
  activity: { last_matching: string | null; last_upload: string | null; logins_24h: number }
}
interface AuditRow { at: string; action: string; entity: string; role: RoleId | null; who: string | null; detail: Record<string, unknown> | null }

const STAFF_ROLES: RoleId[] = ['commissioner', 'assessment_officer', 'ward_officer', 'inspector', 'hearing_officer', 'recovery_clerk', 'dept_data_officer', 'auditor', 'collector', 'state_lead', 'representative', 'business_officer', 'platform_admin']

/** What each role can do. Mirrors the API's checks; shown so officers can review access. */
const PERMS: { mr: string; en: string; roles: RoleId[] }[] = [
  { mr: 'वैयक्तिक मालमत्ता व प्रकरणे पाहणे', en: 'View individual properties and cases', roles: ['commissioner', 'assessment_officer', 'ward_officer', 'inspector', 'hearing_officer', 'recovery_clerk', 'auditor'] },
  { mr: 'एकत्रित आकडे (dashboard)', en: 'Aggregate figures (dashboards)', roles: ['commissioner', 'assessment_officer', 'ward_officer', 'inspector', 'hearing_officer', 'recovery_clerk', 'auditor', 'collector', 'state_lead', 'representative'] },
  { mr: 'विभागाचा data upload', en: 'Upload department data', roles: ['commissioner', 'assessment_officer', 'dept_data_officer'] },
  { mr: 'जुळवणी चालवणे व पडताळणी', en: 'Run and review matching', roles: ['commissioner', 'assessment_officer'] },
  { mr: 'प्रकरण सोपवणे', en: 'Assign cases', roles: ['commissioner', 'assessment_officer', 'ward_officer'] },
  { mr: 'प्रत्यक्ष पाहणी', en: 'Site visit', roles: ['inspector'] },
  { mr: 'आकारणी मंजुरी / नोटीस', en: 'Approve assessment / notice', roles: ['commissioner', 'assessment_officer'] },
  { mr: 'हरकतीवर निर्णय', en: 'Decide objections', roles: ['hearing_officer'] },
  { mr: 'वसुली नोंद', en: 'Record payments', roles: ['recovery_clerk', 'assessment_officer'] },
  { mr: 'Audit log (प्रकरणे)', en: 'Audit log (cases)', roles: ['auditor', 'commissioner'] },
  { mr: 'Users व प्रणाली प्रशासन', en: 'Users and system administration', roles: ['platform_admin'] },
]
const MATRIX: RoleId[] = ['commissioner', 'assessment_officer', 'ward_officer', 'inspector', 'hearing_officer', 'recovery_clerk', 'dept_data_officer', 'auditor', 'collector', 'representative', 'platform_admin']

const KIND: Record<string, { mr: string; en: string }> = {
  state: { mr: 'राज्य', en: 'State' }, district: { mr: 'जिल्हा', en: 'District' }, city: { mr: 'शहर', en: 'City' },
  ward: { mr: 'प्रभाग', en: 'Ward' }, department: { mr: 'विभाग', en: 'Department' }, vendor: { mr: 'सेवा पुरवठादार', en: 'Vendor' },
}

const maskMobile = (m: string) => '******' + m.slice(-4)

export default function Admin() {
  const { t } = useStore()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'users'
  const setTab = (x: Tab) => setParams({ tab: x })
  return (
    <>
      <PageHeader title={t('प्रशासन', 'Administration')} sub={t('Users, भूमिका, कार्यालये आणि प्रणालीची स्थिती. येथे मालमत्ता, प्रकरणे किंवा नागरिकांची माहिती दिसत नाही.', 'Users, roles, offices and system health. No property, case or citizen data is shown here.')} />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'users', label: 'Users' }, { id: 'roles', label: t('भूमिका व अधिकार', 'Roles & access') },
        { id: 'offices', label: t('कार्यालये', 'Offices') }, { id: 'system', label: t('प्रणाली स्थिती', 'System health') },
        { id: 'audit', label: t('प्रशासन नोंदी', 'Admin log') }, { id: 'settings', label: t('सेटिंग', 'Settings') },
      ]} />
      {tab === 'users' && <Users />}
      {tab === 'roles' && <Roles />}
      {tab === 'offices' && <Offices />}
      {tab === 'system' && <SystemHealth />}
      {tab === 'audit' && <AdminAudit />}
      {tab === 'settings' && <Settings />}
    </>
  )
}

function Users() {
  const { t, lang, persona } = useStore()
  const { data, error, reload } = useApi<AdminUser[]>('/admin/users')
  const offices = useApi<Office[]>('/admin/offices')
  const [edit, setEdit] = useState<AdminUser | 'new' | null>(null)
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState('')
  if (error) return <LoadError message={error} onRetry={reload} />
  if (!data) return <Loading />
  const rows = data.filter(u => !q || [u.name, u.office_name, ROLES[u.role][lang], u.mobile].some(v => v.toLowerCase().includes(q.toLowerCase())))

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input id="user-q" className={inputCls + ' min-w-0 flex-1'} placeholder={t('नाव, भूमिका, कार्यालय किंवा मोबाईलने शोधा', 'Search name, role, office or mobile')} value={q} onChange={e => setQ(e.target.value)} />
        <Button onClick={() => setEdit('new')}><UserPlus size={16} />{t('नवीन user', 'New user')}</Button>
      </div>
      {msg && <div className="mb-3"><Notice tone="ok">{msg}</Notice></div>}
      <Table head={[t('नाव', 'Name'), t('भूमिका', 'Role'), t('कार्यालय', 'Office'), t('प्रभाग / विभाग', 'Wards / department'), t('मोबाईल', 'Mobile'), t('शेवटचा प्रवेश', 'Last sign-in'), t('स्थिती', 'Status'), '']} empty={!rows.length}>
        {rows.map(u => (
          <tr key={u.id} className={u.active ? '' : 'opacity-60'}>
            <td className="font-semibold">{u.name}{u.id === persona?.id && <span className="ml-1 text-xs text-muted">({t('आपण', 'you')})</span>}</td>
            <td>{ROLES[u.role][lang]}</td>
            <td>{u.office_name}</td>
            <td>{u.role === 'dept_data_officer' ? DATA_SOURCES.find(d => d.id === u.data_source)?.dept[lang] : u.wards ? u.wards.join(', ') : t('सर्व', 'All')}</td>
            <td className="font-mono text-xs">{maskMobile(u.mobile)}</td>
            <td className="whitespace-nowrap">{dmy(u.last_login)}</td>
            <td>{u.active ? <Badge tone="ok">{t('सक्रिय', 'Active')}</Badge> : <Badge tone="neutral">{t('बंद', 'Disabled')}</Badge>}</td>
            <td><Button size="sm" variant="secondary" onClick={() => setEdit(u)}>{t('बदला', 'Edit')}</Button></td>
          </tr>
        ))}
      </Table>
      <p className="mt-3 text-xs text-muted">{t('नागरिकांची खाती येथे दिसत नाहीत; ती मालमत्तेशी जोडलेली असतात. मोबाईल क्रमांक अंशतः लपवले आहेत.', 'Citizen accounts are not listed here; they are tied to properties. Mobile numbers are partly hidden.')}</p>
      {edit && <UserForm user={edit === 'new' ? null : edit} offices={offices.data ?? []} selfId={persona?.id} onClose={() => setEdit(null)} onSaved={m => { setEdit(null); setMsg(m); reload() }} />}
    </Card>
  )
}

function UserForm({ user, offices, selfId, onClose, onSaved }: { user: AdminUser | null; offices: Office[]; selfId?: string; onClose: () => void; onSaved: (msg: string) => void }) {
  const { t, lang } = useStore()
  const [name, setName] = useState(user?.name ?? '')
  const [mobile, setMobile] = useState(user?.mobile ?? '')
  const [role, setRole] = useState<RoleId>(user?.role ?? 'inspector')
  const [officeId, setOfficeId] = useState(user?.office_id ?? 'city-nmn')
  const [officeName, setOfficeName] = useState(user?.office_name ?? '')
  const [wards, setWards] = useState<number[]>(user?.wards ?? [])
  const [source, setSource] = useState<Source | ''>(user?.data_source ?? '')
  const [active, setActive] = useState(user?.active ?? true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const self = user?.id === selfId
  const usesWards = ['ward_officer', 'inspector'].includes(role)

  const save = async () => {
    setBusy(true); setErr('')
    const body = { name, mobile, role, officeId, officeName, wards: usesWards ? wards : null, dataSource: role === 'dept_data_officer' ? source || null : null, ...(user ? { active } : {}) }
    try {
      if (user) await api(`/admin/users/${user.id}`, { method: 'PATCH', body })
      else await api('/admin/users', { method: 'POST', body })
      onSaved(user ? t(`${name} यांची माहिती जतन झाली.`, `Saved ${name}.`) : t(`${name} यांचे खाते तयार झाले. ते आता ${mobile} वर OTP ने प्रवेश करू शकतात.`, `Created ${name}. They can now sign in with an OTP on ${mobile}.`))
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} title={user ? t('user बदला', 'Edit user') : t('नवीन user', 'New user')} wide>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); save() }}>
        {err && <div className="sm:col-span-2"><Notice tone="bad">{err}</Notice></div>}
        <Field label={t('पूर्ण नाव', 'Full name')}><input id="u-name" className={inputCls} value={name} onChange={e => setName(e.target.value)} required /></Field>
        <Field label={t('मोबाईल क्रमांक (OTP साठी)', 'Mobile number (for OTP)')}><input id="u-mobile" inputMode="numeric" maxLength={10} className={inputCls} value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, ''))} required /></Field>
        <Field label={t('भूमिका', 'Role')}>
          <select id="u-role" className={inputCls} value={role} disabled={self} onChange={e => setRole(e.target.value as RoleId)}>
            {STAFF_ROLES.map(r => <option key={r} value={r}>{ROLES[r][lang]}</option>)}
          </select>
        </Field>
        <Field label={t('कार्यालय', 'Office')}>
          <select id="u-office" className={inputCls} value={officeId ?? ''} onChange={e => setOfficeId(e.target.value)}>
            {offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </Field>
        <Field label={t('पद / कार्यालयाचे वर्णन', 'Designation / office label')}><input id="u-office-name" className={inputCls} value={officeName} onChange={e => setOfficeName(e.target.value)} placeholder={t('उदा. प्रभाग कार्यालय (प्रभाग ५–६)', 'e.g. Ward office (wards 5–6)')} required /></Field>
        {role === 'dept_data_officer' && (
          <Field label={t('कोणत्या विभागाचा data', 'Department data')}>
            <select id="u-source" className={inputCls} value={source} onChange={e => setSource(e.target.value as Source)} required>
              <option value="">—</option>
              {DATA_SOURCES.map(d => <option key={d.id} value={d.id}>{d.dept[lang]}</option>)}
            </select>
          </Field>
        )}
        {usesWards && (
          <fieldset className="sm:col-span-2">
            <legend className="mb-1 text-sm font-semibold text-muted">{t('प्रभाग (काहीही न निवडल्यास सर्व प्रभाग)', 'Wards (none selected = all wards)')}</legend>
            <div className="flex flex-wrap gap-3">
              {WARDS.map(w => <label key={w} className="flex items-center gap-1 text-sm"><input type="checkbox" checked={wards.includes(w)} onChange={e => setWards(ws => e.target.checked ? [...ws, w].sort() : ws.filter(x => x !== w))} />{w}</label>)}
            </div>
          </fieldset>
        )}
        {user && (
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input id="u-active" type="checkbox" checked={active} disabled={self} onChange={e => setActive(e.target.checked)} />
            {t('खाते सक्रिय (बंद केल्यास चालू सत्रही लगेच बंद होते)', 'Account active (disabling also ends current sessions immediately)')}
          </label>
        )}
        {self && <p className="text-xs text-muted sm:col-span-2">{t('स्वतःची भूमिका बदलता किंवा स्वतःचे खाते बंद करता येत नाही.', 'You cannot change your own role or disable your own account.')}</p>}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('रद्द करा', 'Cancel')}</Button>
          <Button type="submit" disabled={busy}>{user ? t('जतन करा', 'Save') : t('खाते तयार करा', 'Create account')}</Button>
        </div>
      </form>
    </Modal>
  )
}

function Roles() {
  const { t, lang } = useStore()
  return (
    <Card>
      <Table head={[t('अधिकार', 'Permission'), ...MATRIX.map(r => ROLES[r][lang])]}>
        {PERMS.map(p => (
          <tr key={p.en}><td className="font-semibold whitespace-nowrap">{t(p.mr, p.en)}</td>{MATRIX.map(r => <td key={r} className="text-center">{p.roles.includes(r) ? <span className="font-bold text-ok">✓</span> : <span className="text-line">—</span>}</td>)}</tr>
        ))}
      </Table>
      <div className="mt-3"><Notice tone="info">{t('Platform Admin (MultiSarv) फक्त users व प्रणाली सांभाळतो. त्याला मालमत्ता, प्रकरणे, नागरिकांची माहिती किंवा कोणताही शासकीय निर्णय घेण्याचा अधिकार नाही; हे API पातळीवरच बंद आहे.', 'Platform Admin (MultiSarv) manages users and the system only. It cannot see properties, cases or citizen data, or take any government decision; this is enforced in the API.')}</Notice></div>
    </Card>
  )
}

function Offices() {
  const { t, lang } = useStore()
  const { data, error, reload } = useApi<Office[]>('/admin/offices')
  if (error) return <LoadError message={error} onRetry={reload} />
  if (!data) return <Loading />
  const children = (pid: string | null) => data.filter(o => o.parent_id === pid)
  const Node = ({ o, depth }: { o: Office; depth: number }) => (
    <>
      <li className="flex items-center gap-2 border-b border-line/60 py-1.5 text-sm" style={{ paddingLeft: depth * 20 }}>
        <Badge tone="neutral">{KIND[o.kind]?.[lang] ?? o.kind}</Badge><span className="font-semibold">{o.name}</span>
        <span className="text-xs text-muted">{o.users} {t('users', 'users')}</span>
      </li>
      {children(o.id).map(c => <Node key={c.id} o={c} depth={depth + 1} />)}
    </>
  )
  return <Card><ul>{children(null).map(o => <Node key={o.id} o={o} depth={0} />)}</ul></Card>
}

function SystemHealth() {
  const { t } = useStore()
  const { data, error, reload } = useApi<System>('/admin/system')
  if (error) return <LoadError message={error} onRetry={reload} />
  if (!data) return <Loading />
  const up = `${Math.floor(data.uptimeSeconds / 3600)} ${t('तास', 'h')} ${Math.floor((data.uptimeSeconds % 3600) / 60)} ${t('मि.', 'min')}`
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title={t('प्रणाली', 'System')} action={<Button size="sm" variant="secondary" onClick={reload}>{t('पुन्हा तपासा', 'Refresh')}</Button>}>
        <Table head={[t('घटक', 'Item'), t('स्थिती', 'Status')]}>
          <tr><td>Database</td><td>{data.database.ok ? <Badge tone="ok">OK · {data.database.responseMs} ms</Badge> : <Badge tone="bad">Down</Badge>}</td></tr>
          <tr><td>Database {t('आकार', 'size')}</td><td>{data.database.size}</td></tr>
          <tr><td>{t('Database आवृत्ती', 'Database engine')}</td><td className="text-xs">{data.database.engine}</td></tr>
          <tr><td>Migrations</td><td>{data.migrations.pending.length ? <Badge tone="warn">{t('बाकी', 'Pending')}: {data.migrations.pending.join(', ')}</Badge> : <Badge tone="ok">{data.migrations.applied} {t('लागू', 'applied')}</Badge>}</td></tr>
          <tr><td>{t('App आवृत्ती', 'App version')}</td><td>{data.version} · Node {data.node}</td></tr>
          <tr><td>{t('चालू वेळ', 'Uptime')}</td><td>{up}</td></tr>
          <tr><td>{t('वातावरण', 'Environment')}</td><td>{data.environment} {data.demoMode && <Badge tone="file">DEMO MODE</Badge>}</td></tr>
        </Table>
      </Card>
      <Card title={t('वापर', 'Usage')}>
        <Table head={[t('घटक', 'Item'), t('मूल्य', 'Value')]}>
          <tr><td>{t('सक्रिय users', 'Active users')}</td><td>{data.users.active} / {data.users.total}</td></tr>
          <tr><td>{t('मागील २४ तासांत प्रवेश', 'Sign-ins in last 24 h')}</td><td>{data.activity.logins_24h}</td></tr>
          <tr><td>{t('शेवटची जुळवणी', 'Last matching run')}</td><td>{dmy(data.activity.last_matching)}</td></tr>
          <tr><td>{t('शेवटचा data upload', 'Last data upload')}</td><td>{dmy(data.activity.last_upload)}</td></tr>
        </Table>
        {data.demoMode && <div className="mt-3"><Notice tone="warn">{t('Demo mode चालू आहे. खरा data टाकण्यापूर्वी तो बंद करा.', 'Demo mode is on. Turn it off before loading real data.')}</Notice></div>}
      </Card>
    </div>
  )
}

function AdminAudit() {
  const { t, lang } = useStore()
  const { data, error, reload } = useApi<AuditRow[]>('/admin/audit')
  if (error) return <LoadError message={error} onRetry={reload} />
  if (!data) return <Loading />
  return (
    <Card>
      <p className="mb-3 text-sm text-muted">{t('Admin ने केलेले बदल आणि सर्व users चे प्रवेश. प्रकरणांवरील कामकाज लेखापरीक्षकांना दिसते.', 'Changes made by admins and all sign-ins. Case activity is visible to auditors.')}</p>
      <Table head={[t('वेळ', 'Time'), t('व्यक्ती', 'User'), t('भूमिका', 'Role'), t('कृती', 'Action'), t('तपशील', 'Details')]} empty={!data.length}>
        {data.map((a, i) => (
          <tr key={i}>
            <td className="tnum whitespace-nowrap">{dmy(a.at)}</td>
            <td>{a.who ?? '—'}</td>
            <td>{a.role ? ROLES[a.role][lang] : '—'}</td>
            <td>{a.action}</td>
            <td className="max-w-md text-xs text-muted">{a.detail ? Object.entries(a.detail).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ') : ''}</td>
          </tr>
        ))}
      </Table>
    </Card>
  )
}

function Settings() {
  const { t, lang } = useStore()
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title={t('सेटिंग', 'Settings')}>
        <Table head={[t('सेटिंग', 'Setting'), t('मूल्य', 'Value')]}>
          <tr><td>{t('मुख्य भाषा', 'Default language')}</td><td>मराठी</td></tr>
          <tr><td>{t('पाहणीसाठी किमान फोटो', 'Minimum photos per visit')}</td><td>2</td></tr>
          <tr><td>{t('नोटीस भरणा मुदत', 'Notice payment period')}</td><td>{t('३० दिवस', '30 days')}</td></tr>
          <tr><td>{t('Login सत्र मुदत', 'Session length')}</td><td>{t('८ तास', '8 hours')}</td></tr>
          <tr><td>OTP</td><td>{t('५ मिनिटे वैध, ५ प्रयत्न', 'Valid 5 minutes, 5 attempts')}</td></tr>
          <tr><td>Backup</td><td>{t('रोज रात्री २:३०, १४ दिवस जतन', 'Daily 02:30, kept 14 days')}</td></tr>
          <tr><td>{t('Data संरक्षण', 'Data protection')}</td><td>DPDP Act 2023</td></tr>
        </Table>
      </Card>
      <Card title={t('जुळवणीचे नियम', 'Matching rules')}>
        <Table head={[t('नियम', 'Rule'), t('वर्णन', 'Description')]}>
          {(Object.keys(RULES) as RuleId[]).map(r => <tr key={r}><td className="font-mono font-bold">{r}</td><td>{RULES[r][lang]}</td></tr>)}
        </Table>
        <p className="mt-3 text-xs text-muted">{t('आपोआप जोडणी ≥ ८०%, अधिकारी पडताळणी ५५–८०%. नियम किंवा दर बदल शासनाच्या लेखी मंजुरीनंतरच नवीन आवृत्तीत केले जातात; Admin त्यात थेट बदल करू शकत नाही.', 'Auto-link ≥ 80%, officer review 55–80%. Rule or rate changes ship in a new version only after written government approval; the admin cannot change them directly.')}</p>
      </Card>
    </div>
  )
}
