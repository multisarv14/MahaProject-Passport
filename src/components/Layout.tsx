import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3, Bell, Building2, ClipboardList, Database, FileSearch, Gavel, GitMerge, Landmark, LayoutDashboard,
  LogOut, Map, Menu, BadgeCheck, ListTodo, LandPlot, Network, ScrollText, Settings, ShieldCheck, Smartphone, Store, Users, Wallet, FileText,
} from 'lucide-react'
import { useStore } from '../store/store'
import { CITY } from '../data/mock'
import { useApi } from '../api/useApi'
import { api, DATA_CHANGED } from '../api/client'
import { ROLES } from '../lib/labels'
import type { RoleId } from '../data/types'
import { cx } from './ui'

type Item = { to: string; mr: string; en: string; icon: ReactNode; roles: RoleId[] | 'all' }
type Group = { mr: string; en: string; items: Item[] }

/** Order of roles in the demo role switcher: leadership, then the case workflow, then others. */
const ROLE_ORDER: RoleId[] = [
  'commissioner', 'collector', 'state_lead', 'representative',
  'ward_officer', 'inspector', 'assessment_officer', 'hearing_officer', 'recovery_clerk',
  'dept_data_officer', 'business_officer', 'auditor', 'platform_admin', 'citizen',
]

const OFFICIALS: RoleId[] = ['commissioner', 'assessment_officer', 'ward_officer', 'hearing_officer', 'recovery_clerk', 'auditor']

export const NAV: Group[] = [
  {
    mr: 'मुख्य', en: 'Main', items: [
      // Roles whose home is another page (field app, district view, …) reach it from their own menu item instead.
      { to: '/', mr: 'Dashboard', en: 'Dashboard', icon: <LayoutDashboard size={17} />, roles: ['commissioner', 'assessment_officer', 'ward_officer'] },
      { to: '/registry', mr: 'Passport शोध', en: 'Passport Registry', icon: <FileSearch size={17} />, roles: OFFICIALS },
    ],
  },
  {
    mr: 'मालमत्ता Passport', en: 'Property Passport', items: [
      { to: '/sources', mr: 'विभागांचा data', en: 'Data Sources', icon: <Database size={17} />, roles: ['dept_data_officer', 'commissioner', 'assessment_officer'] },
      { to: '/matching', mr: 'जुळवणी', en: 'Matching', icon: <GitMerge size={17} />, roles: ['commissioner', 'assessment_officer'] },
      { to: '/cases', mr: 'संशयित प्रकरणे', en: 'Cases', icon: <ClipboardList size={17} />, roles: OFFICIALS },
      { to: '/field', mr: 'प्रत्यक्ष पाहणी (Mobile)', en: 'Field App (Mobile)', icon: <Smartphone size={17} />, roles: ['ward_officer'] },
      { to: '/objections', mr: 'हरकती', en: 'Objections', icon: <Gavel size={17} />, roles: ['assessment_officer', 'commissioner'] },
      { to: '/recovery', mr: 'वसुली', en: 'Recovery', icon: <Wallet size={17} />, roles: ['assessment_officer', 'commissioner'] },
      { to: '/resolved', mr: 'निकाली प्रकरणे व महसूल', en: 'Resolved & Revenue', icon: <BadgeCheck size={17} />, roles: ['commissioner', 'assessment_officer', 'recovery_clerk', 'ward_officer', 'auditor'] },
    ],
  },
  {
    mr: 'नेतृत्व', en: 'Leadership', items: [
      { to: '/district', mr: 'जिल्हा Dashboard', en: 'District Dashboard', icon: <Map size={17} />, roles: ['collector', 'state_lead', 'commissioner'] },
      { to: '/state', mr: 'राज्य Dashboard', en: 'State Dashboard', icon: <Landmark size={17} />, roles: ['state_lead'] },
      { to: '/area', mr: 'क्षेत्र सारांश', en: 'Area Summary', icon: <BarChart3 size={17} />, roles: ['representative'] },
    ],
  },
  {
    mr: 'इतर Passport', en: 'Other Passports', items: [
      { to: '/business', mr: 'व्यवसाय Passport', en: 'Business Passport', icon: <Store size={17} />, roles: ['business_officer', 'commissioner', 'collector'] },
      { to: '/project', mr: 'प्रकल्प Passport', en: 'Project Passport', icon: <Building2 size={17} />, roles: ['commissioner', 'collector', 'state_lead'] },
      { to: '/cidco', mr: 'CIDCO भूखंड Passport', en: 'CIDCO Plot Passport', icon: <LandPlot size={17} />, roles: ['commissioner', 'collector', 'state_lead'] },
      { to: '/models', mr: 'MCGM व CIDCO मध्ये वापर', en: 'Use at MCGM & CIDCO', icon: <Network size={17} />, roles: ['commissioner', 'collector', 'state_lead'] },
    ],
  },
  {
    mr: 'इतर', en: 'More', items: [
      { to: '/reports', mr: 'अहवाल', en: 'Reports', icon: <FileText size={17} />, roles: ['commissioner', 'assessment_officer', 'collector', 'state_lead', 'recovery_clerk', 'auditor'] },
      { to: '/notifications', mr: 'सूचना (SMS / WhatsApp)', en: 'Notifications', icon: <Bell size={17} />, roles: ['commissioner', 'assessment_officer'] },
      { to: '/audit', mr: 'Audit Log', en: 'Audit Log', icon: <ScrollText size={17} />, roles: ['auditor', 'commissioner'] },
    ],
  },
  {
    mr: 'प्रशासन', en: 'Administration', items: [
      { to: '/admin?tab=users', mr: 'Users', en: 'Users', icon: <Users size={17} />, roles: ['platform_admin'] },
      { to: '/admin?tab=roles', mr: 'भूमिका व अधिकार', en: 'Roles & access', icon: <ShieldCheck size={17} />, roles: ['platform_admin'] },
      { to: '/admin?tab=offices', mr: 'कार्यालये', en: 'Offices', icon: <Landmark size={17} />, roles: ['platform_admin'] },
      { to: '/admin?tab=integrations', mr: 'API keys (विभाग जोडणी)', en: 'API keys', icon: <GitMerge size={17} />, roles: ['platform_admin'] },
      { to: '/admin?tab=system', mr: 'प्रणाली स्थिती', en: 'System health', icon: <Database size={17} />, roles: ['platform_admin'] },
      { to: '/admin?tab=audit', mr: 'प्रशासन नोंदी', en: 'Admin log', icon: <ScrollText size={17} />, roles: ['platform_admin'] },
      { to: '/admin?tab=settings', mr: 'सेटिंग', en: 'Settings', icon: <Settings size={17} />, roles: ['platform_admin'] },
    ],
  },
]

/** "My work" entries: what is waiting for this role, with a count from /my-work. */
const WORK: Record<string, { mr: string; en: string; to: string }> = {
  assign: { mr: 'सोपवायची प्रकरणे', en: 'Cases to assign', to: '/cases?status=suspected' },
  set_ward: { mr: 'प्रभाग निश्चित करायचे', en: 'Ward to be set', to: '/cases?status=suspected&ward=0' },
  visits: { mr: 'माझ्या पाहण्या', en: 'My site visits', to: '/field' },
  approve: { mr: 'मंजुरीसाठी प्रकरणे', en: 'Awaiting my approval', to: '/cases?status=verified' },
  hearing: { mr: 'सुनावणी बाकी', en: 'Hearings pending', to: '/objections' },
  payment: { mr: 'भरणा बाकी नोटिसा', en: 'Notices awaiting payment', to: '/recovery' },
  review: { mr: 'जुळवणी पडताळणी', en: 'Match reviews', to: '/matching' },
  match_pending: { mr: 'जुळवणी बाकी नोंदी', en: 'Records to match', to: '/matching' },
  unfinished_uploads: { mr: 'अपूर्ण upload', en: 'Unfinished uploads', to: '/sources' },
}

function MyWork({ onNavigate }: { onNavigate: () => void }) {
  const { t } = useStore()
  const loc = useLocation()
  const [items, setItems] = useState<{ key: string; count: number }[]>([])
  const [tick, setTick] = useState(0)
  // Refresh on navigation and after any change (approve, assign, payment…), so counts drop as work gets done.
  useEffect(() => {
    const bump = () => setTick(x => x + 1)
    window.addEventListener(DATA_CHANGED, bump)
    return () => window.removeEventListener(DATA_CHANGED, bump)
  }, [])
  useEffect(() => { api<{ key: string; count: number }[]>('/my-work').then(setItems).catch(() => {}) }, [loc.pathname, loc.search, tick])
  if (!items.length) return null
  const here = loc.pathname + loc.search
  return (
    <div>
      <div className="flex items-center gap-1.5 px-3 pb-1 text-[11px] font-semibold tracking-wide text-file uppercase"><ListTodo size={13} />{t('माझे काम', 'My work')}</div>
      {items.map(i => {
        const w = WORK[i.key]
        if (!w) return null
        return (
          <Link key={i.key} to={w.to} onClick={onNavigate}
            className={cx('flex items-center gap-2.5 rounded px-3 py-2 text-[14px]', here === w.to ? 'bg-white/12 font-semibold text-white' : 'text-white/80 hover:bg-white/5 hover:text-white')}>
            <span className="flex-1">{t(w.mr, w.en)}</span>
            <span className={cx('tnum min-w-[1.75rem] rounded-full px-1.5 py-0.5 text-center text-xs font-bold', i.count ? 'bg-file text-ink' : 'bg-white/10 text-white/50')}>{i.count}</span>
          </Link>
        )
      })}
    </div>
  )
}

export function Layout() {
  const { persona, lang, setLang, t, demoLogin, logout } = useStore()
  const { data: demoUsers } = useApi<{ id: string; name: string; role: RoleId }[]>('/demo/users')
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const here = loc.pathname + loc.search
  if (!persona) return null
  const groups = NAV.map(g => ({ ...g, items: g.items.filter(i => i.roles === 'all' || i.roles.includes(persona.role)) })).filter(g => g.items.length)

  return (
    <div className="flex min-h-full">
      <aside className={cx('fixed inset-y-0 left-0 z-40 w-64 shrink-0 overflow-y-auto bg-ink text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-file" size={22} />
            <div>
              <div className="font-display text-lg leading-tight">महा पासपोर्ट</div>
              <div className="text-[11px] text-white/60">{t(CITY.mr, CITY.en)}</div>
            </div>
          </div>
        </div>
        <nav className="flex flex-col gap-4 px-2 py-4">
          <MyWork onNavigate={() => setOpen(false)} />
          {groups.map(g => (
            <div key={g.en}>
              <div className="px-3 pb-1 text-[11px] font-semibold tracking-wide text-white/45 uppercase">{t(g.mr, g.en)}</div>
              {g.items.map(i => i.to.includes('?') ? (
                <Link key={i.to} to={i.to} onClick={() => setOpen(false)}
                  className={cx('flex items-center gap-2.5 rounded px-3 py-2 text-[14px]', here === i.to || (here === '/admin' && i.to === '/admin?tab=users') ? 'bg-white/12 font-semibold text-white' : 'text-white/75 hover:bg-white/5 hover:text-white')}>
                  {i.icon}{t(i.mr, i.en)}
                </Link>
              ) : (
                <NavLink key={i.to} to={i.to} end={i.to === '/'} onClick={() => setOpen(false)}
                  className={({ isActive }) => cx('flex items-center gap-2.5 rounded px-3 py-2 text-[14px]', isActive ? 'bg-white/12 font-semibold text-white' : 'text-white/75 hover:bg-white/5 hover:text-white')}>
                  {i.icon}{t(i.mr, i.en)}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="mx-4 mb-4 rounded border border-white/15 p-3 text-[11px] leading-snug text-white/60">
          {t('हे Demo आहे. शहर, व्यक्ती आणि सर्व नोंदी काल्पनिक आहेत.', 'This is a demo. The city, people and all records are fictional.')}
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-ink/40 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-line bg-white px-4 py-2">
          <button className="rounded p-1.5 hover:bg-paper lg:hidden" onClick={() => setOpen(true)} aria-label="Menu"><Menu size={20} /></button>
          {demoUsers && <span className="rounded bg-file-soft px-2 py-0.5 text-xs font-bold text-file">DEMO</span>}
          <div className="flex-1" />
          {demoUsers ? (
            <label className="flex items-center gap-2 text-sm" title={t('Demo: भूमिका बदला', 'Demo: switch role')}>
              <Users size={16} className="text-muted" />
              <select aria-label="Role" className="max-w-[16rem] rounded border border-line bg-white px-2 py-1 text-sm"
                value={persona.id} onChange={async e => { const id = e.target.value; await demoLogin(id); nav(id === 'u_cit' ? '/citizen' : '/') }}>
                {[...demoUsers].sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)).map(p => <option key={p.id} value={p.id}>{ROLES[p.role][lang]} · {p.name}</option>)}
              </select>
            </label>
          ) : (
            <span className="text-sm"><b>{persona.name}</b> · {ROLES[persona.role][lang]}</span>
          )}
          <div className="flex overflow-hidden rounded border border-line text-sm">
            {(['mr', 'en'] as const).map(l => (
              <button key={l} onClick={() => setLang(l)} className={cx('px-2 py-1', lang === l ? 'bg-ink text-white' : 'bg-white')}>{l === 'mr' ? 'मराठी' : 'EN'}</button>
            ))}
          </div>
          <button title={t('बाहेर पडा', 'Log out')} className="rounded p-1.5 text-muted hover:bg-paper" onClick={() => { logout(); nav('/login') }}><LogOut size={17} /></button>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl"><Outlet /></div>
        </main>
      </div>
    </div>
  )
}
